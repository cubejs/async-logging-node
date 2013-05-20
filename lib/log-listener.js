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
        return origin.contains(".ebay.com");
    },
    msgpack = require("msgpack"),
    _ = require("underscore");

var LogListener = exports.LogListener = function(wss, emitter){

    var self = this;
    self.connections = [];

    wss.on("request", function(request) {

        if (!originIsAllowed(request.origin)) {
            // Make sure we only accept requests from an allowed origin
            request.reject();
            return;
        }

        var connection = request.accept("log-protocol", request.origin);
        self.connections.push(connection);

        connection.idleMonitor = setInterval(function(){
            if(process.hrtime(connection.lastMessageReceivedAt) > 60000 * 1000000){
                connection.close();
            }
        }, 60000);

        connection.on("message", function(message) {
            var bytes = message.binaryData,
                buf = new Buffer(bytes.length);
            bytes.copy(buf, 0, 0, bytes.length);

            var unpack = msgpack.unpack(buf);

            emitter.emit("log", unpack);

            //clear previous timeout and setup a new one.
            connection.lastMessageReceivedAt = process.hrtime();
        });

        connection.on("close", function(reasonCode, description){
            clearTimeout(connection.idleMonitor);
            self.connections = _.without(self.connections, connection);
        });
    });

    wss.on("close", function(){
        _.each(this.connections, function(connection){
            clearTimeout(connection.idleMonitor);
        });
    });
};