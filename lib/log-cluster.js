'use strict';

/**
 * weaving everything together, start the clustered http server, hookup with websocket, chain events with log listener, buffer & cal publisher.
 * @type {*}
 */

var WebSocketServer = require('websocket').server,
    http = require('http'),
    os = require('os'),
    _ = require('underscore'),
    Cluster = require('cluster2'),
    LogListener = require('./log-listener.js').LogListener,
    LogBuffer = require('./log-buffer.js').LogBuffer,
    WinstonPublisher = require('./winston-publisher.js').WinstonPublisher,
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var LogCluster = exports.LogCluster = function(options, emitter){

    var server = http.createServer(options.app || function(request, response) {
            //try not closing the http connection.
            console.log('[log-cluster] received: ' + request.url);
            response.send('', 404);
        }),
        wss = options.websocket ? new WebSocketServer({
                httpServer: server,
                // You should not use autoAcceptConnections for production
                // applications, as it defeats all standard cross-origin protection
                // facilities built into the protocol and the browser.  You should
                // *always* verify the connection's origin and decide whether or not
                // to accept it.
                maxReceivedMessageSize: 4 * 1024 * 1024,//4mb for the max message size
                autoAcceptConnections: false
            }) 
            :{
                'on': function(){

                },
                'shutDown': function(){

                }
            },
        actualOptions = {
            'port': 3000,
            'monPort': 3001,
            'cluster': true,
            'noWorkers': os.cpus().length + 1,
            'connThreshold': 1024,//concurrent connections shouldn't exceed 1k, otherwise performance degradation would be obvious.
            'ecv': {
                control: true
            },
            'heartbeatInterval' : 60000,
            'LogListener' : LogListener,
            'LogBuffer'   : LogBuffer,
            'LogPublisher': WinstonPublisher,
            'cleanDuration' : 1000 * 60,//one min
            'machineName' : os.hostname(),
            'maxLife'     : 1000 * 3600, //[1, 2) hours
            'maxMessages' : 1024, //0.5 msg/pec, 1 hour
            'waitForPublisher': 3000//3s
        };
    //let user options overwrite defaults
    _.extend(actualOptions, options);

    assert.ok(actualOptions.LogListener);
    assert.ok(actualOptions.LogBuffer);
    assert.ok(actualOptions.LogPublisher);//must be configured by options

    console.log('listening:' + actualOptions.port);

    var logCluster = new Cluster({
        'port':       actualOptions.port,
        'monPort':    actualOptions.monPort,
        'cluster':    actualOptions.cluster,
        'noWorkers':  actualOptions.noWorkers,
        'connThreshold':     actualOptions.connThreshold,
        'ecv':        actualOptions.ecv,
        'heartbeatInterval': actualOptions.heartbeatInterval
    });

    emitter = emitter || new EventEmitter();

    logCluster.listen(function(cb){
        cb(server, options.monApp/*monApp is optional*/);
    }, function(){
        //either a constructor or an instance
        _.isFunction(actualOptions.LogListener) ? actualOptions.LogListener(wss, emitter, actualOptions) : actualOptions.LogListener;
        _.isFunction(actualOptions.LogBuffer) ? actualOptions.LogBuffer(emitter) : actualOptions.LogBuffer;
        _.isFunction(actualOptions.LogPublisher) ? actualOptions.LogPublisher(emitter, actualOptions) : actualOptions.LogPublisher;

        //a cleanup logic that is added to avoid logs never closed taking too much memory, threshold set to one day for now
        var cleanDuration = actualOptions.cleanDuration,
            cleanUpTimeout = null,
            cleanUpCycle = function(){
                emitter.emit('clean', Date.now() - cleanDuration);//this is a bugfix, we used to use till += cleanDuration, which could grow bigger gap with each cycle
                cleanUpTimeout = setTimeout(cleanUpCycle, cleanDuration);//this guarantees that the next cycle is started only after the previous is finished.
            };
        //init timeout
        cleanUpTimeout = setTimeout(cleanUpCycle, cleanDuration);
        //unregister the timer to unblock the cluster shutdown
        logCluster.once('SIGINT', _.bind(clearTimeout, null, cleanUpTimeout));
        logCluster.once('SIGTERM', _.bind(clearTimeout, null, cleanUpTimeout));
    });

    return logCluster;
};
