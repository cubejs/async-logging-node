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

    client.once('connectFailed', function(error) {
        console.log(error);
        self.connection = null;
        setTimeout(_.bind(self.connect, self, url, protocol), 1000);//wait for 1 sec and continue reconnect
    });

    client.once('connect', function(connection){
        
        self.connection = connection;
        connection.once('message', function(message){
            connection.scheduler = connection.scheduler || setInterval(_.bind(self.drain, self, connection), 1000);//sending message only after server side 'ready'
        });

        connection.once("error", function(error){
            connection.close();
        });

        connection.once('close', function(reasonCode, description){
            clearInterval(connection.scheduler);
            self.connection = null;
            self.connect(url, protocol);//reconnect
        });
    });

    client.connect(url, protocol);
}

LogTransport.prototype.log = function(message){
    this.queue.push(message);
};

LogTransport.prototype.drain = function(connection){
    if(!_.isEmpty(this.queue)){
        console.log('[drain]');
        connection.sendBytes(msgpack.pack(this.queue));
        this.queue = [];
    }
};