FROM node:alpine

RUN mkdir /api
RUN mkdir /api/config
WORKDIR /api

ADD package.json /api/
RUN npm install

COPY apiServer.js /api

ADD config.json /api/config/
ADD VERSION .
ADD Dockerfile .
ADD build_container.sh .

EXPOSE 4299

#ENTRYPOINT [ "node", "/api/apiServer.js" ]
CMD [ "npm", "start" ]
