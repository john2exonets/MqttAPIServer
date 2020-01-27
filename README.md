# MqttAPIServer
REST API Server that collects up MQTT packets and stores them for retrieval by a REST Client. Includes an "ignore" list for unwanted Topics.

This API Server can be used by web page Javascript to populate tables and whatnot.

Usage:

	$.getJSON('http://10.1.1.28:4299/api/dump', (data) => {
          data.forEach((v) => {
            if (v.topic.indexOf("temp/read/Out1") != -1) {
              tempC = (v.payload.temp - 32) * (5/9);
              values[0] = Math.round(v.payload.temp).toString() + "&deg;F " + Math.round(tempC).toString() + "&deg;C";
              return;
          }
        }

