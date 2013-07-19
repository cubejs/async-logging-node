'use strict';

var WebSocketTransport = require("./index.js").WebSocketTransport,
	assert = require("assert");

var LogClient = exports.LogClient = function(options){
	
	assert.ok(options.url);

	var emitter = options.emitter || process,
		ActualTransport = options.LogTransport || WebSocketTransport;

	var transport = new ActualTransport(options),
		listener = function(log){
			transport.log(log);
		};
	
	emitter.on('log', listener);

	this.stop = function(){
		//when there needs to be different client (url changed etc.)
		emitter.removeListener('log', listener);
	};
};