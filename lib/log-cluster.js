'use strict';

/**
 * weaving everything together, start the clustered http server, hookup with websocket, chain events with log listener, buffer & cal publisher.
 * @type {*}
 */

var WebSocketServer = require('websocket').server,
    http = require("http"),
    os = require("os"),
    _ = require("underscore"),
    Cluster = require("cluster2"),
    LogListener = require("./log-listener.js"),
    LogBuffer = require("./log-buffer.js"),
    WinstonPublisher = require("./winston-publisher.js"),
    assert = require("assert"),
    EventEmitter = require("events").EventEmitter;

var LogCluster = exports.LogCluster = function(options, emitter){

    var server = http.createServer(function(request, response) {
            response.writeHead(404);
            response.end();
        }),
        wss = new WebSocketServer({
            httpServer: server,
            // You should not use autoAcceptConnections for production
            // applications, as it defeats all standard cross-origin protection
            // facilities built into the protocol and the browser.  You should
            // *always* verify the connection's origin and decide whether or not
            // to accept it.
            autoAcceptConnections: false
        }),
        actualOptions = {
            port: 3000,
            monPort: 3001,
            cluster: true,
            noWorkers: os.cpus().length + 1,
            connThreshold: 1024,//concurrent connections shouldn't exceed 1k, otherwise performance degradation would be obvious.
            ecv: {
                control: true
            },
            heartbeatInterval : 60000,
            LogListener : LogListener,
            LogBuffer   : LogBuffer,
            LogPublisher: WinstonPublisher
        };
    _.extend(actualOptions, options);

    assert.ok(actualOptions.LogListener);
    assert.ok(actualOptions.LogBuffer);
    assert.ok(actualOptions.LogPublisher);//must be configured by options

    console.log("listening:" + actualOptions.port);

    var logCluster = new Cluster({
        port:       actualOptions.port,
        monPort:    actualOptions.monPort,
        cluster:    actualOptions.cluster,
        noWorkers:  actualOptions.noWorkers,
        connThreshold:     actualOptions.connThreshold,
        ecv:        actualOptions.ecv,
        heartbeatInterval: actualOptions.heartbeatInterval
    });

    emitter = emitter || new EventEmitter();

    logCluster.listen(function(cb){
        cb(server);
    }, function(){
        new actualOptions.LogListener(wss, emitter);
        new actualOptions.LogBuffer(emitter);
        new actualOptions.LogPublisher(emitter);
    });
};