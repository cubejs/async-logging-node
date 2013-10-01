var LogClient = require("../lib/log-client.js").LogClient,
    should = require("should");

describe("log-cluster", function(){

    describe.skip("log", function(){

        var pool = "r1cubejslog",
            machine = "phx5qa01c-74cb.stratus.phx.qa.ebay.com",
            ip = "10.109.192.210",
            client = new LogClient({url:"http://cubejslog-app-1-envaeoynhm7r55c.stratus.phx.qa.ebay.com:8080/", emitter:process, protocol:"log-protocol"});
       
        it("should emit heartbeat when log type is heartbeat", function(done){

            var req = "request-" + new Date().getTime(),
                repeat = 10;

            while(repeat --){
                process.emit("log", {
                    uuid: req,
                    type: "heartbeat",
                    parent: "0",
                    event: "0",
                    msg: "this is a remote heartbeat",
                    pool: pool,
                    machine: machine,
                    ipAddress: ip,
                    name: "heartbeat",
                    tid: "master"
                });
            }

            setTimeout(done, 10000);
        });
    });
});