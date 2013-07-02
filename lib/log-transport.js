'use strict';

var WebSocketClient = require("websocket").client,
    msgpack = require("msgpack"),
    _ = require("underscore");

var LogTransport = exports.LogTransport = function(options){

    var self = this;
    self.connection = null;
    self.queue = [];
    self.url = options.url;
    self.protocol = options.protocal || "log-protocol";

    self.connect(self.url, self.protocol);
};

LogTransport.prototype.connect = function(url, protocol){

    var self = this,
        client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        console.log(error);
        self.connection = null;
    });

    client.on("connect", function(connection){
        console.log('[connected]');
        self.connection = connection;
        self.drain(self.connection, self.queue);

        self.connection.on("error", function(error){
            self.connection.close();
        });

        self.connection.on('close', function(reasonCode, description){
            self.connection = null;
            self.connect(url, protocol);//reconnect
        });

        //the client will send at fixed interval an array of logs
        client.scheduler = client.scheduler || setInterval(_.bind(self.drain, self, self.connection), 100);
    });

    client.connect(url, protocol);
}

LogTransport.prototype.log = function(message){
    console.log('[buffer]');
    this.queue.push(message);
};

LogTransport.prototype.drain = function(connection){
    if(!_.isEmpty(this.queue)){
        console.log('[drain]');
        connection.sendBytes(msgpack.pack(this.queue));
        this.queue = [];
    }
};