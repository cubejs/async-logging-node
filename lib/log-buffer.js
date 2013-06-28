'use strict';

/**
 * Buffer is a class holding the raw events received from all application servers
 * Buffer should enable a processing pipeline which is responsible for restructure the raw events in a format of tree
 * Buffer should also be an EventEmitter, which fires higher level events like "transaction completed", "event completed" etc. to allow downstream
 * listeners (CAL publisher) to react to those events.
 *
 * For the restructure task, here're 2 major types of logs:
 * 1. single event
 *  heartbeat or error are of such kind, we could identify them by the schema below where an event has no parent, no begin or end marker either
 * 2. transaction
 *  transaction is the most common type, user request is mapped to a transaction, according to the schema below, transaction is an event with no parent
 *  begins with a marker of "begin", and ends with a marker of "end", itself has an event id, which all of the events enclosed by this transaction is
 *  labeled with.
 *
 * Schema:
 *
 * Log -> SingleEvent | Transaction;
 * SingleEvent -> Event[parent=null&&begin=null&end=null]
 * Transaction -> Event[parent=null&&begin=true&&eventId=E]
 *  Log[parent=E]*
 *  Event[parent=null&&end=true]
 */
var _ = require("underscore"),
    crypto = require("crypto"),
    assert = require("assert");

//standardized the tid pseudo assignment
//pid must be used as a prefix, and the uuid will be hashed, and only the last char of hex encoded will be used, giving an equal oppotunity of 1/16
var assignThread = function(pid, uuid){
    var md5 = crypto.createHash("md5");
    md5.update(uuid || "");
    var hex = md5.digest("hex");
    //using the last char of a md5 hex encoding, giving it a fair chance of being one of the 16 chars.
    return pid + '-' + hex[hex.length-1];
};

var DEFAULT_MAPPER = function(log){

    var mapped = {
        type  :     log.type || "a",
        request:    log.uuid,
        parent:     log.parent || "0",
        begin :     log.begin,
        end   :     log.end,
        event :     log.event,
        duration:   log.duration,
        name:       log.name,
        pid:        log.pid,
        tid:        log.tid || assignThread(log.pid, log.uuid),
        machine:    log.machine,
        ipAddress:  log.ipAddress || log.ip,
        pool:       log.pool,
        level:      log.level,
        msg:        log.msg,
        rlogid:     log.rlogid
    };
    //in case there's anything else not mapped.
    _.extend(mapped, _.omit(log, "type", "uuid", "parent", "begin", "end", "event", "duration", "name", "pid", "tid", "machine", "ipAddress", "pool", "level", "msg", "rlogid"));

    return mapped;
};

var VALID_TYPES = ["atomicEvent", "heartbeat", "transaction"];

var makeTree = function(family, node){

    if(!node){
        return null;
    }
    else if(_.isEqual('atomicEvent', node.type)){
        return node;
    }
    else if(_.isEqual('transaction', node.type) && node.end){
        return null;
    }

    var children = family[node.event] || [];

    node.children = _.compact(_.map(children, function(c){
        return makeTree(family, c);
    }));

    //delete node.family;//done with makeTree, remove family

    return node;
};

var LogBuffer = exports.LogBuffer = function(emitter, mapper){

    var self = this;
    self.transactions = {};
    self.atomicEvents = [];
    self.heartbeats = [];
    self.mapper = mapper || DEFAULT_MAPPER;

    emitter.on("log", function(log){

        var mapped = self.mapper(log),
            parent = mapped.parent,
            begin  = mapped.begin,
            end    = mapped.end,
            event  = mapped.event,
            request= mapped.request,
            type   = mapped.type;

        assert.ok(_.contains(VALID_TYPES, type));//must be one of the valid event types

        if(parent === "0" && !begin && !end){
            if(_.isEqual("atomicEvent", type)){
                self.atomicEvents.push(mapped);

                emitter.emit("atomicEvent", mapped);
            }
            else if(_.isEqual("heartbeat", type)){
                self.heartbeats.push(mapped);

                emitter.emit("heartbeat", mapped);
            }
        }
        else if(parent === "0" && begin){
            //create the root transaction with empty family tree
            var root = self.transactions[request] = mapped;
            root.family = {};
        }
        else if(parent === "0" && end){

            var transaction = self.transactions[request];
            transaction.duration = mapped.duration || new Date().getTime() - transaction.timestamp;

            var tree = makeTree(transaction.family, transaction);
            emitter.emit("transaction", tree);
        }
        else{
            //parent & event would form a family map naturally
            //but must be scoped by request (otherwise, parent or event id could duplicate with others)
            //so the top scope request keeps both the family map & children list
            //the family map would be used to traverse the whole tree and get removed after the request has been published to CAL
            //to restore the tree structure, simply start with root, get all children, map each child to their children in depth first order using family map
            var family = self.transactions[request].family;
            family[parent] = family[parent] || [];
            family[parent].push(mapped);
        }
    });

    emitter.on("clean", function(till){
        _.each(self.atomicEvents, function(a, i){
            if(a.timestamp <= till){
                self.atomicEvents[i] = null;
            }
        });
        self.atomicEvents = _.compact(self.atomicEvents);

        _.each(self.heartbeats, function(h, i){
            if(h.timestamp <= till){
                self.heartbeats[i] = null;
            }
        });
        self.heartbeats = _.compact(self.heartbeats);

        _.each(self.transactions, function(tx, req){
            if(tx.timestamp <= till){
                delete self.transactions[req];
            }
        });

        emitter.emit("cleaned", {till: till});
    });
};