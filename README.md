async-logging-node
==================

This module is trying to solve the discrepancy between the async model & the common synchronous logging model

* **Logging types**: heartbeat, atomic, transaction
* **Logging params**: type, level, msg, uuid, event, parent
* **Transaction**: this is the key structure we're trying to restore from async events model
* **Logging proxy**: part of this module builds a proxy service which is a websocket server accepting log payload as message pack
* **Logging client**: the other part is a client which runs in the application runtime, connecting to websocket, and transferring the log event over
* **MonApp**: optional monitoring app which can generate heartbeat logs


## API
|Function | Description |
|---|---|
|**LogCluster**|
|`require('log-cluster').LogCluster`|importing constructor|
|`new LogCluster(options, emitter)`|constructor accepts two parameters; |
|**LogBuffer**|
|`require('log-buffer').LogBuffer`|importing constructor|
|`new LogBuffer(emitter,mapper)`|constructor accepts two parameters, emitter which emits 'log' events and optional mapper which can map log properties to correct format|
|**LogListener**|
|require('log-listener').LogListener|importing constructor|
## Installation
```
npm install async-logging
```
## Usage

### Start a proxy service
```
var LogCluster = require("log-cluster.js").LogCluster,
    CalPublisher = require("cal-publisher.js").CalPublisher;
new LogCluster({LogPublisher:CalPublisher});
``` 
### Provide a Log Publisher
```
var CalPublisher = exports.CalPublisher = function(emitter, calMapper, calSender, calCallback){
    //a specific publisher, could be as simple as log file appender
}
```
### Start a client
    
    new require("log-client").LogClient({url:""}); //url must be given

## Example
Look at lib/log-server.js. You can start it by typing following commands from the root of the project
```
npm install
node lib/log-server.js
```

## LogCluster constructor options
* `port`: port on which the cluster will run(default 3000)
* `monPort`: port of the monitoring app if any(default 3001)
* `cluster`: (default true)
* `noWorders` number of worker processes to create: 
* `connThreshold`: max number of connections to accept(default 1024)
* `ecv`:
* `heartbeatInterval`:
* `LogListener`: defaults to 'log-listen.js'
* `LogBuffer`: defaults to 'log-buffer.js'
* `LogPublisher`: defautls to 'winston-publisher.js'
