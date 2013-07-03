'use strict';

var WebSocketClient = require('websocket').client,
    msgpack = require('msgpack'),
    assert = require('assert'),
    _ = require('underscore');

var LogTransport = exports.LogTransport = function(options){

    assert.ok(options && options.url);

    _.extend(this, {
        'connection': null,
        'queue': [],
        'url': options.url,
        'protocol': options.protocol || 'log-protocol',
        'reconnectInterval': options.reconnectInterval || 1000,
        'drainInterval': options.drainInterval || 1000,
        'readyThreshold': options.readyThreshold || 3000
    })

    this.connect(this.url, this.protocol);
};

LogTransport.prototype.connect = function(url, protocol){

    var _this = this,
        client = new WebSocketClient();

    client.once('connectFailed', function(error) {
        _this.connection = null;
        setTimeout(_.bind(_this.connect, _this, url, protocol), _this.reconnectInterval);//wait for 1 sec and continue reconnect
    });

    var serverReady = setTimeout(function(){
        client.emit('connectFailed', new Error('timeout'));
    }, _this.readyThreshold);

    client.once('connect', function(connection){
        
        _this.connection = connection;
        connection.once('message', function(message){//ready
            clearTimeout(serverReady);
            connection.scheduler = connection.scheduler || setInterval(_.bind(_this.drain, _this, connection), _this.drainInterval);//sending message only after server side 'ready'
        });

        connection.once('error', function(error){
            clearTimeout(serverReady);
            connection.close();
        });

        connection.once('close', function(reasonCode, description){
            if(connection.scheduler){
                clearInterval(connection.scheduler);
            }
            _this.connection = null;
            _this.connect(url, protocol);//reconnect
        });
    });

    client.connect(url, protocol);
}

LogTransport.prototype.log = function(message){
    this.queue.push(message);
};

LogTransport.prototype.drain = function(connection){
    if(!_.isEmpty(this.queue)){
        connection.sendBytes(msgpack.pack(this.queue));
        this.queue = [];
    }
};