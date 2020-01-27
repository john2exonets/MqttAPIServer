//
//  API server to retrieve MQTT Payloads
//
//  John D. Allen
//  August, 2017
//
//--------------------------------------------------------------------------
//
//--------------------------------------------------------------------------
var VERSION = "1.0.2";

var mqtt = require('mqtt');
var config = require('./config/config.json');
var express = require("express");
var router = express.Router();
var ip = require('ip');
var app = express();
var bodyParser = require('body-parser');

var ignListLen = config.ignoreList.length;

var DEBUG = config.debug;

var itimer = Date.now();

//  MQTT packet data store
var tpc = [];
var payl = [];

// MQTT connection options
var copts = {
  keepalive: 20000
};

//---------------------------------------------------------------------------
//  MQTT Code
//  -- Tap into the PubSub bus and collect all current topic messages,
//     except for those on the ignoreList in the config.json file.
//---------------------------------------------------------------------------
var client = mqtt.connect(config.mqtt_broker, copts);

client.on("connect", function() {
  client.subscribe('#');
});

client.on('message', function(topic, message) {
  var out = topic + ": " + message.toString();
  if (DEBUG) { console.log(out); }
  // try {
  //   var rr = JSON.parse(message.toString());
  // } catch(e) {
  //   console.log(">>>> Ignored >>>>");
  //   return;
  // }

  config.ignoreList.every( function(t, i) {
    if(topic.indexOf(t) == 0) {
      // topic found on ignore list
      if (DEBUG) { console.log(">>Ignore"); }
      return false;
    } else {
      // topic not found on ignore list
      if (i == ignListLen -1) {     // if last enum of ignoreList
        // Check for bad data
        if (message.indexOf("nan") > 0) {
          if (DEBUG) { console.log(">> BAD DATA"); }
          return false;
        }
        //  Look for existing record & update if found; else add new record.
        var ptr = tpc.indexOf(topic);
        if(ptr == -1) {
          if (DEBUG) { console.log(">>New"); }
          tpc.push(topic);
          payl.push(message);
        } else {
          if (DEBUG) { console.log("---Existing"); }
          payl[ptr] = message;
        }
        if (DEBUG) { console.log("---[" + tpc.length.toString() + "|" + payl.length.toString() + "]"); }
      }
      return true;
    }
  });
});

//---------------------------------------------------------------------------
//  API Server
//---------------------------------------------------------------------------

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Allow for cross-site requests!!
app.use(function(req,res,next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.get("/", function(req,res) {
  if (DEBUG) { console.log("++++ IN >> /"); }
  res.send("MQTT Packet RESTful API");
});

//
// The Main API call:  p
router.post("/p", function(req,res) {
  if (DEBUG) { console.log("++++ IN >> /p/" + req.body.topic); }
  var out = "";
  var ptr = tpc.indexOf(req.body.topic);
  if (ptr == -1) {
    out = "{ \"status\": 404, \"message\": \"not found\" }";
  } else {
    out = "{ \"status\": 200, \"payload\":" + payl[ptr] + " }";
  }
  res.type('application/json')
  res.send(out)
});

//
// /api/dump -- dump out the topic/payload array in JSON format
router.get("/dump", function(req,res) {
  if (DEBUG) { console.log("++++ DUMP"); }
  var out = "[ ";
  var ilen = tpc.length;
  tpc.forEach(function(v,i) {
    out += "{ \"topic\": \"" + v + "\", \"payload\": ";
    if (payl[i].toString()[0] == '{') {     // Already a JSON payload
      out += payl[i] + " },";
    } else {
      //console.log("=== " + parseInt(payl[i].toString()));
      if (isNaN(parseInt(payl[i].toString()))) {    // Its a String, qoute it.
        out += "\"" + payl[i] + "\" },";
      } else {    // its some kind of number and doesn't need qoutes.
        out += payl[i] + " },";
      }
    }
    if (i == ilen - 1) {  // on last topic...
      out = out.slice(0, -1) + " ]";
      res.type('application/json');
      res.send(out);
    }
  });
});

//
// /api/reset  --  Reset the topic and payload arrays back to null.
router.put("/reset", function(req,res) {
  if (DEBUG) { console.log("++++ RESET!!"); }
  tpc = [];
  payl = [];
  res.type('application/json')
  res.send("{ \"status\": 200, \"message\": \"Ok\" }");
});

//
// Version
router.get("/version", function(req,res) {
  res.type('application/json')
  res.send("{ \"version\": \"" + VERSION + "\" }");
});

//
// /api/list  --  List all available Topics in Array format
router.get('/list', function(req,res) {
  if (DEBUG) { console.log("++++ LIST"); }
  var out = "[ ";
  var ilen = tpc.length;
  tpc.forEach(function(v,i) {
    out += "\"" + v + "\",";
    if (i == ilen -1) { // on last topic
      out = out.slice(0, -1) + " ]";
      res.send(out);
    }
  });
});

//
// All API urls start with '/api'
app.use('/api', router);

//  404 Errors
app.use(function(req, res) {
  if (DEBUG) { console.log("+++++ 404 Error: " + req.originalUrl); }
  res.status(404).send({url: req.originalUrl + ' not found'})
});

//---------------------------------------------------------------------------
//-------------------------------[   MAIN   ]--------------------------------
//---------------------------------------------------------------------------

app.listen(config.apiPort);
console.log("MQTT API Server Started @ " + ip.address() + ":" + config.apiPort);

