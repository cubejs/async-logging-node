'use strict';

var request = require('request'),
    assert = require('assert'),
    _ = require('underscore'),
    URL = require('url'),
    WebSocketTransport = require('./ws-transport').WebSocketTransport,
    HttpTransport = require('./http-transport').HttpTransport;

var WebSocketOtherwiseHttpTransport = exports.WebSocketOtherwiseHttpTransport = function(options){

    assert.ok(options && options.url);

    _.extend(this, {
        'url': options.url,
        'protocol': options.protocol || 'log-protocol',
        'reconnectInterval': options.reconnectInterval || 1000,
        'drainInterval': options.drainInterval || 1000,
        'readyThreshold': options.readyThreshold || 60000//1 min
    });

    this.connect(this.url, this.protocol);
    this.transport = null;
    this.buffer = [];
};

WebSocketOtherwiseHttpTransport.prototype.connect = function(url, protocol){

    var _this = this,
        parsed = URL.parse(url),
        wsAttempt = URL.format({
            'protocol': parsed.protocol,
            'host': parsed.host,
            'pathname': 'ws'
        });

    request.get(wsAttempt, function(err, res, body){

        if(!err && res.statusCode == 200){

            _this.transport = new WebSocketTransport({
                'url': body,
                'protocol': protocol,
                'reconnectInterval': _this.reconnectInterval,
                'drainInterval': _this.drainInterval,
                'readyThreshold': _this.readyThreshold//1 min
            });
        }
        else{

            _this.transport = new HttpTransport({
                'url':url,
                'protocol': protocol,
                'reconnectInterval': _this.reconnectInterval,
                'drainInterval': _this.drainInterval,
                'readyThreshold': _this.readyThreshold//1 min
            });
        }

        _this.transport.reconnect = function(){//use external url & protocol!
            _this.reconnect(url, protocol);
        };
    });
};

WebSocketOtherwiseHttpTransport.prototype.reconnect = function(url, protocol){
    this.connect(url, protocol);
};

WebSocketOtherwiseHttpTransport.prototype.log = function(message){

    if(!this.transport){
        this.buffer.push(message);
    }
    else{
        while(this.buffer.length > 0){
            this.transport.log(this.buffer.shift());
        }
        this.transport.log(message);
    }
};

