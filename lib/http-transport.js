'use strict';

var request = require('request'),
    //msgpack = require('msgpack'),
    assert = require('assert'),
    _ = require('underscore');

var HttpTransport = exports.HttpTransport = function(options){

    assert.ok(options && options.url);

    _.extend(this, {
        'connection': null,
        'adhocs': [],
        'groups': {},
        'url': options.url,
        'protocol': options.protocol || 'log-protocol',
        'reconnectInterval': options.reconnectInterval || 1000,
        'drainInterval': options.drainInterval || 1000,
        'readyThreshold': options.readyThreshold || 60000//1 min
    });

    this.connect(this.url, this.protocol);
};

HttpTransport.prototype.connect = function(url, protocol){

    var _this = this,
        connection = {
            'sendBytes': function(bytes){
                request.post({'url': url, 'form': {'logs' : bytes}});
            },
            'sendJson': function(json){
                request.post({'url': url, 'form': {'logs' : json}});
            }
        };

    connection.scheduler = connection.scheduler || setInterval(function drain(){
        
        _this.drain(connection);

    }, _this.drainInterval);
}

HttpTransport.prototype.log = function(message){

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

HttpTransport.prototype.drain = function(connection){

    try{
        //this is an enhancement which tries to mitigate the problem of possible cutoff of transactions
        //the transactional messages will only be sent after they've been baked for 1 minute, and in the same batch
        var threshold = Date.now() - this.readyThreshold, graduates = [];
        
        if(this.adhocs.length){
            connection.sendJson(this.adhocs);
            this.adhocs = [];
        }

        //split the groups to graduates and youths, graduates are the messages (transactional) older than 1 minute
        var groups = this.groups;
        _.each(groups, function(group, uuid){
            if(group[0].timestamp < threshold){
                graduates = graduates.concat(group);
                delete groups[uuid];
            }
        });

        if(graduates.length){
            connection.sendJson(graduates);
        }
    }
    catch(e){
        console.log(e);
    }
};