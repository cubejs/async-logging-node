'use strict';

/**
 * weaving everything together, start the clustered http server, hookup with websocket, chain events with log listener, buffer & cal publisher.
 * @type {*}
 */

var WebSocketServer = require('websocket').server,
    LogListener = require('./log-listener').LogListener,
    LogBuffer = require('./log-buffer').LogBuffer,
    WinstonPublisher = require('./winston-publisher').WinstonPublisher,
    EventEmitter = require('events').EventEmitter,
    listen = require('cluster2').listen,
    assert = require('assert'),
    os = require('os'),
    _ = require('underscore');

var LogCluster = exports.LogCluster = function(options, emitter){

    emitter = emitter || new EventEmitter();
    options = options || {};
    options.LogPublisher = options.LogPublisher || WinstonPublisher;
    options.LogListener = options.LogListener || LogListener;
    options.LogBuffer = options.LogBuffer || LogBuffer;

    listen({
        'createServer': require('http').createServer,
        'configureApp': function(app){

            var cleanDuration = options.cleanDuration,
                cleanUpTimeout = null,
                cleanUpCycle = function(){
                    emitter.emit('clean', Date.now() - cleanDuration);//this is a bugfix, we used to use till += cleanDuration, which could grow bigger gap with each cycle
                    cleanUpTimeout = setTimeout(cleanUpCycle, cleanDuration);//this guarantees that the next cycle is started only after the previous is finished.
                };
            //init timeout
            cleanUpTimeout = setTimeout(cleanUpCycle, cleanDuration);
            //unregister the timer to unblock the cluster shutdown
            process.once('SIGINT', _.bind(clearTimeout, null, cleanUpTimeout));
            process.once('SIGTERM', _.bind(clearTimeout, null, cleanUpTimeout));

            return app;
        },
        'app': options.app || function(req, res){
            console.log('[log-cluster] received: ' + request.url);
            response.send('', 404);
        },
        'port': options.port || 3000,
        'monApp': options.monApp,
        'monPort': options.monPort || 3001,
        'noWorkers': options.noWorkers || Math.min(4, os.cpus().length),
        'connThreshold': options.connThreshold || 1024,
        'heartbeatInterval': options.heartbeatInterval || 60000,
        'cache': {
            'enable': true,
            'mode': 'master'
        }
    })
    .then(function(resolves){

        if(!resolves.master){
            var wss = options.websocket ? new WebSocketServer({
                    'httpServer': resolves.server,
                    // You should not use autoAcceptConnections for production
                    // applications, as it defeats all standard cross-origin protection
                    // facilities built into the protocol and the browser.  You should
                    // *always* verify the connection's origin and decide whether or not
                    // to accept it.
                    'maxReceivedMessageSize': 4 * 1024 * 1024,//4mb for the max message size
                    'autoAcceptConnections': false
                })
                : {
                    'on': function(){
                    },
                    'shutDown': function(){
                    }
                };

            if(_.isFunction(options.LogListener)){
                options.LogListener(wss, emitter, options);
            }
            if(_.isFunction(options.LogBuffer)){
                options.LogBuffer(emitter, options);
            }
            if(_.isFunction(options.LogPublisher)){
                options.LogPublisher(emitter, options);
            }
        }
    });
};
