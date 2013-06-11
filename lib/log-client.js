'use strict';

var LogTransport = require("./log-transport.js").LogTransport,
	assert = require("assert");

var LogClient = exports.LogClient = function(options){
	
	assert.ok(options.url);

	var emitter = options.emitter || process,
		ActualTransport = options.LogTransport || LogTransport;

	var transport = new ActualTransport(options);
	
	emitter.on("log", function(log){
		transport.log(log);
	});
};