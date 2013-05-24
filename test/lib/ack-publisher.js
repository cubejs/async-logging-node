'use strict';

var AckPublisher = exports.AckPublisher = function(emitter){
    //a specific publisher, could be as simple as log file appender
    emitter.on("atomicEvent", function(atomicEvent){
        emitter.emit("ack", atomicEvent.level, atomicEvent.msg, atomicEvent);
    });
    
    emitter.on("heartbeat", function(heartbeat){
        emitter.emit("ack", atomicEvent.level, heartbeat.msg, heartbeat);
    });
    
    emitter.on("transaction", function(tx){
        emitter.emit("ack", atomicEvent.level, tx.msg, tx);
    });
};