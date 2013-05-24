
var WebSocketClient = require("websocket").client,
    msgpack = require("msgpack");

var LogTransport = exports.LogTransport = function(options){

    var self = this;
    self.connection = null;
    self.queue = [];
    self.url = options.url;
    self.protocol = options.protocal || "log-protocol";

    self.connect(self.url, self.protocol);
};

LogTransport.prototype.connect = function(url, protocol){

    var self = this,
        client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        self.connection = null;
    });

    client.on("connect", function(connection){
        self.connection = connection;
        self.drain(self.connection, self.queue);

        self.connection.on("error", function(error){
            self.connection.close();
            self.connection = null;
            self.connect(url, protocol);//reconnect
        });
    });

    client.connect(url, protocol);
}

LogTransport.prototype.log = function(message){

    var self = this;
    if(self.connection){
        self.connection.sendBytes(msgpack.pack(message));
    }
    else{
        self.queue.push(message);
    }
};

LogTransport.prototype.drain = function(connection, queue){
    for(var queued = queue.shift(); queued; queued = queue.shift()){
        connection.sendBytes(msgpack.pack(queued));
    }
};