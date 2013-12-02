 var EventEmitter = require('events').EventEmitter,
     LogCluster = require('../lib/log-cluster.js').LogCluster,
     AckPublisher = require('./lib/ack-publisher.js').AckPublisher,
     LogClient = require('../lib/log-client.js').LogClient,
     when = require('when'),
     timeout = require('when/timeout'),
     should = require('should');

 describe('log-cluster', function(){

     describe('log', function(){

         var emitter = new EventEmitter(),
        	 cluster = new LogCluster({
                    'monApp': new (require('express'))(),
	        	 	'port':7770, 
	        	 	'noWorkers':2, 
	        	 	'LogPublisher':AckPublisher,
	        	 	'websocket': false
	        	 }, 
	        	 emitter),
        	 client = new LogClient({url:'http://localhost:7770', emitter:process, protocol:'log-protocol'});
       
         it('should emit heartbeat when log type is heartbeat', function(done){

             var req = 'request-' + new Date().getTime(),
                 deferred = when.defer();

             process.emit('log', {
                uuid: req,
                type: 'heartbeat',
                parent: '0',
                event: '0',
                log: 'this is a heartbeat'
            });
            
            emitter.on('heartbeat', function(heartbeat){
                deferred.resolve(heartbeat);
            });

            timeout(5000, deferred.promise)
                .then(function(heartbeat){
                    heartbeat.type.should.equal('heartbeat');
                    heartbeat.parent.should.equal('0');
                    heartbeat.event.should.equal('0');
                })
                .ensure(done);
        });
    });
});