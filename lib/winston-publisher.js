'use strict';

var winston = require('winston');

var WinstonPublisher = exports.WinstonPublisher = function(emitter){
    //a specific publisher, could be as simple as log file appender
    
    var logger = new (winston.Logger)({
        transports: [
          new winston.transports.File({ filename: './log/all.log' })
        ],
        exceptionHandlers: [
          new winston.transports.File({ filename: './log/exceptions.log' })
        ]
    });

    emitter.on('atomicEvent', function(atomicEvent){
        logger.log(atomicEvent.level, atomicEvent.msg, atomicEvent);
    });
    
    emitter.on('heartbeat', function(heartbeat){
        logger.log(atomicEvent.level, heartbeat.msg, heartbeat);
    });
    
    emitter.on('transaction', function(tx){
        logger.log(atomicEvent.level, tx.msg, tx);
    });
};