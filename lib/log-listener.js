'use strict';

/**
 * log listener is an application, which listens upon a websocket channel from where raw logs of node application comes in.
 * log listener is responsible for accepting websocket, negotiate the protocol, and start handling logs message.
 * Each message would be a MessagePack serialized byte array, log listener needs to deserialize them before sending into Buffer.
 *
 * log listener is also supposed to exchange heartbeat with the listener, whenever the other end idles for too long, log listener
 * could terminate the connection.
 *
 * log listener must enable cluster2 to make it scalable enough to handle eBay applications' throughput.
 */
var originIsAllowed = function(origin){
        //this isn't correct
        return true;//origin.contains('.ebay.com');
    },
    msgpack = require('msgpack'),
    util = require('util'),
    _ = require('underscore');

var LogListener = exports.LogListener = function(wss, emitter, app, machineName){

    var _this = this;
    _this.connections = [];

    wss.on('request', function(request) {

        if (!originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            return;
        }

        var connection = request.accept('log-protocol', request.origin);
        _this.connections.push(connection);

        connection.idleMonitor = setInterval(function(){
            if(Date.now() - connection.lastMessageReceivedAt > 600000){//no activity over last 10 mins
                connection.close();
            }
        }, 60000);

        connection.on('message', function(message) {

            try{
                var bytes = message.binaryData,
                    buf = new Buffer(bytes.length);
                bytes.copy(buf, 0, 0, bytes.length);

                var unpack = msgpack.unpack(buf),
                    logs = _.isArray(unpack) ? unpack : [unpack];

                _.each(logs, function(log){
                    emitter.emit('log', log);
                });
            }
            catch(e){
                console.log(util.format('[log-websocket] message handling error:%s\n%j', e, e.stack));
            }
            finally{
                //clear previous timeout and setup a new one.
                connection.lastMessageReceivedAt = Date.now();
            }
        });

        connection.on('close', function(reasonCode, description){
            console.log('[log-websocket] closed due to:' + reasonCode + ':' + description);
            clearTimeout(connection.idleMonitor);
            _this.connections = _.without(_this.connections, connection);
        });

        setTimeout(function(){
            connection.sendUTF('ready');
            console.log('[log-websocket] ready message sent');
        }, 100);//this is just a safe measure to allow client to have time to register its ready callback
    });

    wss.on('close', function(){
        _.each(_this.connections, function(connection){
            clearTimeout(connection.idleMonitor);
        });
    });

    if(app){

        var express = require('express');

        app.use(express.bodyParser());

        app.post('/log', function(req, res){

            _.each(req.body.logs || [], function(log){

                //console.log(util.format('[listener] received messages:\n %j', log));

                //seems like a bug from body parser where duration is parsed as string instead of number;
                log.duration = log.duration && _.isString(log.duration) ? parseInt(log.duration, 10) : log.duration;
                log.timestamp = log.timestamp && _.isString(log.timestamp) ? parseInt(log.timestamp, 10) : log.timestamp;

                emitter.emit('log', log);
            });

            res.send(200, '');
        });

        app.get('/ws', function(req, res){

            console.log('[listener] accepted websocket request');

            res.send(util.format('ws://%s:8080/', machineName, 200);
        });
    }
};