'use strict';

var WebSocketClient = require('websocket').client,
    msgpack = require('msgpack'),
    assert = require('assert'),
    _ = require('underscore');

var WebSocketTransport = exports.WebSocketTransport = function(options){

    assert.ok(options && options.url);

    _.extend(this, {
        'connection': null,
        'adhocs': [],
        'groups': {},
        'url': options.url,
        'protocol': options.protocol || 'log-protocol',
        'reconnectInterval': options.reconnectInterval || 1000,
        'drainInterval': options.drainInterval || 1000,
        'readyThreshold': options.readyThreshold || 3000
    });

    this.connect(this.url, this.protocol);
};

WebSocketTransport.prototype.connect = function(url, protocol){

    var _this = this,
        client = new WebSocketClient();

    client.once('connectFailed', function(error) {
        _this.connection = null;
        setTimeout(_.bind(_this.reconnect, _this, url, protocol), _this.reconnectInterval);//wait for 1 sec and continue reconnect
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
            _this.reconnect(url, protocol);//reconnect
        });
    });

    client.connect(url, protocol);
};

WebSocketTransport.prototype.reconnect = function(url, protocol){

    this.connect(url, protocol);
};

WebSocketTransport.prototype.log = function(message){
    var uuid = message.uuid;
    if(!uuid){
        this.adhocs.push(message);
    }
    else{
        var group = this.groups[uuid] || [];
        group.push(message);
        this.groups[uuid] = group;
    }
};

WebSocketTransport.prototype.drain = function(connection){

    try{
        //this is an enhancement which tries to mitigate the problem of possible cutoff of transactions
        //the transactional messages will only be sent after they've been baked for 1 minute, and in the same batch
        var _this = this,
            threshold = Date.now() - _this.readyThreshold, 
            graduates = [];
        
        if(_this.adhocs.length){
            connection.sendBytes(msgpack.pack(_this.adhocs));
            _this.adhocs = [];
        }

        //split the groups to graduates and youths, graduates are the messages (transactional) older than 1 minute
        var groups = _this.groups;
        _.each(groups, function(group, uuid){
            if(group[0].timestamp < threshold){
                graduates = graduates.concat(group);
                delete groups[uuid];
            }
        });

        if(graduates.length){
            connection.sendBytes(msgpack.pack(graduates));
        }
    }
    catch(e){
        console.trace(e);
    }
};