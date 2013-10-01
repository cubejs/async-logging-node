'use strict';

var winston = require('winston');

var WinstonPublisher = exports.WinstonPublisher = function(emitter, options){
    //a specific publisher, could be as simple as log file appender
    
    options = options || {};

    var logger = new (winston.Logger)({
        transports: options.transports || [
              new winston.transports.File({ filename: './log/all.log' })
            ],
        exceptionHandlers: options.exceptionHandlers || [
              new winston.transports.File({ filename: './log/exceptions.log' })
            ]
    });

    emitter.on('atomicEvent', function(atomicEvent){
        logger.log(atomicEvent.level, atomicEvent.msg, atomicEvent);
    });
    
    emitter.on('heartbeat', function(heartbeat){
        logger.log(heartbeat.level, heartbeat.msg, heartbeat);
    });
    
    emitter.on('transaction', function(tx){
        logger.log(tx.level, tx.msg, tx);
    });
};