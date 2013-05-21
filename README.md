## What is async-logging

This module is trying to solve the discrepency between the async model & the common synchronous logging model

* Logging types: heartbeat, atomic, transaction
* Logging params: type, level, msg, uuid, event, parent
* Transaction: this is the key structure we're trying to restore from async events model
* Logging proxy: part of this module is trying to build a proxy service running websocket server accepting log payload as message pack
* Logging client: the other part is a client which runs in the application runtime, connecting to websocket, transfer the log event over

## Usage

### Getting async-logging

    npm install async-logging
    

### Start a proxy service

    var LogCluster = require("log-cluster.js").LogCluster,
    CalPublisher = require("cal-publisher.js").CalPublisher;

    new LogCluster({LogPublisher:CalPublisher});
    
### Provide a Log Publisher

    var CalPublisher = exports.CalPublisher = function(emitter, calMapper, calSender, calCallback){
        //a specific publisher, could be as simple as log file appender
    }

### Start a client
    
    new require("log-client").LogClient({url:""}); //url must be given
