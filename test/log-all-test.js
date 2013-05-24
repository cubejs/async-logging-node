var EventEmitter = require("events").EventEmitter,
    LogCluster = require("../lib/log-cluster.js").LogCluster,
    AckPublisher = require("./lib/ack-publisher.js").AckPublisher,
    LogClient = require("../lib/log-client.js").LogClient,
    Q = require("q"),
    should = require("should");

describe("log-cluster", function(){

    describe("log", function(){

        var emitter = new EventEmitter();
        var cluster = new LogCluster({port:7900, LogPublisher:new AckPublisher(emitter)});
        var client = new LogClient({url:"http://localhost:7900", emitter:process});
       
        it("should emit heartbeat when log type is heartbeat", function(done){

            var req = "request-" + new Date().getTime();
            process.emit("log", {
                uuid: req,
                type: "heartbeat",
                parent: "0",
                event: "0",
                log: "this is a heartbeat"
            });
            
            var deferred = Q.defer(),
                emitter = new EventEmitter(),
                buffer = new LogBuffer(emitter);//default mapper

            emitter.on("heartbeat", function(heartbeat){
                deferred.resolve(heartbeat);
            });

            setTimeout(function(){
                deferred.reject(new Error("timeout after 1s"));
            }, 5000);

            deferred.promise.then(function(heartbeat){
                heartbeat.type.should.equal("heartbeat");
                heartbeat.parent.should.equal("0");
                heartbeat.event.should.equal("0");
            })
            .fin(function(){
                done();
            });
        });
    });
});