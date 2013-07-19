'use strict';

var WebSocketClient = require('websocket').client,
    msgpack = require('msgpack'),
    assert = require('assert'),
    _ = require('underscore');

var WebSocketTransport = exports.WebSocketTransport = function(options){

    assert.ok(options && options.url);

    _.extend(this, {
        'connection': null,
        'queue': [],
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

WebSocketTransport.prototype.log = function(message){
    this.queue.push(message);
};

WebSocketTransport.prototype.drain = function(connection){

    if(!_.isEmpty(this.queue)){
        //this is an enhancement which tries to mitigate the problem of possible cutoff of transactions
        //the transactional messages will only be sent after they've been baked for 1 minute, and in the same batch
        var threshold = Date.now() - 60000, groups = {}, adhocs = [], devide = {'graduates':[], 'youths':[]};
        _.each(this.queue, function(elem){
            if(elem.uuid){
                groups[elem.uuid] = groups[elem.uuid] || [];
                groups[elem.uuid].push(elem);
            }
            else{
                adhocs.push(elem);
            }
        });

        connection.sendBytes(msgpack.pack(adhocs));

        //split the groups to graduates and youths, graduates are the messages (transactional) older than 1 minute
        _.reduce(_.values(groups), function(memoize, group){
            var team = group[0].timestamp < threshold ? 'graduates' : 'youths';
            memoize[team] = memoize[team].concat(gorup);
            return memoize;
        }, devide);

        connection.sendBytes(msgpack.pack(devide.graduates));

        this.queue = devide.youths;
    }
};