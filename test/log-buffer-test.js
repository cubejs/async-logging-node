var EventEmitter = require("events").EventEmitter,
    LogBuffer = require("../lib/log-buffer.js").LogBuffer,
    Q = require("q"),
    should = require("should");

describe("log-listener", function(){

    describe("log", function(){

        it("should emit heartbeat when log type is heartbeat", function(done){

            var deferred = Q.defer(),
                emitter = new EventEmitter(),
                buffer = new LogBuffer(emitter);//default mapper

            emitter.on("heartbeat", function(heartbeat){
                deferred.resolve(heartbeat);
            });

            emitter.emit("log", {
                uuid: "request-" + new Date().getTime(),
                type: "heartbeat",
                parent: "0",
                event: "1",
                log: {
                    cpu: 0.1,
                    freeMemory: 1000000,
                    totalMemory: 4000000
                }
            });

            setTimeout(function(){
                deferred.reject(new Error("timeout after 1s"));
            }, 1000);

            deferred.promise.then(function(heartbeat){
                heartbeat.type.should.equal("heartbeat");
                heartbeat.parent.should.equal("0");
                heartbeat.event.should.equal("1");
            })
            .fin(function(){
                done();
            });
        });

        it("should emit atomicEvent when log type is atomicEvent", function(done){

            var deferred = Q.defer(),
                emitter = new EventEmitter(),
                buffer = new LogBuffer(emitter);//default mapper

            emitter.on("atomicEvent", function(atomicEvent){
                deferred.resolve(atomicEvent);
            });

            emitter.emit("log", {
                uuid: "request-" + new Date().getTime(),
                type: "atomicEvent",
                parent: "0",
                event: "2",
                log: {
                    cpu: 0.1,
                    freeMemory: 1000000,
                    totalMemory: 4000000
                }
            });

            setTimeout(function(){
                deferred.reject(new Error("timeout after 1s"));
            }, 1000);

            deferred.promise.then(function(atomicEvent){
                atomicEvent.type.should.equal("atomicEvent");
                atomicEvent.parent.should.equal("0");
                atomicEvent.event.should.equal("2");
            })
            .fin(function(){
                done();
            });
        });

        it("should buffer the transaction till its end when log type is transaction", function(done){
            var deferred = Q.defer(),
                emitter = new EventEmitter(),
                buffer = new LogBuffer(emitter);//default mapper

            emitter.on("transaction", function(transaction){
                deferred.resolve(transaction);
            });

            var req = "request-" + new Date().getTime();
            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "0",
                event: "3",
                begin: true,
                log: "this is a transaction's begin"
            });

            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "0",
                event: "3",
                end: true,
                log: "this is a transaction's end"
            })

            setTimeout(function(){
                deferred.reject(new Error("timeout after 1s"));
            }, 1000);

            deferred.promise.then(function(transaction){
                transaction.type.should.equal("transaction");
                transaction.children.should.be.empty;
            })
            .fin(function(){
                done();
            });
        });

        it("should buffer the transaction till its end for all of its children when log type is transaction", function(done){
            var deferred = Q.defer(),
                emitter = new EventEmitter(),
                buffer = new LogBuffer(emitter);//default mapper

            emitter.on("transaction", function(transaction){
                deferred.resolve(transaction);
            });

            var req = "request-" + new Date().getTime();
            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "0",
                event: "4",
                begin: true,
                log: "this is a transaction's begin"
            });

            emitter.emit("log", {
                uuid: req,
                type: "atomicEvent",
                parent: "4",
                event: "5",
                log: "this is an atomic event enclosed by a transaction"
            });

            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "0",
                event: "4",
                end: true,
                log: "this is a transaction's end"
            })

            setTimeout(function(){
                deferred.reject(new Error("timeout after 1s"));
            }, 1000);

            deferred.promise.then(function(transaction){
                transaction.type.should.equal("transaction");
                transaction.children.should.not.be.empty;
                transaction.children.length.should.equal(1);
                transaction.children[0].type.should.equal("atomicEvent");
            })
            .fin(function(){
                done();
            });
        });

        it("should support nested transactions", function(done){
            var deferred = Q.defer(),
                emitter = new EventEmitter(),
                buffer = new LogBuffer(emitter);//default mapper

            emitter.on("transaction", function(transaction){
                deferred.resolve(transaction);
            });

            var req = "request-" + new Date().getTime();
            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "0",
                event: "6",
                begin: true,
                log: "this is a transaction's begin"
            });

            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "6",
                event: "7",
                begin: true,
                log: "this is a nested transaction's begin"
            });

            emitter.emit("log", {
                uuid: req,
                type: "atomicEvent",
                parent: "7",
                event: "8",
                log: "this is an atomic event enclosed by a transaction"
            });

            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "6",
                event: "9",
                end: true,
                log: "this is a nested transaction's end"
            })

            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "0",
                event: "6",
                end: true,
                log: "this is a transaction's end"
            })

            setTimeout(function(){
                deferred.reject(new Error("timeout after 1s"));
            }, 1000);

            deferred.promise.then(function(transaction){
                transaction.type.should.equal("transaction");
                transaction.children.should.not.be.empty;
                transaction.children.length.should.equal(1);
                transaction.children[0].type.should.equal("transaction");
                transaction.children[0].children.should.not.be.empty;
                transaction.children[0].children[0].type.should.equal("atomicEvent");
            })
            .fin(function(){
                done();
            });
        });
    });

    describe("clean", function(){
        it("should allow #clean to be done when 'clean' event is handled", function(done){
            var hbDeferred = Q.defer(),
                emitter = new EventEmitter(),
                buffer = new LogBuffer(emitter);//default mapper

            emitter.on("heartbeat", function(heartbeat){
                hbDeferred.resolve(heartbeat);
            });

            emitter.emit("log", {
                uuid: "request-" + new Date().getTime(),
                type: "heartbeat",
                parent: "0",
                event: "1",
                log: {
                    cpu: 0.1,
                    freeMemory: 1000000,
                    totalMemory: 4000000
                }
            });

            var aeDeferred = Q.defer();

            emitter.on("atomicEvent", function(atomicEvent){
                aeDeferred.resolve(atomicEvent);
            });

            emitter.emit("log", {
                uuid: "request-" + new Date().getTime(),
                type: "atomicEvent",
                parent: "0",
                event: "2",
                log: {
                    cpu: 0.1,
                    freeMemory: 1000000,
                    totalMemory: 4000000
                }
            });

            var txDeferred = Q.defer();

            emitter.on("transaction", function(transaction){
                txDeferred.resolve(transaction);
            });

            var req = "request-" + new Date().getTime();
            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "0",
                event: "3",
                begin: true,
                log: "this is a transaction's begin"
            });

            emitter.emit("log", {
                uuid: req,
                type: "transaction",
                parent: "0",
                event: "3",
                end: true,
                log: "this is a transaction's end"
            });

            Q.allSettled([hbDeferred.promise, aeDeferred.promise, txDeferred.promise])
                .then(function(){

                    buffer.heartbeats.should.not.be.empty;
                    buffer.atomicEvents.should.not.be.empty;
                    buffer.transactions.should.be.ok;
                    buffer.transactions[req].should.be.ok;

                    var now = new Date().getTime();
                    emitter.on("cleaned", function(cleaned){
                        cleaned.till.should.equal(now);
                        done();
                    })
                    emitter.emit("clean", now);
                });
        });
    });
});