/*! lib.rtcomm.clientjs 1.0.0-beta.10 12-02-2015 */
console.log('lib.rtcomm.clientjs 1.0.0-beta.10 12-02-2015');
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function () {
      return (root.returnExportsGlobal = factory());
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
        root['rtcomm'] = root['rtcomm']  || {};
        root['rtcomm']['util'] = factory();
  }
}(this, function () {

/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 

// what we will export in the module
// Module Name
var exports = {};
var util = exports;

/*jshint -W030*/
var Log = function Log() {
    var LOG_LEVEL = {"MESSAGE": 1,// bin '01' Only MESSAGE lines
        "INFO": 2,  // bin '10'   -- Only Info Messages
        "EVENT": 4, // bin '100'  -- Only EVENT lines
        "DEBUG": 7, // bin '111'  -- DEBUG + INFO + EVENT + MESSAGE 
        "TRACE": 15 }; // bin '1111' (includes) all
    var logLevel = 'INFO';
    this.l = function l(value, obj) {
      var ll = (obj && obj.getLogLevel ) ? obj.getLogLevel() : logLevel;
        /*jslint bitwise: true */
            return (LOG_LEVEL[ll] & LOG_LEVEL[value]) === LOG_LEVEL[value];
    };
    this.log = function log(msg)  {
      console.log(msg);
    };
    this.setLogLevel = this.s = function(value) {
        if (value in LOG_LEVEL) {
          logLevel = value;
        } else {
          throw new Error(value + 'is not a valid Log level, try: '+JSON.stringify(LOG_LEVEL));
        }
      };
    this.getLogLevel = this.g = function(value) {
       return logLevel;
    };
};

// Enables logging for util methods.
// If already defined, use that one?
// console.log('logging already set? ', logging);

var logging =  logging || new Log(),
    l = logging.l;

/**
 *  validate a config object against a reference object
 *
 *  @param {object} config A config object to check against reference
 *  @param {object} reference A Reference object to validate config against.
 *
 *  Reference should contain keys w/ appropriate types attached.
 *
 *
 */
var validateConfig = function validateConfig(/* object */ config, /* object */ reference) {
  // take 'reference' and ensure all the entries are in it and have same type.
  for (var key in reference) {
    if (config.hasOwnProperty(key)) {
      if (reference[key] !== typeof config[key]) {
        if (reference[key] === 'number') {
          if (config[key] === parseInt(config[key]).toString()) {
            continue;
          }
        }

        l('INFO') && console.log("Typeof " +key+ " is incorrect. "+ typeof config[key]+"  Should be a " + reference[key]);
        throw new Error("Typeof " +key+ " is incorrect. "+ typeof config[key]+"  Should be a " + reference[key]);
      }
    } else {
     
      throw new Error("Parameter [" + key + "] is missing in config object");
    }
  }
  return true;
};
/**
 *  When given a config object apply config to it(by default):
 *
 *  defined (already set on the object)
 *  not Private (don't start w/ _ )
 *  not CONSTANT (not all caps)
 *
 *  @param {object} config - Configuration to apply
 *  @param {object} obj - Object to apply config to.
 *  @param {boolean} lenient - If true, apply all config to obj, whether exists or not.
 */
var applyConfig = function applyConfig(config, obj, lenient ) {
  var configurable = [];
  // What we can configure
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)){
      if (prop.match(/^_/)) { continue; }
      if (prop.toUpperCase() === prop) {continue; }
      configurable.push(prop);
    }
  }
  for (var key in config) {
    if(config.hasOwnProperty(key) && ((configurable.indexOf(key) !== -1)|| lenient)) {
      // config key can be set, set it...
      obj[key] = config[key];
    } else{
      throw new Error(key + ' is an invalid property for '+ obj );
    }
  }
  return true;
  //console.log(configurable);
};


/*
 * setConfig
 *  @param configDefinition { required: {}, optional: {}, defaults{}}
 *  @param config config to check and apply defaults 
 */
var setConfig = function(config,configDefinition) {
  l('DEBUG') && console.log(this+'.setConfig() passed in: -->  '+JSON.stringify(config));
  var requiredConfig = configDefinition.required || {};
  var possibleConfig = configDefinition.optional || {};
  var defaultConfig = configDefinition.defaults || {};
  if (config) {
    // validates REQUIRED config upon instantiation.
    if (requiredConfig) {
      validateConfig(config, requiredConfig);
    }
    // handle logLevel passed in...
    if (config.logLevel) {
      //TODO:  Logging is wonky.
      logging.setLogLevel(config.logLevel);
      delete config.logLevel;
    }

    var configObj = possibleConfig?combineObjects(requiredConfig, possibleConfig): requiredConfig; 
    // at this point, everything in configObj are just available parameters and types, null it out.
    // null out and apply defaults
    for (var key in configObj) {
      if (configObj.hasOwnProperty(key)) {
        configObj[key] = defaultConfig.hasOwnProperty(key) ? defaultConfig[key] : null;
      }
    }
    // Apply 'config' to configObj and return it.
    key = null;
    for (key in config) {
      if(config.hasOwnProperty(key) && configObj.hasOwnProperty(key)) {
        // config key can be set, set it...
        // 'null' is an object, have to make sure this is not null too.
        if (config[key] && typeof config[key] === 'object') {
          configObj[key]= combineObjects(config[key], configObj[key]);
        } else { 
          var type = requiredConfig[key] || possibleConfig[key] || null;
          configObj[key] = (type === 'number') ? parseInt(config[key]): config[key];
        }
      } else{
        throw new Error(key + ' is an invalid property for '+ JSON.stringify(configObj) );
      }
    }
    l('DEBUG') && console.log(this+'.setConfig() Returning -->  '+JSON.stringify(configObj));
    return configObj;
  } else {
    throw new Error("A minumum config is required: " + JSON.stringify(requiredConfig));
  }
};
/*
 * combine left object with right object
 * left object takes precendence
 */
var combineObjects = function combineObjects(obj1, obj2) {
  var allkeys = [];
  var combinedObj = {};
  // What keys do we have
  for (var prop in obj1) {
    if (obj1.hasOwnProperty(prop)){
      allkeys.push(prop);
    }    
  }
  prop = null;
  for (prop in obj2) {
    if (obj2.hasOwnProperty(prop)){
      allkeys.push(prop);
    }
  }
  allkeys.forEach(function(key) {
    combinedObj[key] = obj1[key]?obj1[key]:obj2[key];
  });
  return combinedObj;
};

var makeCopy = function(obj) {
  var returnObject = {};;
  Object.keys(obj).forEach(function(key){
    returnObject[key] = obj[key];
  });
  return returnObject;
};

var whenTrue = function(func1, callback, timeout) {
  l('DEBUG') && console.log('whenTrue!', func1, callback, timeout);
  var max = timeout || 500;
  var waittime = 0;
  var min=50;
  
  function test() {
    l('DEBUG') && console.log('whenTrue -- waiting: '+waittime);
    if (waittime > max) {
      callback(false);
      return false;
    }
    var a = func1();
    if (a) {
      l('DEBUG') && console.log('whenTrue TRUE', a);
      callback(a);
      return true;
    } else {
      setTimeout(test,min);
    }
    waittime = waittime+min;
  }
  test();
};

/**
 * generate a random byte pattern
 * Pattern should contain an 'x' to be replaced w/ a Hex Byte, or a 'y' to be
 * replaced w/ a 
 */

var generateRandomBytes = function(pattern) {
  /*jslint bitwise: true */
	var d = new Date().getTime();
  var bytes = pattern.replace(/[xy]/g, function(c) {
  		// Take the date + a random number times 16 (so it will be between 0 & 16), get modulus
  	  // we then get the remainder of dividing by 16 (modulus) and the | 0 converts to an integer.
  	  // r will be between 0 & 16 (0000 & 1111)
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      
      // if it is x, just return the random number (0 to 16)
      // if it is not x, then return a value between 8 & 16 (mainly to ctonrol values in a UUID);
      return (c==='x' ? r : (r&0x7|0x8)).toString(16);
  });
  return bytes;
};


var generateUUID = function() {
	return generateRandomBytes('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
};
var commonArrayItems = function(array1, array2) {
  var a = [];
  for (var i = 0; i<array1.length; i++){
    for (var j = 0; j<array2.length; j++){
      if (array1[i] === array2[j]) {
        a.push(array1[i]);
      }
    }
  }
  return a;
};

exports.Log = Log;
exports.validateConfig = validateConfig;
exports.setConfig = setConfig; 
exports.applyConfig= applyConfig; 
exports.generateUUID= generateUUID;
exports.generateRandomBytes= generateRandomBytes; 
exports.whenTrue=whenTrue; 
exports.makeCopy=makeCopy;
exports.combineObjects = combineObjects;
exports.commonArrayItems= commonArrayItems;


/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 
/** Base Rtcomm class that provides event functionality 
 * @class
 * @memberof module:rtcomm.util
 */
var RtcommBaseObject = {
    /** @lends module:rtcomm.util.RtcommBaseObject.prototype */
    /*
     * Properties

    objName : 'Base',
    id : 'unknown',
    config: {},
    dependencies: {},
    ready: false,
    state: 'unknown',
    states: {},
    events: {},  
     */
    /*
     * Methods
     */
    setState : function(value, object) {
      if (typeof this.state !== 'undefined') {
        this.state = value;
        this.emit(value,object);
      } else {
        this.emit(value,object);
      }
    },
    listEvents : function() {

      console.log('******* ' + this+' Configured events ***********');
      /*jslint forin: true */
      for(var event in this.events) {
          if (this.events.hasOwnProperty(event)) {
            console.log('******* ['+event+'] has '+this.events[event].length+' listeners registered');
          } 
          
        }
    },  
    clearEventListeners : function() {
      for(var event in this.events) {
          if (this.events.hasOwnProperty(event)) {
            this.events[event] = [];
          } 
      }
    },
    createEvent: function(event) {
      if (this.hasOwnProperty('events')){
        this.events[event] = []; 
      } else {
        throw new Error('createEvent() requires an events property to store the events');
      }
    },  
    removeEvent: function(event) {
      if (event in this.events) {
        delete this.events[event];
      }   
    },  

    hasEventListener: function(event){
     return (event in this.events) && (this.events[event].length > 0);
    },

    /** Establish a listener for an event */
    on : function(event,callback) {
      //console.log('on -- this.events is: '+ JSON.stringify(this.events));
      // This function requires an events object on whatever object is attached to. and event needs to be defined there.
      if (this.events && this.events[event] && Array.isArray(this.events[event])) {
        l('EVENT', this) && console.log(this+' Adding a listener callback for event['+event+']');
        l('TRACE', this) && console.log(this+' Callback for event['+event+'] is', callback);
        this.events[event].push(callback);
      } else {
        throw new Error("on() requires an events property listing the events. this.events["+event+"] = [];");
      }   
    },  
    /** emit an event from the object */
    emit : function(event, object) {
      var self = this;
      // We have an event format specified, normalize the event before emitting.
      if (this._Event && typeof this._Event === 'function') { 
        object = this._Event(event, object);
      }
      if (this.events && this.events[event] ) {
     //   console.log('>>>>>>>> Firing event '+event);
        l('EVENT', this) && console.log(this+".emit()  for event["+event+"]", self.events[event].length);
        // Save the event
        if (typeof self.lastEvent !== 'undefined') {
          self.lastEvent = event;
        };
         // Event exists, call all callbacks
        self.events[event].forEach(function(callback) {
            if (typeof callback === 'function') {
              l('EVENT', self) && console.log(self+".emit()  executing callback for event["+event+"]");
              try {
                callback(object);
              } catch(e) {
                var m = 'Event['+event+'] callback failed with message: '+e.message;
                throw new Error(m);
              }
            } else {
              l('EVENT', self) && console.log(self+' Emitting, but no callback for event['+event+']');
            }   
        });
      } else {
        throw new Error('emit() requires an events property listing the events. this.events['+event+'] = [];');
      }
    },
    extend: function(props) {
      var prop, obj;
      obj = Object.create(this);
      for (prop in props) {
        if (props.hasOwnProperty(prop)) {
          obj[prop] = props[prop];
        }
      }
      return obj;
    },
    // Test Function
    _l: function(level){
      if (typeof l === 'function') {
        return l(level,this);
      } else {
        return 'unknown';  
      }
    },
    toString: function() {
      var name =  (this._ && this._.objName)? this._.objName : this.objName || this.name || 'Unknown';
      var id =  (this._ && this._.id)? this._.id: this.id || 'Unknown';
      return name + '['+id+']';
    }
};

exports.RtcommBaseObject = RtcommBaseObject;

/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 
var RtcommEvent = function RtcommEvent() {
  this.name = "";
  this.message = "";
  this.object = "";
};

return util;

}));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(["./util"], function (util) {
      return (root.returnExportsGlobal = factory(util));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory(require("util"));
  } else {
        root['rtcomm'] = root['rtcomm']  || {};
        root['rtcomm']['connection'] = factory(rtcomm.util);
  }
}(this, function (util) {

/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 
// rtcservice & util should be defined here:
/*jshint -W030*/
/*global util:false*/

var exports = {};
var connection = exports;

var logging = new util.Log(),
    setLogLevel = logging.s,
    getLogLevel = logging.g,
    l = logging.l,
    generateUUID = util.generateUUID,    
    generateRandomBytes= util.generateRandomBytes,    
    validateConfig = util.validateConfig,
    applyConfig = util.applyConfig,
    setConfig = util.setConfig,
    /*global log: false */
    log = function log() {
          // I want to log CallingObject[id].method Message [possibly an object]

          var object = {},
              method = '<none>',
              message = null,
              remainder = null,
              logMessage = "";

          var args = [].slice.call(arguments);

          if (args.length === 0 ) {
            return;
          } else if (args.length === 1 ) {
            // Just a Message, log it...
            message = args[0];
          } else if (args.length === 2) {
            object = args[0];
            message = args[1];
          } else if (args.length === 3 ) {
            object = args[0];
            method = args[1];
            message = args[2];
          } else {
            object = args.shift();
            method = args.shift();
            message = args.shift();
            remainder = args;
          }

          if (object) {
            logMessage = object.toString() + "." + method + ' ' + message;
          } else {
            logMessage = "<none>" + "." + method + ' ' + message;
          }
          // Ignore Colors...
          if (object && object.color) {object.color = null;}
          
          var css = "";
          if (object && object.color) {
            logMessage = '%c ' + logMessage;
            css = 'color: ' + object.color;
            if (remainder) {
            l('TRACE') &&   console.log(logMessage, css, remainder);
            } else {
            l('TRACE') &&  console.log(logMessage,css);
            }
          } else {
            if (remainder) {
              l('TRACE') && console.log(logMessage, remainder);
            } else {
              l('TRACE') && console.log(logMessage);
            }
          }
        }; // end of log/ 
      var uidRoute = function(userid) {
        l('TRACE') && console.log('uidRoute called w/ id '+userid);
        var returnObj = { 
          route:null ,
          userid: null
        };
        var a = userid.split(':');
        if (a.length === 1) {
          returnObj.userid = userid;
        } else if (a.length === 2) {
          returnObj.route= a[0];
          returnObj.userid = a[1];
        } else {
          throw new Error('Unable to process userid: '+ userid);
        }  
        l('TRACE') && console.log('uidRoute returning ',returnObj);
        return returnObj;
      };

      var routeLookup =  function(services, scheme) {
          // should be something like [sips, sip, tel ] for the SIP CONNECTOR SERVICE
          l('TRACE') && console.log('routeLookup() finding scheme: '+scheme);
          var topic = null;
          for(var key in services) {
            l('TRACE') && console.log('routeLookup() searching key: '+key);
            if (services.hasOwnProperty(key)){
              l('TRACE') && console.log('routeLookup() searching key: ',services[key]);
              if (typeof services[key].schemes !== 'undefined' && 
                  typeof services[key].topic !== 'undefined') {
                  if (services[key].schemes.indexOf(scheme) >= 0) {
                    topic = services[key].topic;
                    break;
                  }
              }
            }
          }
          l('TRACE') && console.log('routeLookup() returing topic: '+topic);
          return topic;
        };

/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**

 * @memberof module:rtcomm.connector
 *
 * @classdesc
 * The EndpointConnection encapsulates the functionality to connect and create Sessions.
 *
 * @param {object}  config   - Config object
 * @param {string}  config.server -  MQ Server for mqtt.
 * @param {integer} [config.port=1883] -  Server Port
 * @param {string}  [config.userid] -  Unique user id representing user
 * @param {string}  [config.managementTopicName] - Default topic to register with ibmrtc Server
 * @param {string}  [config.rtcommTopicPath]
 * @param {object}  [config.presence] - presence configuration
 * @param {object}  [config.credentials] - Optional Credentials for mqtt server.
 *
 * Events
 * @event message    Emit a message (MessageFactor.SigMessage)
 * @event newsession  Called when an inbound new session is created, passes the new session.
 * @param {function} config.on  - Called when an inbound message needs
 *    'message' --> ['fromEndpointID': 'string', content: 'string']
 *
 * @throws  {String} Throws new Error Exception if invalid arguments
 *
 * @private
 */

var EndpointConnection = function EndpointConnection(config) {
  /*
   * Registery Object
   */
  function Registry(timer) {
    timer = timer || false;
    var registry = {};
    var defaultTimeout = 5000;

    var addTimer = function addTimer(item){
      if(item.timer) {
        l('DEBUG') && console.log(item+' Timer: Clearing existing Timer: '+item.timer + 'item.timeout: '+ item.timeout);
        clearTimeout(item.timer);
      }

      var timerTimeout = item.timeout || defaultTimeout;
      item.timer  = setTimeout(function() {
          if (item.id in registry ) {
            // didn't execute yet
            var errorMsg = item.objName + ' '+item.timer+' Timed out ['+item.id+'] after  '+timerTimeout+': '+Date();
            if (typeof registry[item.id].onFailure === 'function' ) {
              registry[item.id].onFailure({'reason': errorMsg});
            } else {
              l('DEBUG') && console.log(errorMsg);
            }
            delete registry[item.id];
          }
        },
        timerTimeout);
      l('DEBUG') && console.log(item+' Timer: Setting Timer: '+item.timer + 'item.timeout: '+timerTimeout);
      };

    var add = function(item) {
      /*global l:false*/

      l('TRACE') && console.log('Registry.add() Adding item to registry: ', item);

      item.on('finished', function() {
        this.remove(item);
      }.bind(this));
      timer && item.on('timeout_changed', function(newtimeout) {
        addTimer(item);
      }.bind(this));
      timer && addTimer(item);
      registry[item.id] = item;
    };

    return {
      add: add,
      clear: function() {
        var self = this;
        Object.keys(registry).forEach(function(item) {
          self.remove(registry[item]);
        });
      },
      remove: function(item) {
        if (item.id in registry) {
          item.timer && clearTimeout(item.timer);
          l('DEBUG') && console.log('EndpointConnection  Removing item from registry: ', item);
          delete registry[item.id];
        }
      },
      list: function() {
        return Object.keys(registry);
      },
      find: function(id) {
        return registry[id] || null ;
      }
    };
  } // End of Registry definition

  /*
   * create an MqttConnection for use by the EndpointConnection
   */
  /*global MqttConnection:false*/
  var createMqttConnection = function(config) {
    var mqttConn= new MqttConnection(config);
    return mqttConn;
  };
  /*
   * Process a message, expects a bind(this) attached.
   */
  var processMessage = function(message) {
    var endpointConnection = this;
    var topic = message.topic;
    var content = message.content;
    var fromEndpointID = message.fromEndpointID;
    var rtcommMessage = null;
    /*global MessageFactory:false*/
    try {
      rtcommMessage = MessageFactory.cast(content);
      l('DEBUG') && console.log(this+'.processMessage() processing Message', rtcommMessage);
      // Need to propogate this, just in case...
      rtcommMessage.fromEndpointID = fromEndpointID;
    } catch (e) {
      l('DEBUG') && console.log(this+'.processMessage() Unable to cast message, emitting original message',e);
      l('DEBUG') && console.log(this+'.processMessage() Unable to cast message, emitting original message',message);
    }

    if (rtcommMessage && rtcommMessage.transID) {
      // this is in context of a transaction.
      if (rtcommMessage.method === 'RESPONSE') {
        // close an existing transaction we started.
        l('TRACE') && console.log(this+'.processMessage() this is a RESPONSE', rtcommMessage);
        var transaction = endpointConnection.transactions.find(rtcommMessage.transID);
        if (transaction) {
          l('TRACE') && console.log(this+'.processMessage() existing transaction: ', transaction);
          transaction.finish(rtcommMessage);
        } else {
          console.error('Transaction ID: ['+rtcommMessage.transID+'] not found, nothing to do with RESPONSE:',rtcommMessage);
        }
      } else if (rtcommMessage.method === 'START_SESSION' )  {
        // Create a new session:
        endpointConnection.emit('newsession', 
                                endpointConnection.createSession(
                                  {message:rtcommMessage, 
                                    source: topic, 
                                    fromEndpointID: fromEndpointID}));
      } else if (rtcommMessage.method === 'REFER' )  {
        /*
         * This is an INBOUND Transaction... 
         * ... NOT COMPLETE ...
         */
        var t = this.createTransaction({message: rtcommMessage, timeout:30000});
        // Create a new session:
        endpointConnection.emit('newsession', 
                                endpointConnection.createSession(
                                  {message:rtcommMessage, 
                                    referralTransaction: t,
                                    source: topic }));

      } else {
        // We have a transID, we need to pass message to it.
        // May fail? check.
        endpointConnection.transactions.find(rtcommMessage.transID).emit('message',rtcommMessage);
      }
    } else if (rtcommMessage && rtcommMessage.sigSessID) {
      // has a session ID, fire it to that.
      endpointConnection.emit(rtcommMessage.sigSessID, rtcommMessage);
    } else if (message.topic) {
      // If there is a topic, but it wasn't a START_SESSION, emit the WHOLE original message.
       // This should be a raw mqtt type message for any subscription that matches.
      var subs  = endpointConnection.subscriptions;
      Object.keys(subs).forEach(function(key) {
         if (subs[key].regex.test(message.topic)){
           if (subs[key].callback) {
              l('DEBUG') && console.log('Emitting Message to listener -> topic '+message.topic);
              subs[key].callback(message);
           } else {
            // there is a subscription, but no callback, pass up normally.
             // drop tye messge
             l('DEBUG') && console.log('Nothing to do with message, dropping message', message);
           }
         }
      });
    } else {
      endpointConnection.emit('message', message);
    }
  };


  /*
   * Instance Properties
   */
  this.objName = 'EndpointConnection';
  //Define events we support
  this.events = {
      'servicesupdate': [],
      'message': [],
      'newsession': []};

  // Private
  this._ = {};
  this._.init = false;
  this._.presenceTopic = null;
  // If we have services and are configured
  // We are fully functional at this point.
  this.ready = false;
  // If we are connected
  this.connected = false;
  var rtcommTopicPath = '/rtcomm/';
  var configDefinition = {
    required: { 
      server: 'string', 
      port: 'number'},
    optional: { 
      credentials : 'object', 
      myTopic: 'string', 
      rtcommTopicPath: 'string', 
      managementTopicName: 'string', 
      connectorTopicName: 'string',
      userid: 'string', 
      appContext: 'string', 
      secure: 'boolean', 
      publishPresence: 'boolean', 
      presence: 'object'
    },
    defaults: { 
      rtcommTopicPath: rtcommTopicPath, 
      managementTopicName: 'management', 
      connectorTopicName : "connector",
      publishPresence: 'false', 
      presence: { 
        rootTopic: rtcommTopicPath + 'sphere/',
        topic: '/', // Same as rootTopic by default
      }
    }
  };
  // the configuration for Endpoint
  if (config) {
    /* global setConfig:false */
    this.config = setConfig(config,configDefinition);
  } else {
    throw new Error("EndpointConnection instantiation requires a minimum configuration: "+ 
                    JSON.stringify(configDefinition));
  }
  this.id = this.userid = this.config.userid || null;
  var mqttConfig = { server: this.config.server,
                     port: this.config.port,
                     rtcommTopicPath: this.config.rtcommTopicPath ,
                     credentials: this.config.credentials || null,
                     myTopic: this.config.myTopic || null };

  //Registry Store for Session & Transactions
  this.sessions = new Registry();
  this.transactions = new Registry(true);
  this.subscriptions = {};

  // Only support 1 appContext per connection
  this.appContext = this.config.appContext || 'rtcomm';

  // Services Config.

  // Should be overwritten by the service_query

  this.services = {
    RTCOMM_CONNECTOR_SERVICE : {},
    RTCOMM_CALL_CONTROL_SERVICE : {},
    RTCOMM_CALL_QUEUE_SERVICE : {},
    SIP_CONNECTOR_SERVICE: {},
  }; 

  // LWT config 
  this._.willMessage = null;

  //create our Mqtt Layer
  this.mqttConnection = createMqttConnection(mqttConfig);
  this.mqttConnection.on('message', processMessage.bind(this));

  this.config.myTopic = this.mqttConnection.config.myTopic;
  this._.init = true;
};  // End of Constructor

/*global util:false */
EndpointConnection.prototype = util.RtcommBaseObject.extend (
    (function() {
      /*
       * Class Globals
       */

      /* optimize string for subscription */
      var optimizeTopic = function(topic) {
      // start at the end, replace each
        // + w/ a # recursively until no other filter...
        var optimized = topic.replace(/(\/\+)+$/g,'\/#');
        return optimized;
      };

      /* build a regular expression to match the topic */
      var buildTopicRegex= function(topic) {
        // If it starts w/ a $ its a Shared subscription.  Essentially:
        // $SharedSubscription/something//<publishTopic>
        // We need to Remove the $-> //
        // /^\$.+\/\//, ''
        var regex = topic.replace(/^\$SharedSubscription.+\/\//, '\\/')
                    .replace(/\/\+/g,'\\/.+')
                    .replace(/\/#$/g,'($|\\/.+$)')
                    .replace(/(\\)?\//g, function($0, $1){
                      return $1 ? $0 : '\\/';
                    });

        // The ^ at the beginning in the return ensures that it STARTS w/ the topic passed.
        return new RegExp('^'+regex+'$');
      };

      /*
       * Parse the results of the serviceQuery and apply them to the connection object
       * "services":{
       * "RTCOMM_CONNECTOR_SERVICE":{
       *   "iceURL":"stun:stun.juberti.com:3478,turn:test@stun.juberti.com:3478:credential:test",
       *  "eventMonitoringTopic":"\/7c73b5a5-14d9-4c19-824d-dd05edc45576\/rtcomm\/event",
       *  "topic":"\/7c73b5a5-14d9-4c19-824d-dd05edc45576\/rtcomm\/bvtConnector"},
       * "RTCOMM_CALL_CONTROL_SERVICE":{
       *   "topic":"\/7c73b5a5-14d9-4c19-824d-dd05edc45576\/rtcomm\/callControl"},
       * "RTCOMM_CALL_QUEUE_SERVICE":{
       *   "queues":[
       *     {"endpointID":"callQueueEndpointID","topic":"\/7c73b5a5-14d9-4c19-824d-dd05edc45576\/rtcomm\/callQueueTopicName"}
       *   ]}
       *  }
       */

      var parseServices = function parseServices(services, connection) {
        if (services) {
          if (services.RTCOMM_CONNECTOR_SERVICE) {
            connection.services.RTCOMM_CONNECTOR_SERVICE = services.RTCOMM_CONNECTOR_SERVICE;
            connection.config.connectorTopicName = services.RTCOMM_CONNECTOR_SERVICE.topic|| connection.config.connectorTopicName;
          }
          if (services.RTCOMM_CALL_CONTROL_SERVICE) {
            connection.services.RTCOMM_CALL_CONTROL_SERVICE = services.RTCOMM_CALL_CONTROL_SERVICE;
          }
          if (services.RTCOMM_CALL_QUEUE_SERVICE) {
            connection.services.RTCOMM_CALL_QUEUE_SERVICE = services.RTCOMM_CALL_QUEUE_SERVICE;
          }
          if (services.SIP_CONNECTOR_SERVICE) {
            connection.services.SIP_CONNECTOR_SERVICE = services.SIP_CONNECTOR_SERVICE;
          }
        }
      };

      var  createGuestUserID = function createGuestUserID() {
          /* global generateRandomBytes: false */
          var prefix = "GUEST";
          var randomBytes = generateRandomBytes('xxxxxx');
          return prefix + "-" + randomBytes;
      };


      /** @lends module:rtcomm.connector.EndpointConnection.prototype */
      return {
        /*
         * Instance Methods
         */

        normalizeTopic: function normalizeTopic(topic, adduserid) {
        /*
         * The messaging standard is such that we will send to a topic
         * by appending our clientID as follows:  topic/<clientid>
         *
         * This can be Overridden by passing a qualified topic in as
         * toTopic, in that case we will leave it alone.
         *
         */
         // our topic should contain the rtcommTopicPath -- we MUST stay in the topic Path... 
         // and we MUST append our ID after it, so...
          if (topic) {
            l('TRACE') && console.log(this+'.normalizeTopic topic is: '+topic);
            var begin = this.config.rtcommTopicPath;
            adduserid = (typeof adduserid === 'boolean') ? adduserid : true;
            var end = (adduserid) ? this.config.userid: '';
            var p = new RegExp("^" + begin,"g");
            topic = p.test(topic)? topic : begin + topic;
            var p2 = new RegExp(end + "$", "g");
            topic = p2.test(topic) ? topic: topic + "/" + end;
            // Replace Double '//' if present
            topic = topic.replace(/\/+/g,'\/');
          } else {
            if (this.config.connectorTopicName) { 
              topic = this.normalizeTopic(this.config.connectorTopicName);
            } else {
              throw new Error('normalize Topic requires connectorTopicName to be set - call serviceQuery?');
            }
          }
          l('TRACE') && console.log(this+'.normalizeTopic returing topic: '+topic);
          return topic;
        },

        /*global setLogLevel:false */
        setLogLevel: function(level) {
          setLogLevel(level);
        //  util && util.setLogLevel(level);
        },

        /*global getLogLevel:false */
        getLogLevel: getLogLevel,
        /* Factory Methods */
        /**
         * Create a message for this EndpointConnection
         */
        createMessage: function(type) {
          var message = MessageFactory.createMessage(type);
          if (message.hasOwnProperty('fromTopic')) {
            message.fromTopic = this.config.myTopic;
          }
          l('DEBUG')&&console.log(this+'.createMessage() returned', message);
          return message;
        },
        createPresenceDocument: function(config){
          var presenceDocument = MessageFactory.createMessage('DOCUMENT');
          presenceDocument.addressTopic = this.getMyTopic();
          presenceDocument.appContext = this.appContext;
          if (config) {
            presenceDocument.state = config.state || presenceDocument.state;
            presenceDocument.alias = config.alias || presenceDocument.alias;
            presenceDocument.userDefines = config.userDefines || presenceDocument.userDefines;
          }
          return presenceDocument;
        },

        publishPresence : function(presenceDoc) {
          if (this.config.publishPresence) {
            this.publish(this.getMyPresenceTopic(), presenceDoc, true);
          } else {
            throw new Error('Cannot publish presence if publishPresence != true upon connection creation');
          }
          return this;
        },
        /**
         * Create a Response Message for this EndpointConnection
         */
        createResponse : function(type) {
          var message = MessageFactory.createResponse(type);
          // default response is SUCCESS
          message.result = 'SUCCESS';
          return message;
        },
        /**
         * Create a Transaction
         */
        createTransaction : function(options,onSuccess,onFailure) {
          if (!this.connected) {
            throw new Error('not Ready -- call connect() first');
          }
          // options = {message: message, timeout:timeout}
          /*global Transaction:false*/
          var t = new Transaction(options, onSuccess,onFailure);
          t.endpointconnector = this;
          l('DEBUG') && console.log(this+'.createTransaction() Transaction created: ', t);
          this.transactions.add(t);
          return t;
        },
        /**
         * Create a Session
         */
        createSession : function createSession(config) {
          if (!this.connected) {
            throw new Error('not Ready -- call connect() first');
          }

          // start a transaction of type START_SESSION
          // createSession({message:rtcommMessage, fromEndpointID: fromEndpointID}));
          // if message & fromEndpointID -- we are inbound..
          //  ALWAYS use a configure toTopic as an override.
          if (config && config.remoteEndpointID) {
            config.toTopic = this.normalizeTopic(routeLookup(this.services, uidRoute(config.remoteEndpointID).route));
          }
          /*global SigSession:false*/
          var session = new SigSession(config);
          session.endpointconnector = this;
          // apply EndpointConnection
          this.createEvent(session.id);
          this.on(session.id,session.processMessage.bind(session));
          this.sessions.add(session);
          session.on('failed', function() {
            this.sessions.remove(session);
          }.bind(this));
          return session;
        },
        /**
         * common query fucntionality
         * @private
         *
         */
        _query : function(message, contentfield, cbSuccess, cbFailure) {
          var successContent = contentfield || 'payload';
          var onSuccess = function(query_response) {
            if (cbSuccess && typeof cbSuccess === 'function') {
              if (query_response) {
                var successMessage = query_response[successContent] || null;
                cbSuccess(successMessage);
              }
            } else {
              l('DEBUG') && console.log('query returned: ', query_response);
            }
          };
          var onFailure = function(query_response) {
            if (cbFailure && typeof cbFailure === 'function') {
              if (query_response && query_response.failureReason) {
                cbFailure(query_response.failureReason);
              }
            } else {
              console.error('query failed:', query_response);
            }
          };
          if (this.connected) {
            var t = this.createTransaction({
              message: message, 
              toTopic: this.config.managementTopicName 
            }, onSuccess,onFailure);
            t.start();
          } else {
            console.error(this+'._query(): not Ready!');
          }
        },
        /**
         * connect the EndpointConnection to the server endpointConnection
         *
         * @param {callback} [cbSuccess] Optional callbacks to confirm success/failure
         * @param {callback} [cbFailure] Optional callbacks to confirm success/failure
         */
        connect : function(cbSuccess, cbFailure) {
          var epConn = this;

          l('DEBUG') && console.log(this+'.connect() LWT topic: '+ this.getMyPresenceTopic()+ ' message', this.getLwtMessage());
          cbSuccess = (typeof cbSuccess === 'function') ? cbSuccess :
            function(service) {
              l('DEBUG') && console.log('Success - specify a callback for more information', service);
          };

          cbFailure = (typeof cbFailure === 'function') ? cbFailure :
            function(error) {
              console.error('EndpointConnection.connect() failed - specify a callback for more information', error);
          };
          if (!this._.init) {
            throw new Error('not initialized -- call init() first');
          }
          if (this.connected) {
            throw new Error(this+".connect() is already connected!");
          }
          var onSuccess = function(service) {
            this.connected = true;
            l('DEBUG') && console.log('EndpointConnection.connect() Success, calling callback - service:', service);
            cbSuccess(service);
          };
          var onFailure = function(error) {
            this.connected = false;
            cbFailure(error);
          };

          var mqttConfig ={'onSuccess': onSuccess.bind(this),
                           'onFailure': onFailure.bind(this)};
          if (this.config.publishPresence) {
            mqttConfig.willMessage = this.getLwtMessage();
            mqttConfig.presenceTopic =this.getMyPresenceTopic();
          }
          // Connect MQTT
          this.mqttConnection.connect(mqttConfig);
         },
        disconnect : function() {
          l('DEBUG') && console.log('EndpointConnection.disconnect() called: ', this.mqttConnection);
          l('DEBUG') && console.log(this+'.disconnect() publishing LWT');
          this.publish(this.getMyPresenceTopic(), this.getLwtMessage(), true);
          this.sessions.clear();
          this.transactions.clear();
          this.clearEventListeners();
          this.mqttConnection.destroy();
          this.mqttConnection = null;
          this.connected = false;
          this.ready = false;
        },
        /**
         * Service Query for supported services by endpointConnection
         * requires a userid to be set.
         */
        serviceQuery: function(cbSuccess, cbFailure) {
          var self = this;
          cbSuccess = cbSuccess || function(message) {
            l('DEBUG') && console.log(this+'.serviceQuery() Default Success message, use callback to process:', message);
          };
          cbFailure = cbFailure || function(error) {
            l('DEBUG') && console.log(this+'.serviceQuery() Default Failure message, use callback to process:', error);
          };

          if (!this.id) {
            cbFailure('servicQuery requires a userid to be set');
            return;
          }

          if (this.connected) {
            var message = this.createMessage('SERVICE_QUERY');
            this._query(message, 'services',
                   function(services) {
                      parseServices(services,self);
                      self.ready = true;
                      self.emit('servicesupdate', services);
                      cbSuccess(services);
                    },
                    cbFailure);
          } else {
            console.error('Unable to execute service query, not connected');
          }
        },
        /**
         * Subscribe to an MQTT topic.
         * To receive messages on the topic, use .on(topic, callback);
         *
         */
        subscribe: function(topic,callback) {
          var topicRegex = buildTopicRegex(optimizeTopic(topic));
          this.subscriptions[topicRegex] = {regex: topicRegex, callback: callback};
          this.mqttConnection.subscribe(topic);
          // RegExp Object can be used to match inbound messages. (as a string it is a key)
          return topicRegex;
        },
        unsubscribe: function(topic) {
          var topicRegex = buildTopicRegex(optimizeTopic(topic));
          if(this.mqttConnection.unsubscribe(topic)) {
            delete this.subscriptions[topicRegex];
          }
        },

        //TODO:  Expose all the publish options... (QOS, etc..);
        publish: function(topic, message, retained) {
          this.mqttConnection.publish(topic, message, retained);
        },

        destroy : function() {
          l('DEBUG') && console.log(this+'.destroy() Destroying the connection');
          this.disconnect();
        },
        /**
         * Send a message
         *  @param toTopic
         *  @param message
         *  @param fromEndpointID  // optional...
         */
        send : function(config) {
          if (!this.connected) {
            throw new Error('not Ready -- call connect() first');
          }
          if (config) {
            var toTopic = this.normalizeTopic(config.toTopic);
            this.mqttConnection.send({message:config.message, toTopic:toTopic});
          } else {
            console.error('EndpointConnection.send() Nothing to send');
          }
        },
        getMyTopic: function() {
          return this.config.myTopic; 
        },
        /**
         * set the userid
         */
        setUserID : function(id) {

          id = id || createGuestUserID();
          l('DEBUG') && console.log(this+'.setUserID id is '+id);
          if (this.id === null || /^GUEST/.test(this.id)) {
            // Set the id to what was passed.
            this.id = this.userid = this.config.userid = id;
            return id;
          } else if (this.id === id){
            l('DEBUG') && console.log(this+'.setUserID() already set to same value: '+id);
            return id;
          } else {
            console.error(this+'.setUserID() ID already set, cannot be changed: '+ this.id);
            return id;
           }
        },
        getUserID : function() {
          return this.config.userid;
        }, 
        getLwtMessage: function() {
          // should be an empty message
          this._.willMessage =  this._.willMessage || ''; 
          return this._.willMessage;
        },
        /**
         * Return the topic my presence is published to (includes user id);
         */
        getMyPresenceTopic: function() {
          this._.presenceTopic = this._.presenceTopic || this.normalizeTopic(this.config.presence.rootTopic + this.config.presence.topic ,true);
          l('DEBUG') && console.log(this+'.getMyPresenceTopic() returning topic: '+this._.presenceTopic);
          return this._.presenceTopic;
        },

        getPresenceRoot: function() {
          l('DEBUG') && console.log(this+'.getPresenceRoot() returning topic: '+ 
                                   this.normalizeTopic(this.config.presence.rootTopic, false));
          return this.normalizeTopic(this.config.presence.rootTopic,false);
        },
        useLwt: function() {
          if (this.services.RTCOMM_CONNECTOR_SERVICE.sphereTopic) {
            return true;
          } else {
            return false;
          }
        }
    };
  })()
);
/* globals exports:false */
exports.EndpointConnection = EndpointConnection;

/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 
/** @class
 * @memberof module:rtcomm.webrtc
 * @private
 */
/* Constructor */

var MessageFactory = (function (){
  // base Template used for everything.
  var _baseHeaders = {
      'rtcommVer': 'v0.3.0',
       'method' : null,
       'fromTopic': null
  };
  
  var _optionalHeaders = {
      'sigSessID':null,
      'transID':null,
      'reason': null,
      'toEndpointID': null,
      'appContext': null,
      'holdTimeout': null,
      'queuePosition': null
  };
  
  // Override base headers and add new headers for the OUTBOUND message
  // If it is a transaction, it will have a transID
  
  var _messageTemplates = {
      'SERVICE_QUERY' : {
        'method': 'SERVICE_QUERY',
        'transID': null,
      },
      'START_SESSION' : {
        'method': 'START_SESSION',
        'protocols': [],
        'sigSessID':null,
        'transID':null,
        'toEndpointID': null,
        'payload': null,
      },
      'REFER' : {
        'method': 'REFER',
        'transID':null,
        'toEndpointID': null,
        'details': null,
      },
     'STOP_SESSION' : {
        'method': 'STOP_SESSION',
        'sigSessID':null,
        'payload': null,
      },
      'PRANSWER': {
        'method': 'PRANSWER',
        'protocols': [],
        'payload': null
      },
      // Message is generic and could be anything... 
      'MESSAGE':{
        'method':'MESSAGE',
        'payload': null
      },
      'DOCUMENT': {
        'method': 'DOCUMENT',
        'type': 'ENDPOINT',
        'addressTopic':null,
        'appContext':null,
        'state': null,
        'alias': null,
        'userDefines':[]
      }
  };
  
  var _baseResponseTemplate = {
      'RESPONSE' : {
        'method': 'RESPONSE',
        'orig': null,
        'transID': null,
        'result': null,
      }
  };
  
  var _responseTemplates = {
      'SERVICE_QUERY' : {
        'orig': 'SERVICE_QUERY',
        'services':null
      },
      'START_SESSION' : {
        'orig': 'START_SESSION',
        'protocols': [],
        'sigSessID': null,
        'result': null,
        'payload': null,
        'transID': null,
      },
      'REFER' : {
        'orig': 'REFER',
        'transID':null,
        'result': null,
      }
  };
  
  function getMessageTemplate(type) {
    var template = {};
    objMerge(template,_baseHeaders);
    if (_messageTemplates.hasOwnProperty(type)) {
      objMerge(template,_messageTemplates[type]);
      return template;
    } else {
      console.error('Message Type: '+type+' Not found!');
      return null;
    }
  }
  
  function getResponseTemplate(type) {
    var template = {};
    objMerge(template,_baseHeaders);
    objMerge(template, _baseResponseTemplate.RESPONSE);
    if (_responseTemplates.hasOwnProperty(type)) {
      objMerge(template,_responseTemplates[type]);
      return template;
    } else {
      console.error('Message Type: '+type+' Not found!');
      return null;
    }
  }
  
  function objMerge(obj1,obj2) {
    // Take Right Object and place on top of left object.  
    for (var key in obj2) {
      if (obj2.hasOwnProperty(key)) {
        obj1[key] = obj2[key];
      }
    }
  }
  
  var SigMessage = function SigMessage(template) {
    if (template) {
      for (var key in template) {
        if (template.hasOwnProperty(key)) {
          this[key] = template[key];
        }
      }
    }
  };

  SigMessage.prototype = {
      /** Convert message to a specific JSON object 
       * 
       * @returns {JSON} 
       * 
       */
      toJSON: function() {
        var obj = {};
        for (var key in this) {
          if (this.hasOwnProperty(key)) {
            obj[key] = this[key];
          }
        }
        return obj;
      }, 
      /* Override */
      toString: function() {
        // When converted to a string, we return a SPECIFIC object content that matches the Message Template 
        return JSON.stringify(this.toJSON());
      }
  };
  
  function createResponse(type) {
    var message = null;
    var template = getResponseTemplate(type);
    if (template) {
      message = new SigMessage(template);
    } else {
      throw new TypeError('Invalid Message type:'+type+', should be one of: '+ Object.keys(_messageTemplates));
    }
    return message;
  }
  
  function createMessage(type) {
    type = type || 'MESSAGE';
    var message = null;
    var template = getMessageTemplate(type);
    if (template) {
      message = new SigMessage(template);
    } else {
      throw new TypeError('Invalid Message type:'+type+', should be one of: '+ Object.keys(_messageTemplates));
    }
    return message;
  }
  
  function isValid(message) {
    try {
      var tmpmsg = cast(message);
    } catch(e) {
      // unable to cast, not a good message.
      return false;
    }
    return true;
  }
  
  function cast(obj) {
    /*global l:false*/
    l('TRACE') && console.log('MessageFactory.cast() Attempting to cast message: ', obj);
  
    if ( typeof obj === 'string') {
      l('TRACE') && console.log('MessageFactory.cast() It is a string... ', obj);
      /* if its a 'STRING' then convert to a object */
      try {
        obj = JSON.parse(obj);
      } catch (e) {
        throw new TypeError('Unable to cast object as a SigMessage');
      }
      l('TRACE') && console.log('MessageFactory.cast() After JSON.parse... ', obj);
    }
    var template = null;
    if (obj.method) {
      template = (obj.method === 'RESPONSE') ? getResponseTemplate(obj.orig):getMessageTemplate(obj.method);
    } else {
      throw new TypeError('Unable to cast object as a SigMessage');
    }
    var castedMessage = new SigMessage(template);
    for (var prop in obj){
      // console.log("key:" + prop + " = " + obj[prop]);
      if (template.hasOwnProperty(prop) || _optionalHeaders.hasOwnProperty(prop)){
        //    console.log("key:" + prop + " = " + obj[prop]);
        castedMessage[prop] = obj[prop];
      } else {
        l('DEBUG') && console.log('MessageFactory.cast() dropped header: '+prop);
      }
    }  
    l('TRACE') && console.log('MessageFactory.cast() returning casted message:', castedMessage);
    return castedMessage;
  }

  return {
    createMessage:  createMessage,
    createResponse: createResponse,
    cast : cast
  };
})();

exports.MessageFactory = MessageFactory;

/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ 
/**
 * @class 
 * @memberof module:rtcomm.connector
 * @classdesc
 *
 * Low level service used to create the MqttConnection which connects
 * via mqtt over WebSockets to a server passed via the config object.
 *
 * @param {object}  config   - Config object for MqttConnection
 * @param {string}  config.server -  MQ Server for mqtt.
 * @param {integer} [config.port=1883] -  Server Port
 * @param {string}  [config.defaultTopic] - Default topic to publish to with ibmrtc Server
 * @param {string}  [config.myTopic] - Optional myTopic, defaults to a hash from userid
 * @param {object}  [config.credentials] - Optional Credentials for mqtt server.
 *
 * @param {function} config.on  - Called when an inbound message needs
 *    'message' --> {'fromEndpointID': 'string', content: 'string'}
 * 
 * @throws {string} - Throws new Error Exception if invalid arguments.
 * 
 * @private
 */

var MqttConnection = function MqttConnection(config) {
  /* Class Globals */

  /*
   * generateClientID - Generates a random 23 byte String for clientID if not passed.
   * The main idea here is that for mqtt, our ID can only be 23 characters and contain
   * certain characters only.
   */
  var generateClientID = function(userid) {
    var validChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var stringLength = 23;
    var clientID = "";
    // otherwise, generate completely randomly.
    for (var j = stringLength-1; j>0 ; --j) {
      clientID += validChars[Math.floor(Math.random()*(validChars.length - 1))];
    }
    return clientID;
  };
  /* 
   * Create an MQTT Client 
   */
  var createMqttClient = function(config) {
    /* global Paho: false */
    /* global Paho.MQTT: false */
    /* global l: false */
    var mqtt = null;
    if (typeof Paho.MQTT === 'object') {
      l('DEBUG') && console.log('MqttConnection createMqttClient using config: ', config);
      mqtt = new Paho.MQTT.Client(config.server,config.port,config.clientID);
      /* if a connection is lost, this callback is called, reconnect */
      mqtt.onConnectionLost = function(error) {
        if (error.errorCode !== 0) { // 0 means it was on purpose.
          console.error("MqttConnection: Connection Lost... : ", error  );
        }
      };

    } else {
      throw new Error("MqttConnection depends on 'Paho.MQTT' being loaded via mqttws31.js.");
    }
    return mqtt;
  };

  var convertMessage = function convertMessage(message,myTopic) {
    var msg = { 
      content: '',
      fromEndpointID: '',
      topic: '' };

    // Content is the same
    msg.content = message.payloadString;
    var m = message.destinationName.split('/');
    // The last field should be the fromEndpointID
    msg.fromEndpointID = m[m.length-1];
    var regexMyTopic = new RegExp(myTopic);
    if (regexMyTopic.test(message.destinationName) ) {
      // Received on normal topic, set topic to null;
      msg.topic = null;
    } else {
      // Otherwise, return the original topic received on:
      //msg.topic = m.length-1 === 0 ? message.destinationName : m.slice(0,m.length-1).join('/');
      msg.topic = message.destinationName;
    }
    return msg;
  };

  // Our required properties
  this.objName = 'MqttConnection';
  this.dependencies = {};
  this.config = {};
  this.ready = false;
  this._init = false;
  this.id = null;
  // Events we can emit go here.
  this.events = {'message':[]};

  //config items that are required and must be the correct type or an error will be thrown
  var configDefinition = { 
    required: { server: 'string',port: 'number',  rtcommTopicPath: 'string'},
    optional: { credentials : 'object', myTopic: 'string', defaultTopic: 'string'},
  };
  // the configuration for MqttConnection
  if (config) {
    /* global setConfig:false */
    this.config = setConfig(config,configDefinition);
  } else {
    throw new Error("MqttConnection instantiation requires a minimum configuration: "+ JSON.stringify(configDefinition.required));
  }
  // Populate this.config
  this.config.clientID = this.config.myTopic || generateClientID();
  this.config.myTopic = this.config.myTopic || this.config.rtcommTopicPath + this.config.clientID;
  this.config.presenceTopic = this.config.presenceTopic || null;
  this.config.destinationTopic = this.config.defaultTopic ? this.config.rtcommTopicPath + this.config.defaultTopic : '';
  // Save an 'ID' for this service.
  this.id = this.config.clientID;
  this.ready = false;

  // Create our MQTT Client.
  var mqttClient = this.dependencies.mqttClient = createMqttClient(this.config);
  mqttClient.onMessageArrived = function (message) {
    l('TRACE') && console.log('MQTT Raw message, ', message);
    /* mqttMessage we emit */
    var mqttMessage= convertMessage(message,this.config.myTopic);
    try {
      l('MESSAGE') && console.log(this+' Received message: '+JSON.stringify(mqttMessage));
      this.emit('message',mqttMessage);
    } catch(e) {
      console.error('onMessageArrived callback chain failure:',e);
    }
  }.bind(this);

  // Init has be executed.
  this._init = true;
};

/* global util: false */
MqttConnection.prototype  = util.RtcommBaseObject.extend((function() {

  var createMqttMessage = function(message) {
    l('TRACE') && console.log('MqttConnection: >>>>>>>>>>>> Creating message > ', message);
    var messageToSend = null;
    if (message && typeof message === 'object') {
      messageToSend = new Paho.MQTT.Message(JSON.stringify(message));
    } else if (typeof message === 'string' ) {
      // If its just a string, we support sending it still, though no practical purpose for htis.
      messageToSend = new Paho.MQTT.Message(message);
    } else {
      // Return an empty message
      messageToSend = new Paho.MQTT.Message('');
    }
    l('TRACE') && console.log('MqttConnection: >>>>>>>>>>>> Created message > ',messageToSend);
    return messageToSend;
  };

    /** @lends module:rtcomm.connector.MqttConnection.prototype */
    return {
      /* global setLogLevel:false */
      setLogLevel: setLogLevel,
      /* global getLogLevel:false */
      getLogLevel: getLogLevel,
      /**
       * connect()
       */
      connect: function connect(options) {
        if (!this._init) {
          throw new Error('init() must be called before calling connect()');
        }
        var mqttClient = this.dependencies.mqttClient;
        var cbOnsuccess = null;
        var cbOnfailure = null;
        var willMessage = null;
        var presenceTopic = null;
        var mqttVersion = 3;
        
        l('DEBUG')&& console.log(this+'.connect() called with options: ', options);
        if (options) {
          cbOnsuccess = options.onSuccess || null;
          cbOnfailure = options.onFailure || null;
          willMessage = options.willMessage || null;
          presenceTopic = options.presenceTopic || null;
          mqttVersion = options.mqttVersion || mqttVersion;
        }

        var mqttConnectOptions = {};
        // set version to 3 for Liberty compatibility
        mqttConnectOptions.mqttVersion = mqttVersion;
        if (this.config.credentials && this.config.credentials.userName) {
          mqttConnectOptions.userName = this.config.credentials.userName;
          if (this.config.credentials.password) {
            mqttConnectOptions.password = this.config.credentials.password;
          }
        }

        if (presenceTopic ) {
          mqttConnectOptions.willMessage = createMqttMessage(willMessage);
          mqttConnectOptions.willMessage.destinationName= presenceTopic;
          mqttConnectOptions.willMessage.retained = true;
        }

        var onSuccess = cbOnsuccess || function() {
          l('DEBUG')&& console.log(this+'.connect() was successful, override for more information');
        }.bind(this);

        var onFailure = cbOnfailure || function(error) {
          l('DEBUG')&& console.log(this+'.connect() failed, override for more information', error);
        }.bind(this);

        /*
         * onSuccess Callback for mqttClient.connect
         */
        mqttConnectOptions.onSuccess = function() {
          l('DEBUG') && console.log(this + 'mqtt.onSuccess called', mqttClient);
          // Subscribe to all things on our topic.
          // This is may be where we need the WILL stuff
          l('DEBUG') && console.log(this + 'subscribing to: '+ this.config.myTopic+"/#");
          try {
            mqttClient.subscribe(this.config.myTopic+"/#");
          } catch(e) {
            // TODO:  THis failed... Do something with it differently.
            console.error('mqttConnectOptions.onSuccess Subscribe failed: ', e);
            return;
          }
          this.ready = true;
          if (onSuccess && typeof onSuccess === 'function') {
            try {
              onSuccess(this);
            } catch(e) {
              console.error('connect onSuccess Chain Failure... ', e);
            }
          } else {
            l('DEBUG') &&  console.log("No onSuccess callback... ", onSuccess);
          }
        }.bind(this);

        mqttConnectOptions.onFailure = function(response) {
          l('DEBUG') && console.log(this+'.onFailure: MqttConnection.connect.onFailure - Connection Failed... ', response);
          if (typeof onFailure === 'function') {
            // When shutting down, this might get called, catch any failures. if we were ready
            // this is unexpected.
            try {
              if (this.ready) { onFailure(response) ;}
            } catch(e) {
              console.error(e);
            }
          } else {
            console.error(response);
          }
        }.bind(this);
        mqttClient.connect(mqttConnectOptions);
      },

      subscribe : function subscribe(/* string */ topic) {
       if (topic)  {
         this.dependencies.mqttClient.subscribe(topic);
         return true;
       } else {
         return false;
       }
      },
      unsubscribe : function unsubscribe(/* string */ topic) {
        if (topic) {
         this.dependencies.mqttClient.unsubscribe(topic);
         return true;
       } else {
         return false;
       }
      },
      publish: function publish(/* string */ topic, message, /* boolean */retained) {
        l('DEBUG') && console.log(this+'.publish() Publishing message',message);
        l('DEBUG') && console.log(this+'.publish() To Topic: '+ topic);
        l('DEBUG') && console.log(this+'.publish() retained?: '+ retained);
        var messageToSend = createMqttMessage(message);
        if (messageToSend) {
          messageToSend.destinationName = topic;
          messageToSend.retained = (typeof retained === 'boolean') ? retained: false;
          this.dependencies.mqttClient.send(messageToSend);
        } else {
          l('INFO') && console.error(this+'.publish(): invalid message ');
        }
        
      },
      /**
       *  Send a Message
       *
       *  @param {object} message -  RtcMessage to send.
       *  @param {string} toTopic  - Topic to send to.  Testing Only.
       *  @param {function} onSuccess
       *  @param {function} onFailure
       *
       */
      send : function(/*object */ config ) {
        if (!this.ready) {
          throw new Error('connect() must be called before calling init()');
        }
        var message = config.message,
            toTopic  = config.toTopic,
        // onSuccess Callback
        onSuccess = config.onSuccess || function() {
          l('DEBUG')&& console.log(this+'.send was successful, override for more information');
        }.bind(this),
        // onFailure callback.
        onFailure = config.onFailure|| function(error) {
          l('DEBUG')&& console.log(this+'.send failed, override for more information', error);
        }.bind(this),
        messageToSend = createMqttMessage(message),
        mqttClient = this.dependencies.mqttClient;
        l('TRACE') && console.log(this+'.send using toTopic: '+toTopic);
        if (messageToSend) {
          messageToSend.destinationName = toTopic;
          util.whenTrue(
              /* test */ function(){
                return this.ready;
              }.bind(this),
              /* whenTrue */ function(success) {
                if (success) {
                  l('MESSAGE') && console.log(this+'.send() Sent message['+toTopic+']:',message);
                  mqttClient.send(messageToSend);
                  if (typeof onSuccess === 'function' ) {
                    try { 
                      onSuccess(null); 
                    } catch(e) { 
                      console.error('An error was thrown in the onSuccess callback chain', e);
                    }
                  }
                } else {
                  console.error('MqttConnection.send() failed - Timeout waiting for connect()');
                }
              }.bind(this), 1000);
        } else {
          l('DEBUG') && console.log(this+".send(): Nothing to send");
        }
      },
      /* cleanup */
      destroy: function() {
        this.ready = false;
        //Testin, disconnect can hang for some reason. Commenting out.
        this.dependencies.mqttClient.disconnect();
        this.dependencies.mqttClient = null;
        l('DEBUG') && console.log(this+'.destroy() called and finished');
      },
      setDefaultTopic: function(topic) {
        this.config.defaultTopic = topic;
        var r = new RegExp('^'+this.config.rtcommTopicPath);
        if (r.test(topic)) {
          this.config.destinationTopic = this.config.defaultTopic;
        } else {
          this.config.destinationTopic = this.config.rtcommTopicPath+this.config.defaultTopic;
        }
      }
    }; // end of Return
})());
exports.MqttConnection = MqttConnection;


/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 

/** 
 * A SigSession is an end to end signaling session w/ another Peer.
 * 
 * <p>
 * It is part of a WebRTCConnection and should ONLY be used via a WebRTCConnection.  It 
 * should only be created by 'EndpointConnection.createSession()'
 * <p>
 * 
 * 
 * @class
 * @memberof module:rtcomm.connector
 *
 * Arguments are in the form of a 'config' object:
 *
 * @param  {object} config 
 *
 * When created due to an INBOUND connection:
 *   
 * 
 * @private
 */
var SigSession = function SigSession(config) {
  /* Instance Properties */
  this.objName = 'SigSession';
  this.endpointconnector = null;
  this.id = null;
  this.remoteEndpointID = null;
  this.message = null;
  this.source = null;
  this.protocols = [];
  this.toTopic = null;
  this.type = 'normal'; // or refer
  this.referralDetails= null;
  this.referralTransaction = null;
  this.appContext = null;

  if (config) {
    if (config.message) {
      this.appContext = config.message.appContext || null;
      this.source = config.source || null;
      if (config.message.method === 'START_SESSION') {
        l('DEBUG') && 
          console.log(this+'.constructor - inbound message(START_SESSION) config: ', config);
        // We are INBOUND. 
        this.message = config.message;
        this.id = config.message.sigSessID;
        this.remoteEndpointID = config.fromEndpointID || null;
        this.toTopic = config.toTopic || config.message.fromTopic || null;
        this.protocols = config.message.protocols;
      } else if (config.message.method === 'REFER') {
        l('DEBUG') && 
          console.log(this+'.constructor - inbound message(REFER) config: ', config);
        // If there is a sessionID, use it...
        this.id = config.message.details.sessionID && config.message.details.sessionID;
        this.remoteEndpointID = config.message.details.toEndpointID || null;
        this.referralTransaction = config.referralTransaction;
      } else {
        l('DEBUG') && 
          console.log(this+'.constructor - inbound message(unknown) doing nothing -->  config: ', config);
      }
    } else {
      l('DEBUG') && console.log(this+'.constructor creating session from config: ', config);
      this.remoteEndpointID = config.remoteEndpointID || null;
      this.id = this.id || config.id;
      this.protocols = config.protocols || this.protocols;
      this.toTopic = this.toTopic || config.toTopic;
      this.appContext = this.appContext|| config.appContext;
    }
  }

  /* global generateUUID: false */
  this.id = this.id || generateUUID();
  l('DEBUG') && console.log(this+'.constructor creating session from config: ', config);

  this.events = {
      'starting':[],
      'started':[],
      'failed':[],
      'stopped':[],
      'message':[],
      'queued':[],
      'ice_candidate':[],
      'have_pranswer':[],
      'pranswer':[],
      'finished':[]
  };
  // Initial State
  this.state = 'stopped';

  /** The timeout we will wait for a PRANSWER indicating someone is at other end */
  this.initialTimeout = 5000; 
  /** The timeout we will wait for a ANSWER (responding to session START)*/
  this.finalTimeout = 30000; 
};

/* global util: false */
SigSession.prototype = util.RtcommBaseObject.extend((function() {
  /** @lends module:rtcomm.connector.SigSession.prototype */
  return { 
    /** 
     * Init method
     * @param config  -- message:message, localEndpointID: endpointid, toTopic: toTopic
     */
    
    _setupQueue: function _setupQueue() {
      this._messageQueue = {
          'messages': [],
          'processing': false            
      };
      
      this.on('started', this._processQueue.bind(this));
      this.on('have_pranswer', this._processQueue.bind(this));
      this.on('pranswer', this._processQueue.bind(this));
      
    },
    _processQueue : function _processQueue() {
        var q = this._messageQueue.messages;
        var processingQueue = this._messageQueue.processing;
        if (processingQueue) {
          return;
        } else {
          processingQueue = true;
          l('DEBUG') && console.log(this+'._processQueue processing queue... ', q);
          q.forEach(function(message){
            this.send(message);
          }.bind(this));
          q = [];
          processingQueue=false;
        }
      },
    /**
     * 
     * start must be called to send the first message.
     * options are:
     * 
     *  config = {remoteEndpointID: something, protocols:[]  }
     *
     */
    start : function(config) {
      if (this._startTransaction) {
        // already Started
        l('DEBUG') && console.log('SigSession.start() already started/starting');
        return;
      }
      this._setupQueue();
      /*global l:false*/
      l('DEBUG') && console.log('SigSession.start() using config: ', config);
      var remoteEndpointID = this.remoteEndpointID;
      var payload = null;
      if (config) {
        this.remoteEndpointID = remoteEndpointID = config.remoteEndpointID || remoteEndpointID;
        this.protocols = (config.protocols && config.protocols.length > 0) ? config.protocols : this.protocols;
        payload = config.payload || null;
      }
      this.state = 'starting';
      if (!remoteEndpointID) {
        throw new Error('remoteEndpointID is required in start() or SigSession() instantiation');
      }  
      /*
       * If we are new, (no message...) then we should create START and 
       *  a Transaction and send it....
       *  and establish an on('message');
       *    
       */
      if (!this.message) {
        this.message = this.createMessage('START_SESSION', payload);
        if (this.appContext) {
          this.message.appContext = this.appContext;
        }
      }
      var session_started = function(message) {
        // our session was successfully started, if Outbound session, it means we 
        // recieved a Response, if it has an Answer, we need to pass it up.
        l('DEBUG') && console.log(this+'.sessionStarted!  ', message);
        this.state = 'started';
        if (message.fromEndpointID !== this.remoteEndpointID) {
          l('DEBUG') && console.log(this+'.sessionStarted! remoteEndpointID reset:'+ message.fromEndpointID);
          this.remoteEndpointID = message.fromEndpointID;
        }
        this._startTransaction = null;
        // If we were created due to a refer, respond.
        this.referralTransaction && 
          this.referralTransaction.finish(this.endpointconnector.createResponse('REFER'));
        this.emit('started', message.payload);
      };

      var session_failed = function(message) {
        this._startTransaction = null;
        var reason = (message && message.reason) ? message.reason : 'Session Start failed for unknown reason';
        // fail the referral transaction if exists.
        if (this.referralTransaction) {
          var msg = this.endpointconnector.createResponse('REFER');
          msg.result = 'FAILURE';
          msg.reason = reason;
          this.referralTransaction.finish(msg);
        } 
        this.state = 'stopped';
        console.error('Session Start Failed: ', reason);
        this.emit('failed', reason);
      };
      this._startTransaction = this.endpointconnector.createTransaction(
          { message: this.message,
            timeout: this.initialTimeout
          },
          session_started.bind(this), 
          session_failed.bind(this));
      this._startTransaction.toTopic = this.toTopic || null;
      this._startTransaction.on('message', this.processMessage.bind(this));
      this._startTransaction.on('finished', function() {
        this._startTransaction = null;
      }.bind(this)
      );
     // this._startTransaction.listEvents();
      this._startTransaction.start();
      return this;
    },
    /*
     * Finish the 'Start'
     */
    respond : function(/* boolean */ SUCCESS, /* String */ message) {

      
      /* 
       * Generally, respond is called w/ a message, but could just be a boolean indicating success.
       * if just a message passed then default to true
       * 
       */
      if (SUCCESS && typeof SUCCESS !== 'boolean') {
        message = SUCCESS;
        SUCCESS = true;
      }
      // If SUCCESS is undefined, set it to true
      SUCCESS = (typeof SUCCESS !== 'undefined')? SUCCESS: true;

      l('DEBUG') && console.log(this+'.respond() Respond called with SUCCESS', SUCCESS);
      l('DEBUG') && console.log(this+'.respond() Respond called with message', message);
      l('DEBUG') && console.log(this+'.respond() Respond called using this', this);
      var messageToSend = null;
      if (this._startTransaction) {
        messageToSend = this.endpointconnector.createResponse('START_SESSION');
        messageToSend.transID = this._startTransaction.id;
        messageToSend.sigSessID = this.id;
        var referralResponse = this.endpointconnector.createResponse('REFER');

        if (SUCCESS) { 
          messageToSend.result = 'SUCCESS';
          messageToSend.payload = (message && message.payload)?message.payload:message;
          // If there is a referral transaction, finish it...
          this.state = 'started';
        } else {
          messageToSend.result = 'FAILURE';
          messageToSend.reason = message || "Unknown";
          referralResponse.result = 'FAILURE';
          referralResponse.reason = message || "Unknown";
          this.state = 'failed';
        }
        // Finish the transaction
        this.referralTransaction && 
          this.referralTransaction.finish(referralResponse);
        this._startTransaction.finish(messageToSend);
        this.emit(this.state);
      } else {
        // No transaction to respond to.
        console.error('NO TRANSACTION TO RESPOND TO.');
      }
    },
    /**
     * Fail the session, this is only a RESPONSE to a START_SESSION
     */
    fail: function(message) {
      l('DEBUG') && console.log(this+'.fail() Failing the START session. Reason: '+message);
      this.start();
      this.respond(false,message);
    },

    /**
     *  send a pranswer
     *  
     *  peerContent -- Message to send
     *  timeout -- in SECONDS -- timeout to wait.
     *  
     */
    pranswer : function(payload, timeout) {
      if (typeof payload=== 'number') { 
        timeout = payload;
        payload = null;
      }
      var pranswerMessage = this.createMessage('PRANSWER', payload);
      if (timeout) { 
        pranswerMessage.holdTimeout=timeout;
      }
      this.state = 'pranswer';
      this.send(pranswerMessage,timeout*1000 || this.finalTimeout);
      this.emit('pranswer');
    },

    stop : function() {
      var message = this.createMessage('STOP_SESSION');
      l('DEBUG') && console.log(this+'.stop() stopping...', message);
      this.endpointconnector.send({message:message, toTopic: this.toTopic});
      // Let's concerned persons know we are stopped
      this.state = 'stopped';
      this.emit('stopped');
      // We are 'finished' - this is used to clean us up by who created us.
      this.emit('finished');
    },

    /** 
     * Send a message, but we may care about the type, we will infer it
     * based on the content.
     * 
     */
    send :  function(message, timeout) {
      var messageToSend = null;
      if (message && message.rtcommVer && message.method) {
        // we've already been cast... just send it raw...
        messageToSend = message;
      } else {
        messageToSend = this.createMessage(message);
       // messageToSend.peerContent = message;
      }
      var transaction = this._startTransaction || null;
      var queue = !(this.state === 'started' || this.state === 'have_pranswer' || this.state === 'pranswer');
      if (queue && messageToSend.method === 'MESSAGE') {
        // Queuing message
        l('DEBUG') && console.log(this+'.send() Queueing message: ', messageToSend);
        this._messageQueue.messages.push(messageToSend);
      } else {
        if (transaction){
          l('DEBUG') && console.log(this+'.send() Sending using transaction['+transaction.id+']', messageToSend);
          // If we have a timeout update the transaction;
          timeout && transaction.setTimeout(timeout);
          transaction.send(messageToSend);
        } else {
          l('DEBUG') && console.log(this+'.send() Sending... ['+this.state+']', messageToSend);
          // There isn't a transaciton, delete transID if it is there...
          if (messageToSend.hasOwnProperty('transID')) {
            delete messageToSend.transID;
          }
          this.endpointconnector.send({message:messageToSend, toTopic: this.toTopic}); 
        }
      }
    },
    createMessage : function(messageType,payload) {
      if (typeof messageType === 'object') {
        payload = messageType;
        messageType = 'MESSAGE';
      }
      var message = this.endpointconnector.createMessage(messageType);
      message.toEndpointID = this.remoteEndpointID;
      message.sigSessID = this.id;
      message.protocols = this.protocols;

      if (payload) {
        payload = (payload.payload) ? payload.payload : payload;
      }

      if (payload && payload.type && payload.content) {
        // Its a good message, can be added to the message
        message.payload= payload;
      } 
      l('DEBUG') && console.log(this+'.createMessage() Created message: ',message);
      return message;
    },
    getState : function(){
      return this.state;
    },
    processMessage : function(message) {

      l('DEBUG') && console.log(this + '.processMessage() received message: ', message);
      // We care about the type of message here, so we will need to strip some stuff, and may just fire other events.
      // If our fromTopic is dfferent than our toTopic, then update it.

      this.toTopic = (message.fromTopic !== this.toTopic) ? message.fromTopic : this.toTopic;
      
      switch(message.method) {
      case 'PRANSWER':
        // change our state, emit content if it is there.
        // holdTimeout is in seconds, rather than milliseconds.
        l('TRACE') && console.log('PRANSWER --> '+ message.holdTimeout+"="+ (typeof message.holdTimeout === 'undefined') + " - "+this.finalTimeout);

        var timeout = (typeof message.holdTimeout === 'undefined') ? this.finalTimeout : message.holdTimeout*1000;
        l('TRACE') && console.log('PRANSWER, resetting timeout to :',timeout);
        this._startTransaction && this._startTransaction.setTimeout(timeout);

        if (message.holdTimeout || message.queuePosition) {
          // We've been Queued...
          this.state = 'queued';
          this.emit('queued', {'queuePosition': message.queuePosition, 'message': message.payload});
        } else {
          this.state = 'have_pranswer';
          this.protocols = message.protocols;
          this.emit('have_pranswer', {'protocols': this.protocols, 'payload': message.payload});
        } 
        break;
      case 'ICE_CANDIDATE':
        this.emit('ice_candidate', message.payload);
        break;
      case 'STOP_SESSION':
        this.state='stopped';
        this.emit('stopped', message.payload);
        this.emit('finished');
        break;
      case 'MESSAGE':
        l('DEBUG') && console.log('Emitting event [message]', message.payload);
        this.emit('message', message.payload);
        break;
      default:
        console.error('Unexpected Message, dropping... ', message);
      }

    }
  };
})());


/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 
/**
   * @class
   * @memberof module:rtcomm.connector
   *
   * @classdesc
   * A Transaction is a conversation that requires a response.
   * /**
   * @param options   message: message, timeout: timeout
   * @param {callback} cbSuccess called when transaction is successful 
   * @param {callback} cbFailure 
   * 
   * @event finished Emitted when complete... can also use onSuccess.
   * @event message 
   * 
   * 
   * @private
   */
var Transaction = function Transaction(options, cbSuccess, cbFailure) {
  var message, timeout, toTopic;

  this.defaultTimeout = 5000;
  if (options) {
    message = options.message || null;
    timeout = options.timeout || null;
    toTopic = options.toTopic || null;
  }
  /* Instance Properties */
  this.objName = "Transaction";
  this.events = {'message': [],
      'timeout_changed':[],
      'finished':[]};
  this.timeout = timeout || this.defaultTimeout;
  this.outbound = (message && message.transID) ? false : true;
  /*global generateUUID:false*/
  this.id = (message && message.transID) ? message.transID : generateUUID(); 
  this.method = (message && message.method) ? message.method : 'UNKNOWN'; 

  this.toTopic = toTopic || ((message && message.fromTopic) ? message.fromTopic : null);
  this.message = message;
  this.onSuccess = cbSuccess || function(object) {
    l('DEBUG') && console.log(this+' Response for Transaction received, requires callback for more information:', object);
  };
  this.onFailure = cbFailure || function(object) {
    l('DEBUG') && console.log(this+' Transaction failed, requires callback for more information:', object);
  };

  l('DEBUG') && console.log(this+ '.constructor Are we outbound?', this.outbound);
};
/*global util:false*/
Transaction.prototype = util.RtcommBaseObject.extend(
   /** @lends module:rtcomm.connector.Transaction.prototype */
    {
  /*
   *  A Transaction is something that may require a response, but CAN receive messages w/ the same transaction ID 
   *  until the RESPONSE is received closing the transaction. 
   *  
   *  The types of transactions correlate with the types of Messages with the Session being the most complicated.
   *  
   *  Transaction management... 
   *  
   *  TODO:  Inbound Starts... 
   *  
   *  
   */
  /*
   * Instance Methods
   */
  setTimeout: function(timeout)  {
    this.timeout = timeout || this.defaultTimeout;
    this.emit('timeout_changed', this.timeout);
  },
 
  getInbound: function() {
    return !(this.outbound);
  },
  /**
   * Start a transaction
   * @param [timeout] can set a timeout for the transaction
   */
  start: function(timeout) {
    /*global l:false*/
    l('TRACE') && console.log(this+'.start() Starting Transaction for ID: '+this.id);
    if (this.outbound) {
      this.message.transID = this.id;
      this.send(this.message);  
    } else {
      l('TRACE') && console.log(this+'.start() Inbound Transaction ');
    }
  },
  /**
   * send a message over the transaction
   */
  send: function(message) {
    l('TRACE') && console.log(this+'.send() sending message: '+message);
    if(message) {
      message.transID = message.transID || this.id;
      l('DEBUG') && console.log('Transaction.send() ids...'+message.transID +' this.id '+ this.id+'toTopic: '+this.toTopic);
      if (message.transID === this.id) {
        this.endpointconnector.send({message: message, toTopic:this.toTopic});
      } else {
        l('DEBUG') && console.log(this+'.send() Message is not part of our tranaction, dropping!', message);
      }
    } else {
      console.error('Transaction.send() requires a message to be passed');
    }
  },
  /**
   * Finish the transaction, message should be a RESPONSE.
   */
  finish: function(rtcommMessage) {
    // Is this message for THIS transaction?
    l('DEBUG') && console.log(this+'.finish() Finishing transction with message:',rtcommMessage);
    // if there isn't an id here, add it. 
    rtcommMessage.transID = rtcommMessage.transID || this.id;
    if (this.id === rtcommMessage.transID &&
        rtcommMessage.method === 'RESPONSE' && 
        this.method === rtcommMessage.orig) {
      if (this.outbound) {
        if (rtcommMessage.result  === 'SUCCESS' && this.onSuccess ) {
          this.onSuccess(rtcommMessage);
        } else if (rtcommMessage.result === 'FAILURE' && this.onFailure) {
          this.onFailure(rtcommMessage);
        } else {
          console.error('Unknown result for RESPONSE:', rtcommMessage);
        }
      } else {
     // If we are inbound, then send the message we have and finish the transaction
        this.send(rtcommMessage);
      }
      this.emit('finished');
    } else {
      console.error('Message not for this transaction: ', rtcommMessage);
    }
  }
});

return connection;

}));

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(["./rtcomm/connection",
      "./rtcomm/util"], function (connection, util) {
      return (root.returnExportsGlobal = factory(connection, util));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory(require("./rtcomm/connection"),
      require("./rtcomm/util"));
  } else {
        root['rtcomm'] = root['rtcomm']  || {};
        root['rtcomm']['EndpointProvider'] = factory(rtcomm.connection,
      rtcomm.util);
  }
}(this, function (connection, util) {

var BaseSessionEndpoint = function BaseSessionEndpoint(protocols) {
  // Presuming you creat an object based on this one, 
  // you must override the session event handler and
  // then augment newSession object.
  this.config = {
    protocols: protocols || null
  };
  this.dependencies = {
    endpointConnection: null,
  };
  // Private info.
  this._ = {
    referralSession: null,
    activeSession: null,
    appContext: null,
    available: true
  };
  protocols && Object.keys(protocols).forEach(function(key) {
    this.config[key] = protocols[key];
  });
};
/*globals util:false*/
/*globals l:false*/
BaseSessionEndpoint.prototype = util.RtcommBaseObject.extend((function() {
  function createSignalingSession(remoteEndpointID, context) {
    l('DEBUG') && console.log("createSignalingSession context: ", context);
    var sessid = null;
    var toTopic = null;
    if (context._.referralSession) {
      var details = context._.referralSession.referralDetails;
      sessid =  (details && details.sessionID) ? details.sessionID : null;
      remoteEndpointID =  (details && details.remoteEndpointID) ? details.remoteEndpointID : null;
      toTopic =  (details && details.toTopic) ? details.toTopic : null;
    }
    if (!remoteEndpointID) {
      throw new Error('toEndpointID must be set');
    }
    var session = context.dependencies.endpointConnection.createSession({
      id : sessid,
      toTopic : toTopic,
      remoteEndpointID: remoteEndpointID,
      appContext: context._.appContext
    });
    console.log('session: ', session);
    return session;
  }
  // Protocol Specific handling of the session content. 
  //
  function addSessionCallbacks(context, session) {
     // Define our callbacks for the session.
    session.on('pranswer', function(content){
      context._.processMessage(content);
    });
    session.on('message', function(content){
      l('DEBUG') && console.log('SigSession callback called to process content: ', content);
      context._.processMessage(content);
    });
    session.on('started', function(content){
      // Our Session is started!
      content && context._.processMessage(content);
      if (context._.referralSession) {
        context._.referralSession.respond(true);
      }
    });
    session.on('stopped', function() {
      console.log('Session Stopped');
    });
    session.on('starting', function() {
      console.log('Session Started');
    });
    session.on('failed', function(message) {
      console.log('Session FAILED');
    });
    l('DEBUG') && console.log('createSignalingSession created!', session);

   // session.listEvents();
    return true;
  }

return  {
  getAppContext:function() {return this._.appContext;},
  newSession: function(session) {
      var event = null;
      var msg = null;
      // If there is a session.appContext, it must match unless this.ignoreAppContext is set 
      if (this.ignoreAppContext || 
         (session.appContext && (session.appContext === this.getAppContext())) || 
         (typeof session.appContext === 'undefined' && session.type === 'refer')) {
        // We match appContexts (or don't care)
        if (this.available()){
          // We are available (we can mark ourselves busy to not accept the call)
          event = 'incoming';
          if (session.type === 'refer') {
            l('DEBUG') && console.log(this + '.newSession() REFER');
            event = 'refer';
          }
         // Save the session and start it.
         this._.activeSession = session;
         session.start();
         // Now, depending on the session.message (i.e its peerContent or future content) then do something. 
         //  For an inbound session, we have several scenarios:
         //
         //  1. peerContent === webrtc 
         //    -- we need to send a pranswer, create our webrtc endpoint, and 'answer'
         //
         //  2. peerContent === chat
         //    -- it is chat content, emit it out, but respond and set up the session.
         //
         if (session.message && session.message.peerContent) {
           // Emit this message, wait for something else?
           session.pranswer();
           console.log('Should send message now to someone else...');
         } else {
           session.respond();
         }
         //
         //
         // 
         //    var conn = this.dependencies.webrtcConnection = this.createConnection();
         //   conn.init({session:session});
         this.available(false);
         // this.emit(event, 'Something here...');
        } else {
          msg = 'Busy';
          l('DEBUG') && console.log(this+'.newSession() '+msg);
          session.fail('Busy');
        }
      } else {
        msg = 'Client is unable to accept a mismatched appContext: ('+session.appContext+') <> ('+this.getAppContext()+')';
        l('DEBUG') && console.log(this+'.newSession() '+msg);
        session.fail(msg);
      }
  },
    available: function(a) {
      if (a) {
        if (typeof a === 'boolean') { 
          this._.available = a;
          return a;
        } 
      } else  {
        return this._.available;
      }
    },
  connect: function(endpointid) {
    this._.activeSession = createSignalingSession(endpointid, this);
    this._.activeSession.start();
  },
  disconnect: function() {
    this._.activeSession.stop();
  },

  reject: function() {

  }
};

})());



/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @class
 * @memberof module:rtcomm
 * @classdesc
 * Provides Services to register a user and create Endpoints (RtcommEndpoints & MqttEndpoints)
 * <p>
 * This programming interface lets a JavaScript client application use 
 * a {@link module:rtcomm.RtcommEndpoint|Real Time Communication Endpoint}
 * to implement WebRTC simply. When {@link module:rtcomm.EndpointProvider|instantiated} 
 * & {@link module:rtcomm.RtcommEndpointProvider#init|initialized} the
 * EndpointProvider connects to the defined MQTT Server and subscribes to a unique topic
 * that is used to receive inbound communication.
 * <p>
 * See the example in {@link module:rtcomm.EndpointProvider#init|EndpointProvider.init()}
 * <p>
 *
 * @requires {@link mqttws31.js}
 *
 */
var EndpointProvider =  function EndpointProvider() {
  /** @lends module:rtcomm.EndpointProvider */
  /*global util:false*/
  /*global connection:false*/

  var MISSING_DEPENDENCY = "RtcommEndpointProvider Missing Dependency: ";
  if (!util) { throw new Error(MISSING_DEPENDENCY+"rtcomm.util");}
  if (!connection) { throw new Error(MISSING_DEPENDENCY+"rtcomm.connection");}

  /* Store the configuration for the object, provided during the init() */
  this.config = {};
  /* Store the dependent objects */
  this.dependencies= {};
  /* Store private information */
  this._ = {};
  // Internal objects
  /*global Queues:false*/
  this._.queues = new Queues();
  /* services supported by the EndpointConnection, populated in init()*/
  this._.services = null;
  /* Instantiate the endpoint Registry */
  /*global EndpointRegistry:false */
  this._.endpointRegistry = new EndpointRegistry();
  this._.presenceMonitor = null;
  this._.objName = "EndpointProvider";
  this._.rtcommEndpointConfig = {};

  /**
   * State of the EndpointProvider
   * @type {boolean}
   */ 
  this.ready = false;

  this.events = {
      /**
       * A new RtcommEndpoint was created from an inbound
       * @event module:rtcomm.EndpointProvider#newendpoint
       * @property {module:rtcomm.RtcommEndpoint}
       */
      'newendpoint': [],
      /**
       * The Session Queue was updated from the server
       * @event module:rtcomm.EndpointProvider#queueupdate
       * @property {module:rtcomm.Queues}
       *
       */
      'queueupdate': []};

  /** init method
   *
   *  This method is required to be called prior to doing anything else.  If init() is called w/ a userid, the
   *  userid is *automatically* registered.  If it is called w/out a userid, then the EndpointProvider is 
   *  *anonymous*.  A userid will be generated for security purposes called 'GUEST-<randomnumber>'.  This is 
   *  necessary to have a localEndpointID that can be used for MQTT security.
   *
   * @param {Object} config
   * @param {string} config.server MQTT Server
   * @param {string} [config.userid] User ID or Identity
   * @param {string} [config.appContext=rtcomm] App Context for EndpointProvider
   * @param {string} [config.port=1883] MQTT Server Port
   * @param {string} [config.managementTopicName=management] managementTopicName on rtcomm server
   * @param {string} [config.rtcommTopicPath=/rtcomm/] MQTT Path to prefix managementTopicName with and register under
   * @param {boolean} [config.createEndpoint=false] Automatically create a {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint}
   * @param {function} [onSuccess] Callback function when init is complete successfully.
   * @param {function} [onFailure] Callback funtion if a failure occurs during init
   *
   * @returns {module:rtcomm.EndpointProvider}
   *
   *
   * @example
   * var endpointProvider = new ibm.rtcomm.RtcommEndpointProvider();
   * var endpointProviderConfig = {
   *   server : 'messagesight.demos.ibm.com',
   *   userid : 'ibmAgent1@mysurance.org',
   *   rtcommTopicPath : '/rtcomm/',
   *   port : 1883,
   *   createEndpoint : true,
   *   credentials : null
   * };
   *
   * // Initialize the Service. [Using onSuccess/onFailure callbacks]
   * // This initializes the MQTT layer and enables inbound Communication.
   * var rtcommEndpoint = null;
   * endpointProvider.init(endpointProviderConfig,
   *    function(object) { //onSuccess
   *        console.log('init was successful, rtcommEndpoint: ', object);
   *        rtcommEndpoint = object;
   *    },
   *    function(error) { //onFailure
   *       console.error('init failed: ', error);
   *      }
   * );
   *
   */
  this.init = function init(options, cbSuccess, cbFailure) {
    // You can only be init'd 1 time, without destroying reconnecting.
    //if (this.ready) {
    //  l('INFO') && console.log('EndpointProvider.init() has been called and the object is READY');
    //  return this;
    //}
    // Used to set up config for endpoint connection;
    var config = null;
    var rtcommTopicPath = '/rtcomm/';
    var configDefinition = {
        required: { server: 'string', port: 'number'},
        optional: {
          credentials : 'object',
          rtcommTopicPath: 'string',
          managementTopicName: 'string',
          presence: 'object',
          userid: 'string',
          createEndpoint: 'boolean',
          appContext: 'string'},
        defaults: {
          rtcommTopicPath: rtcommTopicPath,
          managementTopicName: 'management',
          presence: { 
            // Relative to the rtcommTopicPath
            rootTopic: 'sphere/',
            topic: '/', // Same as rootTopic by default
          },
          appContext: 'rtcomm',
          port: 1883,
          createEndpoint: false }
      };
    // the configuration for Endpoint Provider
    if (options) {
      // Set any defaults
      // appContext/presence/userid may already be set, have to save them.
      var appContext = (this.config && this.config.appContext) ? this.config.appContext : null;
      var userid = (this.config && this.config.userid) ? this.config.userid : null;
      var presence = (this.config && this.config.presence) ? this.config.presence: null;

      /* global setConfig:false */
      config = this.config = setConfig(options,configDefinition);
      // If we are READY (we are resetting) so use the NEW ones... otherwise, use saved ones.
      this.config.appContext = (this.ready) ? this.config.appContext : appContext || this.config.appContext ; 
      this.setUserID((this.ready) ? this.config.userid: userid || this.config.userid, true) ; 
    } else {
      throw new Error("EndpointProvider initialization requires a minimum configuration: "+ 
                      JSON.stringify(configDefinition.required));
    }
    var endpointProvider = this;
    cbSuccess = cbSuccess || function(message) {
      l('DEBUG') && console.log(endpointProvider+'.init() Default Success message, use callback to process:', message);
    };
    cbFailure = cbFailure || function(error) {
      l('DEBUG') && console.log(endpointProvider+'.init() Default Failure message, use callback to process:', error);
    };

    // Create the Endpoint Connection  
    l('DEBUG') && console.log(this+'.init() Using config ', config);

    var connectionConfig =  util.makeCopy(config);
    // everything else is the same config.
    connectionConfig.hasOwnProperty('createEndpoint') &&  delete connectionConfig.createEndpoint;
    connectionConfig.publishPresence = true;
    // createEndpointConnection

    if (this.ready) {
      // we are init'd already. Re-init
      l('DEBUG') && console.log(this+'.init() Re-initializing with a new connection');
      if (this.dependencies.endpointConnection) {
        this.dependencies.endpointConnection.destroy();
      }
    }
    var endpointConnection = 
      this.dependencies.endpointConnection = 
      createEndpointConnection.call(this, connectionConfig);
    /*
     * onSuccess callback for endpointConnection.connect();
     */
    var onSuccess = function(message) {
      l('DEBUG') && console.log(endpointProvider+'.onSuccess() called ');
      var returnObj = {
          'ready': true,
          'endpoint': null,
          'registered': false
      };
      this.ready = true;
      /*
       * Depending on the configuration, the init() can do some different things
       * if there is a userid, we register.
       */
      if (config.createEndpoint) {
        returnObj.endpoint  = endpointProvider.createRtcommEndpoint();
      }

      if (config.userid) {
        l('DEBUG') && 
          console.log(endpointProvider+'.init() publishing presence: '+ config.userid+'|'+config.appContext);
        endpointProvider.publishPresence();
       // endpointProvider.setUserID(config.userid);
        returnObj.registered = true;
      }
      // Attach endpointConnection if a presenceMonitor
      if (endpointProvider._.presenceMonitor) {
         endpointProvider._.presenceMonitor.setEndpointConnection(endpointConnection);
      }
      // Update the userid
      endpointProvider.setUserID(config.userid,true);
      endpointConnection.serviceQuery();
      cbSuccess(returnObj);
    };
    /*
     * onFailure for EndpointConnection.connect()
     */
    var onFailure = function(error) {
      this.ready = false;
      cbFailure(error);
    };
    // Connect!
    endpointConnection.connect(onSuccess.bind(this), onFailure.bind(this));
    // Return ourself for chaining.
    return this;
  };  // End of RtcommEndpointProvider.init()

  this.stop = this.destroy;
  this.start = this.init;

  /*
   * Create the endpoint connection to the MQTT Server
   * // bind endpointProvider as this when called
   */
  var createEndpointConnection = function createEndpointConnection(config) {

    var endpointProvider = this;
    var endpointConnection = new connection.EndpointConnection(config);

    // If we already h some enpdoints, their connection will be null, fix it
    if (this._.endpointRegistry.length() > 0 ) {
      this._.endpointRegistry.list().forEach(function(endpoint) {
        endpoint.setEndpointConnection(endpointConnection);
      });
    }
    // Propogate our loglevel
    //
    endpointConnection.setLogLevel(getLogLevel());

    endpointConnection.on('servicesupdate', function(services) {
      endpointProvider._.services = services;
      endpointProvider.updateQueues();
    });

    endpointConnection.on('newsession', function(session) {
      /*
       * What to do on an inbound request.
       * Options:
       *  Do we have a default endpoint?  if so, just give the session to it.
       *  if that endpoint is busy, create a new endpoint and emit it.
       *  If there isn't a endpoint, create a Endpoint and EMIT it.
       *
       */
      if(session) {
        l('DEBUG') && console.log(endpointProvider+'-on.newsession Handle a new incoming session: ', session);
        // Send it to the same id/appContext;
        //
        l('DEBUG') && console.log(endpointProvider+'-on.newsession endpointRegistry: ', endpointProvider._.endpointRegistry.list());
        var endpoint = endpointProvider._.endpointRegistry.getOneAvailable(); 
        if (endpoint) {
          l('DEBUG') && console.log(endpointProvider+'-on.newsession giving session to Existing Endpoint: ', endpoint);
          endpoint.newSession(session);
        } else if (endpointProvider.hasEventListener('newendpoint'))  {
          // create an endpoint and send it to the listener.
          endpoint = endpointProvider.getRtcommEndpoint();
          l('DEBUG') && console.log(endpointProvider+'-on.newsession Created a NEW endpoint for session: ', endpoint);
          endpoint.newSession(session);
          endpointProvider.emit('newendpoint', endpoint);
        } else {
          // If there is no 'newendpoint' listener, we really only support 1 endpoint.  pass it to that one,
          // it will need to respond if its busy.
          var endpoints = endpointProvider._.endpointRegistry.list();
          if (endpoints.length > 1) {
            // Fail the session, we don't know where to send it.
            session.start();
            session.fail('Unable to accept inbound call: Busy');
            console.error(endpointProvider+
            '-on.newsession - Rejecting session, ambiguous enpdoint selection; add newendpoint callback? ');
          } else {
            // Do not emit anything... 
            endpoints[0].newSession(session);
          }
        }
      } else {
        console.error(endpointProvider+'-on.newsession - expected a session object to be passed.');
      }
    });

    endpointConnection.on('message', function(message) {
      if(message) {
        l('TRACE') && console.log("TODO:  Handle an incoming message ", message);
      }
    });
    return endpointConnection; 
  }; // End of createEndpointConnection

  /**
   * Pre-define RtcommEndpoint configuration.  This provides the means to create a common
   * configuration all RtcommEndpoints will use, including the same event handlers.  
   *
   * *NOTE* This should be set PRIOR to calling getRtcommEndpoint()
   *
   *  @param {Object}  [config] 
   *  @param {boolean} [config.webrtc=true] Support audio in the PeerConnection - defaults to true
   *  @param {boolean} [config.chat=true] Support video in the PeerConnection - defaults to true
   *  @param {object}  [config.broadcast]   
   *  @param {boolean}  [config.broadcast.audio]  Endpoint should broadcast Audio
   *  @param {boolean}  [config.broadcast.video]  Endpoint should broadcast Video
   *  @param {function} [config.event] Events are defined in {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint}
   *
   * @example
   *
   * endpointProvider.setRtcommEndpointConfig({
   *   webrtc: true,
   *   chat: true,
   *   broadcast: { audio: true, video: true},
   *   'session:started': function(event) {
   *
   *   }, 
   *   'session:alerting': function(event) {
   *
   *   }
   *   });
   */
  this.setRtcommEndpointConfig = function setRtcommEndpointCallbacks(options) {
    this._.rtcommEndpointConfig = util.combineObjects(options, this._.rtcommEndpointConfig);
  };
  /** 
   *  Factory method that returns a RtcommEndpoint object to be used by a UI component.
   *  <p>
   *  The RtcommEndpoint object provides an interface for the UI Developer to attach 
   *  Video and Audio input/output. Essentially mapping a broadcast stream(a MediaStream 
   *  that is intended to be sent) to a RTCPeerConnection output stream.   When an inbound 
   *  stream is added to a RTCPeerConnection, then the RtcommEndpoint object also informs the
   *  RTCPeerConnection where to send that stream in the User Interface.
   *  </p>
   *
   *  @param {Object}  [config] 
   *  @param {boolean} [config.webrtc=true] Support audio in the PeerConnection - defaults to true
   *  @param {boolean} [config.chat=true] Support video in the PeerConnection - defaults to true
   *
   *  @returns {module:rtcomm.RtcommEndpoint} RtcommEndpoint 
   *  @throws Error
   *
   * @example
   *  var endpointProvider = new rtcomm.EndpointProvider();
   *  var endpointConfig = {
   *    chat: true,
   *    webrtc: true,
   *    };
   *  endpointProvider.getRtcommEndpoint(endpointConfig);
   *
   */
  this.getRtcommEndpoint = function getRtcommEndpoint(endpointConfig) {
    var endpointProvider = this;
    var endpointid = null;
    var endpoint = null;
    var defaultConfig = {
        chat: true,
        webrtc: true,
        parent:this
    };
    var objConfig = defaultConfig;
    // if there is a config defined...
    if (this._.rtcommEndpointConfig) {
      objConfig.chat = (typeof this._.rtcommEndpointConfig.chat === 'boolean') ? 
        this._.rtcommEndpointConfig.chat : objConfig.chat;
      objConfig.webrtc = (typeof this._.rtcommEndpointConfig.webrtc === 'boolean') ? 
        this._.rtcommEndpointConfig.webrtc : objConfig.webrtc;
    }

    if (typeof this.config.appContext === 'undefined') {
      throw new Error('Unable to create an Endpoint without appContext set on EndpointProvider');
    }
    if(endpointConfig && typeof endpointConfig !== 'object') {
      endpointid = endpointConfig;
      l('DEBUG') && console.log(this+'.getRtcommEndpoint() Looking for endpoint: '+endpointid);
      // Returns an array of 1 endpoint. 
      endpoint = this._.endpointRegistry.get(endpointid)[0];
      l('DEBUG') && console.log(this+'.getRtcommEndpoint() found endpoint: ',endpoint);
    } else {
      applyConfig(endpointConfig, objConfig);
      objConfig.appContext = this.config.appContext;
      objConfig.userid = this.config.userid;
      l('DEBUG') && console.log(this+'.getRtcommEndpoint using config: ', objConfig);
      endpoint = new RtcommEndpoint(objConfig);
      this.dependencies.endpointConnection && endpoint.setEndpointConnection(this.dependencies.endpointConnection);
//      endpoint.init(objConfig);
      endpoint.on('destroyed', function(event_object) {
        endpointProvider._.endpointRegistry.remove(event_object.endpoint);
      });
      // If we have any callbacks defined:
      //
      if (this._.rtcommEndpointConfig) {
        Object.keys(this._.rtcommEndpointConfig).forEach(function(key){
          try {
            if (typeof endpointProvider._.rtcommEndpointConfig[key] === 'function') {
              endpoint.on(key, endpointProvider._.rtcommEndpointConfig[key]);
            } 
          } catch (e) {
            console.error(e);
            console.error('Invalid event in rtcommEndpointConfig: '+key);
          }
        });
      }
      // If broadcast needs to be set
      if(this._.rtcommEndpointConfig.broadcast) {
        endpoint.webrtc && endpoint.webrtc.setBroadcast(this._.rtcommEndpointConfig.broadcast);
      }
      // Add to registry or return the one already there
      endpoint = this._.endpointRegistry.add(endpoint);
      l('DEBUG') && console.log('ENDPOINT REGISTRY: ', this._.endpointRegistry.list());
    }
    return endpoint;
  };
  /* deprecated */
  this.createRtcommEndpoint = this.getRtcommEndpoint;

  /** Create Mqtt Endpoint 
   * @returns {module:rtcomm.MqttEndpoint} */
  this.getMqttEndpoint = function() {
    return new MqttEndpoint({connection: this.dependencies.endpointConnection});
  };

  /** 
   * Get the PresenceMonitor Object 
   *
   * This object is used to add topics to monitor for presence. 
   *
   * @returns {module:rtcomm.PresenceMonitor}
   */
  this.getPresenceMonitor= function(topic) {
    this._.presenceMonitor  = this._.presenceMonitor || new PresenceMonitor({connection: this.dependencies.endpointConnection});
    if (this.ready) {
      topic && this._.presenceMonitor.add(topic);
    } 
    return this._.presenceMonitor;
  };
  /** 
   * Destroy all endpoints and cleanup the endpointProvider.
   */
  this.destroy = function() {
    this.leaveAllQueues();
    this.clearEventListeners();
    // Clear callbacks
    this._.endpointRegistry.destroy();
    this._.presenceMonitor && this._.presenceMonitor.destroy();
    this._.presenceMonitor = null;
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointRegistry');
    this.dependencies.endpointConnection && this.dependencies.endpointConnection.destroy();
    this.dependencies.endpointConnection = null;
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointConnection');
    this.ready = false;
    
  };

  /**
   * Set the AppContext. 
   *
   * It is necessary to call setAppContext() prior to getRtcommEndpoint() if
   * init() has not been called
   * 
   * @returns {module:rtcomm.EndpointProvider} EndpointProvider object
   * @throws {Error} Cannot change appContext once init'd
   */

  this.setAppContext = function(context) {
    if (!this.ready) {
      l('DEBUG') && console.log(this+'.setAppContext() Setting appContext to: '+context);
      this.config.appContext = context;
      return this;
    } else {
      throw new Error ('Cannot change appContext once inited, using appContext: ', this.config.appContext);
    }
  };

  /*
   * Set the userId -- generally used prior to init.
   * cannot overwrite an existing ID, but will propogate to endpoints.
   *
   * If we are anonymous, can update the userid
   */
  this.setUserID = function(userid,force) {
    // If we are READY we can only do this when true.
    if (!this.ready || (this.ready && force) || /^GUEST/.test(this.config.userid)) {
      l('DEBUG') && console.log(this+'.setUserID() called with: '+userid);
      userid = (this.getEndpointConnection()) ? this.getEndpointConnection().setUserID(userid):userid;
      l('DEBUG') && console.log(this+'.setUserID() Set userid to: '+userid);
      this.config.userid = this._.id = userid;
      // update the endpoints
      this._.endpointRegistry.list().forEach(function(endpoint){
        endpoint.setUserID(userid);
      });
      l('DEBUG') && console.log(this+'.setUserID() Set userid to: '+userid);
    } else {
      throw new Error('Cannot change UserID in this state');
    }
    return this;
  };
  /**
   * Make your presence available
   *
   * @param {object} presenceConfig 
   * @param {string} presenceConfig.state One of 'available', 'unavailable', 'away', 'busy'
   * @param {string} presenceConfig.alias An alias to be associated with the presence record
   * @param {array} presenceConfig.userDefines  Array of userdefined objects associated w/ presence
   *
   */
  this.publishPresence = function(presenceConfig) {
    // Possible states for presence
    var states = {
      'available': 'available',
      'unavailable': 'unavailable',
      'busy':'busy' 
    };
    // Always default to available
    var state = (presenceConfig && presenceConfig.state) ?
      states[presenceConfig.state.trim()] || 'available' : 
      'available';
    presenceConfig = presenceConfig || {};
    presenceConfig.state = state;
    // build a message, publish it as retained.
    var doc = this.getEndpointConnection().createPresenceDocument(presenceConfig);
    this.getEndpointConnection().publishPresence(doc);
    return this;
  };
  /**
   * Update queues from server
   * @fires module:rtcomm.EndpointProvider#queueupdate
   */
  this.updateQueues= function updateQueues() {
    this._.queues.add((this._.services && 
                     this._.services.RTCOMM_CALL_QUEUE_SERVICE && 
                     this._.services.RTCOMM_CALL_QUEUE_SERVICE.queues) ||
                     []);
    this.emit('queueupdate', this._.queues.all());
    l('DEBUG') && console.log(this+'.updateQueues() QUEUES: ',this._.queues.list());
  };
  /**
   * Join a Session Queue
   * <p>
   * A Session Queue is a subscription to a Shared Topic.  By joining a queue, it enables
   * the all RtcommEndpoints to be 'available' to receive an inbound request from the queue topic.
   * Generally, this could be used for an Agent scenario where many endpoints have joined the 
   * queue, but only 1 endpoint will receive the inbound request.  
   * </p>
   *
   * @param {string} queueid Id of a queue to join.
   * @returns {boolean} Queue Join successful
   *
   * @throws {Error} Unable to find Queue specified
   *
   */
  this.joinQueue= function joinQueue(/*String*/ queueid, /*object*/ options) {
  // Is queue a valid queuename?
    var endpointProvider = this;
    // No more callback
    var q = this._.queues.get(queueid);
    l('DEBUG') && console.log(this+'.joinQueue() Looking for queueid:'+queueid);
    if (q) {
      // Queue Exists... Join it
      // This callback is how inbound messages (that are NOT START_SESSION would be received)
      q.active = true;
      q.callback = null;
      q.autoPause = (options && options.autoPause) || false;
      q.regex = this.dependencies.endpointConnection.subscribe(q.topic);
      return true;
    } else {
      throw new Error('Unable to find queue('+queueid+') available queues: '+ this._.queues.list());
    }
  };
  /**
   * Leave a queue
   * @param {string} queueid Id of a queue to leave.
   */
  this.leaveQueue= function leaveQueue(queueid) {
    var q = this._.queues.get(queueid);
    if (q && !q.active) {
      l('DEBUG') && console.log(this+'.leaveQueue() - Not Active,  cannot leave.');
      return true;
    }
    if (q) {
     q.active = false;
     this.dependencies.endpointConnection.unsubscribe(q.topic);
     l('DEBUG') && console.log(this+ '.leaveQueue() left queue: '+queueid);
     return true;
    } else {
      console.error(this+'.leaveQueue() Queue not found: '+queueid);
      return false;
    }
  };

  /**
   * Leave all queues currently joined
   */
  this.leaveAllQueues = function() {
    var self = this;
    this.listQueues().forEach(function(queue) {
      self.leaveQueue(queue);
    });
  };
  /**
   * List Available Session Queues
   *
   * @returns {object} Object keyed on QueueID. The value is a Queue Object
   * that can be used to determine is the queue is active or not.
   *
   */
  this.getAllQueues = function() {
    return  this._.queues.all();
  };

  this.listQueues = function() {
    return  this._.queues.list();
  };

  /** Return the userID the EndpointProvider is using */
  this.getUserID= function() {
    return  this.config.userid;
  };
  /** Return the endpointConnection the EndpointProvider is using */
  this.getEndpointConnection = function() {
    return this.dependencies.endpointConnection;
  };

  /** Set LogLevel 
   *  @method
   *  @param {string} INFO, MESSAGE, DEBUG, TRACE
   */
  this.setLogLevel = setLogLevel;

  /** Return  LogLevel 
   * @method
   *  @returns {string} INFO, MESSAGE, DEBUG, TRACE
   */
  this.getLogLevel = getLogLevel;

  /** Array of {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint} objects that 
   * are associated with this  EndpointProvider
   *  @returns {Array} Array of {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint} 
   */
  this.endpoints = function() {
    return this._.endpointRegistry.list();
  };
  /** Return object indicating state of EndpointProvider 
   *  *NOTE* Generally used for debugging purposes 
  */
  this.currentState = function() {
    return {
      'ready': this.ready,
      'events': this.events,
      'dependencies':  this.dependencies,
      'private':  this._,
      'config' : this.config,
      'queues': this.getAllQueues(),
      'endpointRegistry': this._.endpointRegistry.list()
    };

  };
}; // end of constructor

EndpointProvider.prototype = util.RtcommBaseObject.extend({});

/*
 * This is a private EndpointRegistry object that 
 * can be used to manage endpoints.
 *
 * We create an object like:  { 'appContext'}: { uuid1: Endpoint1,
 *                                               uuid2: Endpoint2}
 */

/* global l:false */

var EndpointRegistry = function EndpointRegistry(options) {
  var singleEndpoint = (options && options.singleEndpoint) ? options.singleEndpoint : false;
  // {options.singleEndpoint = true}  There can only be 1 endpoint per context.
  //
  var registry = {};
  // used to search for endpoints by these values.
  var properties = [];
  /* get an endpoint based on a key
   *  if it is ambiguous, return them all in an Array.
   */
  function get(key) {
    var a = [];
    // Key should be an ID
    if (key) {
      a = findByProperty('id', key);
    } else {
      // create a list of all endpoints.
      a = this.list();
    }
    return a;
  }

  function getOneAvailable() {
    var a = [];
    this.list().forEach(function(item){
      item.available() && a.push(item);
    });
    // Return the last one found
    if(a.length > 0 ) { 
      return a[a.length-1];
    } else {
      return null;
    }
  }

  // Return array of all enpdoints that match the query
  function findByProperty(property, value) {
    if (properties.indexOf(property) > -1) {
      // Two special cases - property is id or appContext:
      var a = [];
      switch(property) {
        case 'appContext':
          if (registry.hasOwnProperty(value)) {
            Object.keys(registry[value]).forEach(function(key){
              a.push(registry[value][key]);
            });
          }
          break;
       case 'id' :
         Object.keys(registry).forEach(function(appContext){
           if (registry[appContext].hasOwnProperty(value)) {
             a.push(registry[appContext][value]);
           }
         });
         break;
       default:
         this.list().forEach(function(obj) {
           if (obj.hasOwnProperty(property) && obj[property] === value ){
             a.push(obj);
           }
         });
         break;
      }
      return a;
    } else {
      l('DEBUG') && console.log('EndpointRegistry.findByProperty '+property+' not valid ');
      return []; 
    }
  }
  /* add an endpoint, if a key for that 
   * endpoint already exists, return it.
   * Otherwise, return null if nothing passed
   */
  function add(object) {
    var appContext  =  null;
    var uuid =  null;
    if (object) {
      properties = Object.keys(object);
      appContext= object.appContext;
      uuid = object.id;
      if (registry.hasOwnProperty(appContext)) {
        var eps = Object.keys(registry[appContext]);
        if (eps.length === 1 && singleEndpoint) {
          return registry[appContext][eps[0]];
        } else {
          registry[appContext][uuid] = object;
          return registry[appContext][uuid];
        }
      } else {
        // Create context, add endpoint
        registry[appContext] = {};
        registry[appContext][uuid] = object;
        return registry[appContext][uuid];
      }
    } else {
      return null;
    }
  }
  /*
   * Remove an object from the registry
   */
  function remove(object) {
    var key = null;
    var uuid = null;
    if (object && list().length > 0 ) {
      key = object.appContext;
      uuid = object.id;
      l('DEBUG') && console.log('EndpointRegistry.remove() Trying to remove object', object);
      if (registry.hasOwnProperty(key) ) {
        if (registry[key].hasOwnProperty(uuid)) {
           delete registry[key][uuid];
           // If this was the last entry in the appContext, delete it too.
           if (Object.keys(registry[key]).length === 0 ) {
             delete registry[key];
           }
           return true;
        } else {
          l('DEBUG') && console.log('EndpointRegistry.remove() object not found', list());
          return false;
        }
      } else {
        l('DEBUG') && console.log('EndpointRegistry.remove() object not found', list());
        return false;
      }
    } else {
      return false;
    }
  }
  /*
   * Destroy the registry and all objects in it
   *  calls .destroy() on contained objects if
   *  they have that method
   */
  function destroy() {
    // call destroy on all objects, remove them.
    list().forEach(function(obj){
        if (typeof obj.destroy === 'function') {
          obj.destroy();
        }
        remove(obj);
     });
  }

  function length() {
    return this.list().length;
  }

  /*
   * return the registry object for perusal.
   */
  function list() {
    var a = [];
    Object.keys(registry).forEach(function(appContext){
      Object.keys(registry[appContext]).forEach(function(uuid){
        a.push(registry[appContext][uuid]);
      });
    });
    return a;
  }

  return {
    add: add,
    get: get,
    getOneAvailable: getOneAvailable,
    findByProperty: findByProperty,
    remove: remove,
    destroy: destroy,
    length: length,
    list: list
  };

};

/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/ 
// rtcservice & util should be defined here:
/*jshint -W030*/
/*global util:false*/
var logging = new util.Log(),
    setLogLevel = logging.s,
    getLogLevel = logging.g,
    l = logging.l,
    generateUUID = util.generateUUID,    
    generateRandomBytes = util.generateRandomBytes,    
    validateConfig = util.validateConfig,
    applyConfig = util.applyConfig,
    setConfig = util.setConfig,
    /*global log: false */
    log = logging.log;

var MqttEndpoint = function MqttEndpoint(config) {

  this.dependencies = { 
    connection: null,
  };
  /* Object storing subscriptions */
  this.subscriptions = {};
  this.dependencies.connection = config && config.connection;
  this.events = {'message': []};
};
/*global util:false*/
MqttEndpoint.prototype = util.RtcommBaseObject.extend({
  subscribe: function(topic) {
               // Add it
               this.subscriptions[topic] = null;
               var mqttEP = this;
               mqttEP.dependencies.connection.subscribe(topic, function(message) {
                 l('DEBUG') && console.log('MqttEndpoint.subscribe() Received message['+message+'] on topic: '+topic);
                 mqttEP.emit('message', message);
               });
             },

  unsubscribe: function(topic) {
               var mqttEP = this;
               if (this.subscriptions.hasOwnProperty(topic)) {
                 delete this.subscriptions[topic];
                 mqttEP.dependencies.connection.unsubscribe(topic);
               } else {
                 throw new Error("Topic not found:"+topic);
               }
             },
  publish: function(topic,message) {
             this.dependencies.connection.publish(topic, message);
  },
  destroy: function() {
     l('DEBUG') &&  console.log('Destroying mqtt(unsubscribing everything... ');
             var mqttEP = this;
             Object.keys(this.subscriptions).forEach( function(key) {
               mqttEP.unsubscribe(key);
             });
           }
});

 /*
 *useCordova  Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var PhoneRTCConnection = (function invocation() {

  /**
   * @memberof module:rtcomm.RtcommEndpoint
   *
   * @description 
   * A PhoneRTCConnection is a connection is a shim to the cordova.phonertc plugin
   *  @constructor
   *
   *  @extends  module:rtcomm.util.RtcommBaseObject
   */
  var PhoneRTCConnection = function PhoneRTCConnection(parent) {

    this.config = {
      RTCConfiguration : {iceTransports : "all"},
      RTCOfferConstraints: null,
      RTCConstraints : {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]},
      iceServers: [],
      mediaIn: null,
      mediaOut: null,
      broadcast: {
        audio: true,
        video: true 
      }
    };
    // TODO:  Throw error if no parent.
    this.dependencies = {
      parent: parent || null
    };

    this._ = {
      state: 'disconnected',
      objName:'PhoneRTCConnection',
      parentConnected : false,
      enabled : false
    };
    // Note, this may be a problem... 
    // Needs to be cordova.plugins.phonertc in other apps...
    if (typeof phonertc !== 'undefined') {
      console.log('phonertc is: ', phonertc);
      this._.phonertc = phonertc; 
    } else if (typeof cordova !== 'undefined') {
      console.log('phonertc is: ', cordova.plugins.phonertc);
      this._.phonertc = cordova.plugins.phonertc; 
    } else {
      console.error('UNABLE TO FIND phonertc!');
    }
    this.id = parent.id;
    // Required to emit.
    this.events = {
      'alerting': [],
      'ringing': [],
      'trying': [],
      'connected': [],
      'disconnected': []
    };
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;
  };

  /*global util:false*/

  PhoneRTCConnection.prototype = util.RtcommBaseObject.extend((function() {
    /** @lends module:rtcomm.RtcommEndpoint.PhoneRTCConnection.prototype */
    return {
      /**
       * enable webrtc
       * <p>
       * When enable() is called, if we are connected we will initiate a webrtc connection (generate offer)
       * Otherwise, call enable() prior to connect and when connect occurs it will do what is enabled...
       * </p>
       *
       * @param {object} [config]
       *
       * @param {object} [config.mediaIn]  UI component to attach inbound media stream
       * @param {object} [config.mediaOut] UI Component to attach outbound media stream
       * @param {object} [config.broadcast] 
       * @param {boolean} [config.broadcast.audio] Broadcast Audio
       * @param {boolean} [config.broadcast.video] Broadcast Video
       * @param {object} [config.RTCOfferConstraints] RTCPeerConnection specific config {@link http://w3c.github.io/webrtc-pc/} 
       * @param {object} [config.RTCConfiguration] RTCPeerConnection specific {@link http://w3c.github.io/webrtc-pc/} 
       * @param {object} [config.RTCConfiguration.peerIdentity] 
       * @param {boolean} [config.lazyAV=true]  Enable AV lazily [upon connect/accept] rather than during
       * right away
       * @param {boolean} [config.connect=true] Internal, do not use.
       *
       **/
      enable: function(config,callback) {
        if (config) {
          if (typeof config === 'function') {
            callback = config;
          }
        }
        l('DEBUG') && console.log(this+'.enable() called...');
        this._.enabled = true;
        callback && callback(true);
        //TODO:  If connected, call _connect
        return this;
      },
      /** disable webrtc 
       * Disconnect and reset
       */
      disable: function() {
        this.onEnabledMessage = null;
        this._.enabled = false;
        this._disconnect();
        if (this._.phonertc) {
          this._.phonertc = null;
        }
        return this;
      },
      /**
       * PhoneRTCConnection is enabled
       * @returns {boolean}
       */
      enabled: function() {
        return this._.enabled;
      },
      /*
       * Called to 'connect' (Send message, change state)
       * Only works if enabled.
       *
       */
      _connect: function(sendMethod,callback) {
        var self = this;
        l('DEBUG') && console.log(self+'._connect() called!' );
        sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
        callback = callback ||function(success, message) {
          l('DEBUG') && console.log(self+'._connect() default callback(success='+success+',message='+message);
        };
        if (this._.enabled) {
          this._setState('trying');
          createPhoneRTCSession(true,this).call();
          return true;
        } else {
          return false;
        } 
      },

      _disconnect: function() {
        this._.pSession && this._.pSession.close();
        if (this.getState() !== 'disconnected' && this.getState() !== 'alerting') {
          this._setState('disconnected');
        }
        return this;
      },

      /**
       * Accept an inbound connection
       */
      accept: function(options) {
        var self = this;
        l('DEBUG') && console.log(this+'.accept() -- accepting --');
        if (this.getState() === 'alerting') {
          // We need to receive this now. 
          if (this._.offer) {
            self._.pSession.receiveMessage(self._.offer);
            delete self._.offer;
            this._setState('connected');
            return true;
          } else {
            l('DEBUG') && console.log(this+'.accept() -- No Offer to receive --');
          }
        } else {
          return false;
        }
      },
      /** reject an inbound connection */
      reject: function() {
        this._disconnect();
      },
      send: function(message) {
        l('DEBUG') && console.log('Trying to send message: ', message);
        var parent = this.dependencies.parent;
        var session = parent._.activeSession;
        var sendMethod = null;

        if (session) { 
          // Validate message?
          message = this.createMessage(message);
          switch(message.content.type) {
            case 'offer': 
              if (session.getState() === 'stopped') {
                 sendMethod = session.start.bind(session);
              }
              break;
            case 'answer':
              if (session.getState() === 'pranswer') {
                 // Actually need to respond.
                 sendMethod = session.respond.bind(session);
              }
              break;
            case 'candidate':

              // Our 'in' message to send here looks like:
              //  { type: candidate,
              //    candidate: 'candidate:asbdsadf asdfasdf asdf sad fsdf',
              //    label: sdpMLineIndex;
              //    id: sdpMid
              // Need to change back to 'normal'
              //
              // Transform the message
              message.content.type = 'icecandidate';
              var newCandidate = {
                candidate: message.content.candidate,
                sdpMLineIndex: message.content.label,
                sdpMid: message.content.id
              }
              delete message.content.label;
              delete message.content.id;
              message.content.candidate = newCandidate;
              sendMethod = session.send.bind(session);
              break;
            case 'bye':
              console.log('phonertc.bye - doing not sending');
              break;
            default:
              sendMethod = session.send.bind(session);
          }
          console.log('sendMethod', message);
          sendMethod({payload: message});
        } else {
          console.log('No session for send method, dropping message', message);
        }
      },

      /** State of the WebRTC, matches an event */
      getState: function() {
        return this._.state;
      },
      _setState: function(state) {
        l('DEBUG') && console.log(this+'._setState to '+state);
        this._.state = state;
        var event = state;
        l('DEBUG') && console.log(this+'._setState emitting event '+event);
        this.emit(event);
      },

      broadcastReady: function broadcastReady() {
        if (( this.config.broadcast.audio || this.config.broadcast.video) && (typeof this._.localStream === 'object')) {
          return true;
          // if we have neither, we are still 'ready'
        } else if (this.config.broadcast.audio === false  && this.config.broadcast.video === false) {
          return true;
        } else {
          return false;
        }
      },
      /** configure broadcast 
       *  @param {object} broadcast 
       *  @param {boolean} broadcast.audio
       *  @param {boolean} broadcast.video
       */
      setBroadcast : function setBroadcast(broadcast) {
        this.config.broadcast.audio = (broadcast.hasOwnProperty('audio') && 
                                       typeof broadcast.audio === 'boolean') ? 
                                        broadcast.audio :
                                        this.config.broadcast.audio;
        this.config.broadcast.video= (broadcast.hasOwnProperty('video') && 
                                      typeof broadcast.video=== 'boolean') ?
                                        broadcast.video:
                                        this.config.broadcast.video;
        /*
        if (!broadcast.audio && !broadcast.video) { 
          this.config.RTCOfferConstraints= {'mandatory': {OfferToReceiveAudio: true, OfferToReceiveVideo: true}};
        } else {
          this.config.RTCOfferConstraints = null;
        }
        */
        return this;
      },
      pauseBroadcast: function() {
        if (this._.localStream) {
          this._.localStream.getVideoTracks()[0].enabled = false;
          this._.localStream.getAudioTracks()[0].enabled = false;
        }
      },
      resumeBroadcast: function() {
        if (this._.localStream) {
          this._.localStream.getVideoTracks()[0].enabled = true;
          this._.localStream.getAudioTracks()[0].enabled = true;
        }
      },
      getMediaIn: function() {
        return this.config.mediaIn;
      },
      /**
       * DOM node to link the RtcommEndpoint inbound media stream to.
       * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
       * @throws Error Object does not have a src attribute
       */
      setMediaIn: function(value) {
        // Setting the 'local' should cause the getuserMeida to be called...
        this._.phonertc && this._.phonertc.setVideoView({
          'container': value, 
          local: {
                position: [0, 0],
                size: [100, 100]
          }});
        return this;
      },
      getMediaOut: function() { return this.config.mediaOut; },
      /**
       * DOM Endpoint to link outbound media stream to.
       * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
       * @throws Error Object does not have a src attribute
       */
      setMediaOut: function(value) {
        if(validMediaElement(value) ) {
          if (this._.localStream) {
            // We have a stream already, just move the attachment.
            attachMediaStream(value, this._.localStream);
            this.config.mediaOut = value;
          } else {
            // detach streams...
            detachMediaStream(value);
            this.config.mediaOut = value;
          }
        } else {
          throw new TypeError('Media Element object is invalid');
        }
        return this;
      },
    createMessage: function(content) {
      var message = {'type': 'webrtc', 'content': null};
      if (content) {
        if (content.type && content.content) {
          // presumably OK, just return it
          message = content;
        } else {
     //     if (content.candidate) {
            // Its an icecandidate, need to normalize this.
    //        message.content =  {'type': 'icecandidate','candidate': content.candidate};
      //    } else {
            message.content = content;
       //   }
        }
      }
      return message;
    },

    /* Process inbound messages
     *
     *  These are 'PeerConnection' messages
     *  Offer/Answer/ICE Candidate, etc...
     */
    _processMessage : function(message) {
      var self = this;
      if (!message) {
        return;
      }
      l('DEBUG') && console.log(this+"._processMessage Processing Message...", message);
      if (message.type) {
        switch(message.type) {
        case 'pranswer':
          /*
           * When a 'pranswer' is received, the target is 'THERE' and our state should
           * change to RINGING.
           */
          // Set our local description
          //  Only set state to ringing if we have a local offer...
          this._setState('ringing');
          break;
        case 'answer':
          /*
           *  If we get an 'answer', we should be in a state to RECEIVE the answer,
           *  meaning we can't have sent an answer and receive an answer.
           */
          l('DEBUG') && console.log(this+'._processMessage ANSWERING', message);
          /* global RTCSessionDescription: false */
          this._.pSession.receiveMessage(message);
          this._setState('connected');
          break;
        case 'offer':
          var offer = message;
          l('DEBUG') && console.log(this+'_processMessage received an offer -> State:  '+this.getState());
          l('DEBUG') && console.log(this+' PRANSWER in processMessage for offer()');
          //This sets up peerconnection
          // Save the message so we can receive it on accept.
          self._.offer = offer;
          if (!self.dependencies.parent.sessionStarted()) { 
             createPhoneRTCSession(false,self).call();
             self.dependencies.parent._.activeSession.pranswer({'type': 'pranswer', 'sdp':''});
          }
          self._setState('alerting');
          break;
        case 'icecandidate':
          // Transfrom message 
          var newMessage = { 
            type: 'candidate',
            label: message.candidate.sdpMLineIndex,
            id: message.candidate.sdpMid,
            candidate: message.candidate.candidate
          };
          l('DEBUG') && console.log(this+'_processMessage iceCandidate --> newMessage:', newMessage);
          self._.pSession.receiveMessage(newMessage);
          break;
        default:
          self._.pSession.receiveMessage(message);
        }
      } else {
        l('DEBUG') && console.log(this+'_processMessage Unknown Message', message);
      }
    },

   /**
    * Apply or update the Media configuration for the webrtc object
    * @param {object} [config]
    *
    * @param {boolean} config.enable
    * @param {object} config.broadcast
    * @param {boolean} config.broadcast.audio
    * @param {boolean} config.broadcast.video
    * @param {object} config.mediaIn
    * @param {object} config.mediaOut
    *
    * @param {function} [callback] callback called if getUserMedia enabled.
    *
    */
    setLocalMedia: function setLocalMedia(config,callback) {
      var enable = false;
      l('DEBUG') && console.log(this+'setLocalMedia() using config:', config);
      if (config && typeof config === 'object') {
        config.mediaIn && this.setMediaIn(config.mediaIn);
        config.mediaOut && this.setMediaOut(config.mediaOut);
        config.broadcast && this.setBroadcast(config.broadcast);
        enable = (typeof config.enable === 'boolean')? config.enable : enable;
      } else if (config && typeof config === 'function') {
        callback = config;
      } else {
        // using defaults
        l('DEBUG') && console.log(this+'setLocalMedia() using defaults');
      }

      var audio = this.config.broadcast.audio;
      var video = this.config.broadcast.video;
      var self = this;
      callback = callback || function(success, message) {
        l('DEBUG') && console.log(self+'.setLocalMedia() default callback(success='+success+',message='+message);
      };
      l('DEBUG') && console.log(self+'.setLocalMedia() audio['+audio+'] & video['+video+'], enable['+enable+']');

      // Enable AV or if enabled, attach it. 
      if (enable) {
        this.enableLocalAV(callback);
      } else {
        callback(this);
      }
      return this;
    },

   setIceServers: function(service) {
     function buildTURNobject(url) {
       // We expect this to be in form 
       // turn:<userid>@servername:port:credential:<password>
       var matches = /^turn:(\S+)\@(\S+\:\d+):credential:(.+$)/.exec(url);
       var user = matches[1] || null;
       var server = matches[2] || null;
       var credential = matches[3] || null;

       var iceServer = {
         'url': null,
         'username': null,
         'credential': null
       };
       if (user && server && credential) {
         iceServer.url = 'turn:'+server;
         iceServer.username= user;
         iceServer.credential= credential;
       } else {
         l('DEBUG') && console.log('Unable to parse the url into a Turn Server');
         iceServer = null;
       }
       return iceServer;
     }

      // Returned object expected to look something like:
      // {"iceServers":[{"url": "stun:host:port"}, {"url","turn:host:port"}] 
      var urls = [];
      if (service && service.iceURL)  {
          service.iceURL.split(',').forEach(function(url){
            // remove leading/trailing spaces
            url = url.trim();
            var obj = null;
            if (/^stun:/.test(url)) {
              l('DEBUG') && console.log(this+'.setIceServers() Is STUN: '+url);
              obj = {'url': url};
            } else if (/^turn:/.test(url)) {
              l('DEBUG') && console.log(this+'.setIceServers() Is TURN: '+url);
              obj = buildTURNobject(url);
            } else {
              l('DEBUG') && console.error('Failed to match anything, bad Ice URL: '+url);
            }
            obj && urls.push(obj);
          });
      } 
      this.config.iceServers = urls;
     },
    getIceServers: function() {
      return this.config.iceServers;
      }
   };

  })()); // End of Prototype

  /*
   *  Following are used to handle different browser implementations of WebRTC
   */
  function createPhoneRTCSession(initiator,context) {
    // This only supports 1, not a list of them...
     
     var config = {
       isInitiator: initiator,
       // Need to be populated some other way... 
        turn: {
                host: 'turn:turn.example.com:3478',
                username: 'test',
                password: '123'
        },
       
       streams: {
         audio: context.config.broadcast.audio,
         video: context.config.broadcast.video
       }
     };
     var iceServers = context.getIceServers(); 
     l('DEBUG') && console.log('createPhoneRTCSession using iceServers: ', iceServers);
     if (iceServers.length > 0) {
       config.turn = {};
       config.turn.host = iceServers[0].host;
       config.turn.username= iceServers[0].username ;
       config.turn.password = iceServers[0].credentials;
     }

     l('DEBUG') && console.log('createPhoneRTCSession using config: ', config);

     context._.pSession = new context._.phonertc.Session(config);
     /* Define callback for the pSession to send a message. */
     context._.pSession.on('sendMessage', context.send.bind(context));
     context._.pSession.on('answer', function(data){
       l('DEBUG') && console.log(context + ' Other Client Answered: ', data);
       // Other client answered...
     });
     context._.pSession.on('disconnect', function(data){
        l('DEBUG') && console.log(context+' Other Client Disconnected', data);
      });
    return context._.pSession;
  }

  var getBrowser = function() {
      if (typeof navigator === 'undefined' && typeof window === 'undefined') {
        // probably in node.js no browser support
        return ('node.js','unknown');
      } else  if (navigator && navigator.mozGetUserMedia) {
        // firefox
        return("firefox", parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10));
      } else if (navigator && navigator.webkitGetUserMedia) {
       return("chrome", parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10));
      } else {
        return("Unknown","Unknown");
      }
    };

  var MyRTCPeerConnection = (function() {
    /*global mozRTCPeerConnection:false */
    /*global webkitRTCPeerConnection:false */
    if (typeof navigator === 'undefined' && typeof window === 'undefined') {
      return null;
    } else if (navigator && navigator.mozGetUserMedia) {
      return mozRTCPeerConnection;
    } else if (navigator && navigator.webkitGetUserMedia) {
      return webkitRTCPeerConnection;
    } else {
      return null;
    //  throw new Error("Unsupported Browser: ", getBrowser());
    }
  })();

  var MyRTCSessionDescription = (function() {
    /*global mozRTCSessionDescription:false */
    if (typeof navigator === 'undefined' && typeof window === 'undefined') {
      return null;
    }  else if (navigator && navigator.mozGetUserMedia) {
      return mozRTCSessionDescription;
    } else if (typeof RTCSessionDescription !== 'undefined' ) {
      return RTCSessionDescription;
    } else {
      return null;
    //  throw new Error("Unsupported Browser: ", getBrowser());
    }
  })();

  l('DEBUG') && console.log("Setting RTCSessionDescription", MyRTCSessionDescription);


  var MyRTCIceCandidate = (function() {
    /*global mozRTCIceCandidate:false */
    /*global RTCIceCandidate:false */
    if (typeof navigator === 'undefined' && typeof window === 'undefined') {
      return null;
    } else if (navigator && navigator.mozGetUserMedia) {
      return mozRTCIceCandidate;
    } else if (typeof RTCIceCandidate !== 'undefined') {
      return RTCIceCandidate;
    } else {
      return null;
    //  throw new Error("Unsupported Browser: ", getBrowser());
    }
  })();

  l('DEBUG') && console.log("RTCIceCandidate", MyRTCIceCandidate);

  var validMediaElement = function(element) {
    return( (typeof element.srcObject !== 'undefined') ||
        (typeof element.mozSrcObject !== 'undefined') ||
        (typeof element.src !== 'undefined'));
  };

  /*
   * Assign getUserMedia, attachMediaStream as private class functions
   */
  var getUserMedia, attachMediaStream,detachMediaStream;
  /* globals URL:false */

    if (typeof navigator === 'undefined' && typeof window === 'undefined') {
      getUserMedia = null;
      attachMediaStream = null;
      detachMediaStream = null;
    // Creating methods for Firefox
    } else if (navigator && navigator.mozGetUserMedia) {

      getUserMedia = navigator.mozGetUserMedia.bind(navigator);
      // Attach a media stream to an element.
      attachMediaStream = function(element, stream) {
        l('DEBUG') && console.log("FIREFOX --> Attaching media stream");
        try { 
          element.mozSrcObject = stream;
      //    element.play();
        } catch (e) {
          console.error('Attach Media Stream failed in FIREFOX:  ', e);
        }
      };
      detachMediaStream = function(element) {
      l('DEBUG') && console.log("FIREFOX --> Detaching media stream");
      if (element) {
        element.mozSrcObject = null;
      }
    };

  } else if (navigator && navigator.webkitGetUserMedia) {
    getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
    attachMediaStream = function(element, stream) {
      if (typeof element.srcObject !== 'undefined') {
        element.srcObject = stream;
      } else if (typeof element.mozSrcObject !== 'undefined') {
        element.mozSrcObject = stream;
      } else if (typeof element.src !== 'undefined') {
        element.src = URL.createObjectURL(stream);
      } else {
        console.error('Error attaching stream to element.');
      }
    };
    detachMediaStream = function(element) {
      var nullStream = '';
      if (element) {
        if (typeof element.srcObject !== 'undefined') {
          element.srcObject = nullStream;
        } else if (typeof element.mozSrcObject !== 'undefined') {
          element.mozSrcObject = nullStream;
        } else if (typeof element.src !== 'undefined') {
          element.src = nullStream;
        } else {
          console.error('Error attaching stream to element.');
        }
      }
    };
  } else {
    console.error("Browser does not appear to be WebRTC-capable");
    var skip = function skip() {
      console.error("Function not supported in browser");
    };
    getUserMedia = skip;
    attachMediaStream = skip;
    detachMediaStream = skip;
  }

  return PhoneRTCConnection;

  })();



/*global l:false*/
var normalizeTopic = function normalizeTopic(topic) {
  // have only 1 /, starts with a /, ends without a /
  // Replace the two slashes if they exist...
  // Remove trailing slash
  var newTopic = null;
  newTopic = topic.replace(/\/+/g,'\/').replace(/\/$/g, '');
  return /^\//.test(newTopic) ? newTopic : '/'+newTopic;
};
var PresenceNode = function PresenceNode(nodename, record) {
  this.objName = 'PresenceNode';
  this.name = nodename || '';
  this.record = record || false;
  this.addressTopic = null;
  this.presenceTopic = null;
  this.nodes= [];
  this.id = this.name;
};

  var topicToArray = function topicToArray(topic) {
    var match = /^\/?(.+)$/.exec(topic.trim());
    if (match[1]) {
      return match[1].split('/');
    } else {
      // failed essentially.
      return [];
    }
  }; 

PresenceNode.prototype = util.RtcommBaseObject.extend({
  /** 
   * update the PresenceNode w/ the message passed
   */
  update: function(message) {
    /* Message looks like: 
     { content: '',
      fromEndpointID: '',
      topic: '' };
      */
    // We may ADD, Update or remove here...
    //createNode(message.topic).addRecord(message);
    
  },
  flatten: function() {
    // return array of all 'records' (dropping the hierarchy)
    var flat = [];
    this.nodes.forEach(function(node){
      if (node.record) {
        flat.push(node);
      } else {
        flat.concat(node.flatten());
      } 
    });
    return flat;
  },
  /** 
   * Return the presenceNode Object matching this topic
   * if it doesn't exist, creates it.
   */
  getSubNode :function(topic) {
    var nodes = topicToArray(topic);
    var node = this.findSubNode(nodes);
    if (node) {
      return node;
    } else {
      return this.createSubNode(nodes);
    }
  },
  findSubNode : function findSubNode(nodes) {
    l('TRACE') && console.log(this+'.findSubNode() searching for nodes --> ', nodes);
    // If the root node matches our name... 
    var returnValue = null;
    /*
     * if this.name === '/' then we are THE master Root node ('/') and we will presume that nodes[0] should
     * be below us... 
     */
    if (this.name === '/' && nodes[0] !== '/') {
        // If we are searching off of the Top Level, we need to insert it into nodes...
        nodes.unshift('/');
    }
    l('TRACE') && console.log(this+ '.findSubNode() this.name is: '+this.name);
    if(nodes[0] === this.name) {
      var match = null;
      // Search... 
      l('TRACE') && console.log(this+ '.findSubNode() searching node '+nodes[0]+' for '+nodes[1]);
      for(var i = 0; i<this.nodes.length;i++ ) {
        if ( this.nodes[i].name === nodes[1] ) { 
          l('TRACE') && console.log(this+ '.findSubNode() >>> We found '+nodes[1]);
          match =  this.nodes[i].findSubNode(nodes.slice(1));
          break;
        }
      }
      // Match will be a value if what we were looking for was found otherwise it will be null;
      //returnValue = (match && nodes[1]) ? match : this;
      //
      // If a subnode exists, then we did a search and match is accurate.
      //
      if (nodes[1]) {
        l('TRACE') && console.log(this+ '.findSubNode() >>> The match was found for: '+nodes[1]);
        returnValue = match;
      } else {
        returnValue = this;
      }
    } else {
      returnValue = this;
    }
    l('DEBUG') && console.log(this+ '.findSubNode() >>> RETURNING: ',returnValue);
    return returnValue;
  },
  /*
   * create a node
   *
   * @param [Array] nodes Array of strings that should each represent a node
   *
   * the final node is the one we are trying to create -- We will create any 
   * nodes that are not present on the way down.
   *
   */
  createSubNode: function createNode(nodes) {
    l('TRACE') && console.log(this+'.createSubNode() Would created node for nodes --> ', nodes);
    // nodes[0] should be us.
    if(nodes[0] === this.name ) {
      if (nodes.length > 1) {
        // Look for the node.  findNode looks for the last entry under the current one
        // so we need to slice nodes for the first two entries to actually look for that entry
        //
        var n = this.findSubNode(nodes.slice(0,2));
        // If we don't find a node create one.
        if (!n) { 
          // nodes[1] should be a node BELOW us.
          l('TRACE') && console.log(this+'.createSubNode() Creating Node: '+nodes[1]);
          n = new PresenceNode(nodes[1]);
          this.nodes.push(n);
        }
        // call create node on the node we found/created w/ a modified array (pulling the first
        // entry off)
        return n.createSubNode(nodes.slice(1));
      } else {
        l('TRACE') && console.log(this+ '.createSubNode() Not Creating Node, return this: ',this);
        return this;
      }
    } else {
      return null;
    }
  }, 

  deleteSubNode: function deleteSubNode(topic) {
    var nodes = topicToArray(topic);
    var nodeToDelete = this.findSubNode(nodes);
    // We found the end node
    if (nodeToDelete) {
      l('DEBUG') && console.log(this+'.deleteSubNode() Deleting Node: '+nodeToDelete.name);
      // have to find its parent.
      var parentNode = this.findSubNode(nodes.slice(0, nodes.length-1));
      l('DEBUG') && console.log(this+'.deleteSubNode() Found parent: ', parentNode);
      var index = parentNode.nodes.indexOf(nodeToDelete);
      // Remove it.
      parentNode.nodes.splice(index,1);
      return true;
    } else {
      l('DEBUG') && console.log(this+'.deleteSubNode() Node not found for topic: '+topic);
      return false;
    }
  },
  addPresence: function addPresence(topic,presenceMessage) {
    var presence = this.getSubNode(topic);
    presence.presenceTopic = topic;
    l('DEBUG') && console.log(this+'.addPresence() created node: ', presence);
    presence.record = true;
    if (typeof presenceMessage.self !== 'undefined') {
      presence.self = presenceMessage.self;
    }
    if (presenceMessage.content) {
      var msg = null;
      if (typeof presenceMessage.content === 'string') {
        msg = JSON.parse(presenceMessage.content);
      }
      presence.alias = msg.alias || null;
      presence.state = msg.state || 'unknown';
      presence.addressTopic = msg.addressTopic|| null;
      presence.nodes = msg.userDefines ||  [];
    }
  },
  removePresence: function removePresence(topic, endpointID) {
    this.deleteSubNode(topic);
  }
});
/**
 * @class
 * @memberof module:rtcomm
 * @classdesc
 * An object that can be used to monitor presence on topics.
 * <p>
 *
 * <p>
 *
 * @requires {@link mqttws31.js}
 *
 */
/**
 *  @memberof module:rtcomm
 *  @description
 *  This object can only be created with the {@link module:rtcomm.EndpointProvider#getPresenceMonitor|getPresenceMonitor} function.
 *  <p>
 *
 * The PresenceMonitor object provides an interface for the UI Developer to monitor presence of
 * other EndpointProviders that have published their presence w/ the
 * {@link module:rtcomm.EndpointProvider#publishPresence|publishPresence} function.
 *
 * Once created, it is necessary to 'add' a topic to monitor.  This topic can be nested and will 
 * look something like: 'us/agents' in order to monitor the presence of agents in the US.  
 *
 * This can go as deep as necessary.
 *
 * The presenceData is kept up to date in the PresenceMonitor.getPresenceData() object.
 *  @constructor
 *  @extends  module:rtcomm.util.RtcommBaseObject
 *
 *
 * @example
 *
 * // After creating and initializing the EndpointProvider (EP)
 *
 * var presenceMonitor = EP.getPresenceMonitor();
 * presenceMonitor.add('us/agents');
 * var presenceData = presenceMonitor.getPresenceData();
 */
var PresenceMonitor= function PresenceMonitor(config) {
  // Standard Class attributes
  this.objName = 'PresenceMonitor';
  // Private 
  this._ = {};
  // config
  this.config = {};
  this.dependencies = { 
    connection: null,
  };
  // Initialize the presenceData w/ the Root Node
  this._.rootNode = new PresenceNode("/");
  this._.presenceData=[this._.rootNode];
  this._.monitoredTopics ={}; 

  // Required...
  this.dependencies.connection = config && config.connection;
  this._.sphereTopic = (config && config.connection) ? normalizeTopic(config.connection.getPresenceRoot()) : null;
  this.events = {
    /**
     * The presenceData has been updated.  
     * @event module:rtcomm.PresenceMonitor#updated
     * @property {module:rtcomm.presenceData}
     */
    'updated': [],
    };
};
/*global util:false*/
PresenceMonitor.prototype = util.RtcommBaseObject.extend((function() {

  function processMessage(message) {
    // When we get a message on a 'presence' topic, it will be used to build our presence Object for this
    // Monitor. Once we are 'Started', we will need to normalize presence here...
    // do we need a timer?  or something to delay emitting the initial event?
    // pull out the topic:
    l('DEBUG') && console.log('PresenceMonitor received message: ', message);
    var endpointID = message.fromEndpointID;
    // Following removes the endpointID, we don't need to do that.
    // var r = new RegExp('(^\/.+)\/'+endpointID+'$');
    // Remove the sphere Topic
    var r = new RegExp('^'+this._.sphereTopic+'(.+)$');
    if (this.dependencies.connection.getMyPresenceTopic() === message.topic) {
      // Add a field to message
      message.self = true;
    }
    var topic = r.exec(message.topic)[1];
    var presence = this.getRootNode();
    if (presence) {
      if (message.content && message.content !== '') {
        // If content is '' or null then it REMOVES the presence record.
         presence.addPresence(topic, message);
      } else {
         presence.removePresence(topic, endpointID);
      }
      this.emit('updated', this.getPresenceData());
    } else {
      // No Root Node
      l('DEBUG') && console.error('No Root node... dropping presence message');
    }
  }

  return { 
    /**
     * Add a topic to monitor presence on
     *
     * @param {string} topic  A topic/group to monitor, ex. 'us/agents'
     *
     */
    add: function add(topic) {
     // var presenceData = this._.presenceData;
      // Validate our topic... 
      // now starts w/ a / and has no double slashes.
      topic = normalizeTopic(topic);
      var rootTopic = null;
      var subscriptionTopic = null;
      var match = null;
      if (this._.sphereTopic) {
        // Make sure it starts with 
        subscriptionTopic = normalizeTopic(this._.sphereTopic +topic + '/#');
        // Topic may or may not start w/ a /, either way it is added to the sphere topic.
        // And is BASED on the 'RootNode' or '/' 
        var a = topic.split('/');
        rootTopic = (a[0] === '') ? a[1] : a[0];
        match = this.getRootNode();
        if (match) { 
          match.getSubNode(topic);
        } else {
          var node = new PresenceNode(rootTopic);
          //this._.presenceData.push(node);
          node.getSubNode(topic);
        }
        this.dependencies.connection.subscribe(subscriptionTopic, processMessage.bind(this));
        this._.monitoredTopics[topic]=subscriptionTopic;
      } else {
        // No Sphere topic.
        throw new Error('Adding a topic to monitor requires the EndpointProvider be initialized');
      }
      return this;
    },

    remove: function remove(topic) {
      //var presenceData = this._.presenceData;
      topic = normalizeTopic(topic);
      if(!this.getRootNode().deleteSubNode(topic)) {
        throw new Error('Topic not found: '+topic);
      } else {
        this.dependencies.connection.unsubscribe(this._.monitoredTopics[topic]);
        delete this._.monitoredTopics[topic];
      }
      return this;
    },

    setEndpointConnection: function setEndpointConnection(connection) {
      var pm = this;
      if (connection) {
        this.dependencies.connection = connection;
        this._.sphereTopic = normalizeTopic(connection.getPresenceRoot()) ||  null;
        // reset presence Data:
  // this._.presenceData=[new PresenceNode("/")];
        this._.rootNode.nodes = [];
        var t = util.makeCopy(this._.monitoredTopics);  // Clone the array
        this._.monitoredTopics = {};
        Object.keys(t).forEach(function(topic){
          pm.add(topic);
        });
      }
    },
    /**
     * Get an array representing the presence data
     * @returns {array} An array of PresenceNodes
     */
    getPresenceData: function getPresenceData() {
      // This returns everything under the ROOT.
      return this._.presenceData;
//      return this._.presenceData[0].nodes;
    },

    getRootNode: function getRootNode() {
      return this._.rootNode;
    },

    /**
     * Return the root presenceNode if it exists.
     *
     * @param {string} topic
     * @returns {PresenceNode} The root PresenceNode for a topic (if it already exists)
     */
    __getRootNode: function getRootNode(topic) {
      // The root node matching the topic (if it exists)
      var rootNode = null;
      // The most top level node( if it exists)
      var topLevelNode = null;
      // Root Topic from passed in topic, used to find the matching rootNode
      var rootTopic = null;
      var presenceData = this._.presenceData;
      // Make sure it starts with 
      var a = normalizeTopic(topic).split('/');
      rootTopic = (a[0] === '') ? a[1] : a[0];

      for(var i = 0; i<presenceData.length;i++ ) {
        if ( presenceData[i].name === rootTopic ) { 
          rootNode =  presenceData[i];
          break;
        }
        if (presenceData[i].name === '') {
          // This is the most top level node.  Return it if no other was found.
          topLevelNode = presenceData[i];
        }
      }
     rootNode = (rootNode)? rootNode:(topLevelNode?topLevelNode: null);
     l('TRACE') &&  console.log(this+'.getRootNode() for topic:'+topic+' found: ',rootNode);
     return rootNode;
    },

  /**
   * Destroy the PresenceMonitor 
   *  Unsubscribes from presence topics
   *
   */
  destroy: function() {
       l('DEBUG') &&  console.log('Destroying mqtt(unsubscribing everything... ');
       var pm = this;
       // Wipe out the data... 
       this._.rootNode = null;
       this._.presenceData = [];
       // Unsubscribe ..
       Object.keys(pm._.monitoredTopics).forEach(function(key) {
         pm.dependencies.connection.unsubscribe(pm._.monitoredTopics[key]);
       });
    }
  } ;
})());

  var Queues = function Queues(availableQueues) {
    var Queue = function Queue(queue) {
      var self = this;
      Object.keys(queue).forEach(function(key){
        queue.hasOwnProperty(key) && (self[key] = queue[key]);
      });
      // fix the topic, make sure it has a #
      if (/#$/.test(queue.topic)) {
        this.topic = queue.topic;
      } else if (/\/$/.test(queue.topic)) {
        this.topic = queue.topic + "#";
      } else { 
        this.topic = queue.topic + "/#";
      }
      // Augment the passed in queue.
      this.active= false;
      this.callback= null;
      this.paused= false;
      this.regex= null;
      this.autoPause = false;
    };
    var queues  = {};

    this.add = function(availableQueues) {
      availableQueues.forEach( function(queue) {
        // Only overwrite a queue if it doesn't exist 
        if(!queues.hasOwnProperty[queue.endpointID]) {
          queues[queue.endpointID] = new Queue(queue);
        }
      });
    };

    this.get = function(queueid) {
      return queues[queueid] || null;
    };
    this.findByTopic = function(topic) {
      // Typically used on an inbound topic, will iterate through queue and return it.
      var matches = [];
      //console.log(Object.keys(queues));
      Object.keys(queues).forEach(function(queue) {
        l('DEBUG') && console.log('Queues.findByTopic testing '+topic+' against regex: '+queues[queue].regex);
        queues[queue].regex && queues[queue].regex.test(topic) && matches.push(queues[queue]);
        });
     if (matches.length === 1 ) {
       return matches[0];
     } else {
       throw new Error('Multiple Queue matches for topic('+topic+')- should not be possible');
     }
    };
    this.all = function() {
      return queues;
    };
    this.list = function(){
      return Object.keys(queues);
    };
  };

  Queues.prototype.toString = function() {
    this.list();
  };

/*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*global: l:false*/
/*global: generateUUID:false*/
/*global: util:false*/

var RtcommEndpoint = (function invocation(){

  /**
   * @memberof module:rtcomm.RtcommEndpoint
   *
   * @description 
   * A Chat is a connection from one peer to another to pass text back and forth
   *
   *  @constructor
   *  @extends  module:rtcomm.util.RtcommBaseObject
   */
  var Chat = function Chat(parent) {
    // Does this matter?
    var createChatMessage = function(message) {
      return {'type': 'chat', 'content': {'message': message, 'from': parent.userid}};
    };
    var chat = this;
    this._ = {};
    this._.objName = 'Chat';
    this.id = parent.id;
    this._.parentConnected = false;
    this._.enabled = false;
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;
    this.state = 'disconnected';

    this.events = {
      'message': [],
      'ringing': [],
      'connected': [],
      'alerting': [],
      'disconnected': []
    };
    /**
     * Send a message if connected, otherwise, 
     * enables chat for subsequent RtcommEndpoint.connect();
     * @param {string} message  Message to send when enabled.
     */  
    this.enable =  function(message) {
      l('DEBUG') && console.log(this+'.enable() - current state --> '+ this.state);

      this.onEnabledMessage = message || createChatMessage(parent.userid + ' has initiated a Chat with you');
      // Don't need much, just set enabled to true.
      // Default message
      this._.enabled = true;
      
      if (parent.sessionStarted()) {
        l('DEBUG') && console.log(this+'.enable() - Session Started, connecting chat');
        this._connect();
      } else { 
        l('DEBUG') && console.log(this+'.enable() - Session not starting, may respond, but also connecting chat');
        parent._.activeSession && parent._.activeSession.respond();
        this._connect();
      }
      return this;
    };
    /**
     * Accept an inbound connection  
     */
    this.accept = function(message) {
      l('DEBUG') && console.log(this+'.accept() -- accepting -- '+ this.state);
      if (this.state === 'alerting') {
        this.enable(message || 'Accepting chat connection');
        return true;
      } else {
        return false;
      }
    };
    /**
     * Reject an inbound session
     */
    this.reject = function() {
      // Does nothing.
    };
    /**
     * disable chat
     */
    this.disable = function(message) {
      if (this._.enabled) { 
        this._.enabled = false;
        this.onDisabledMessage = message|| createChatMessage(parent.userid + ' has left the chat');
        this.send(this.onDisabledMessage);
        this._setState('disconnected');
      }
      return null;
    };
    /**
     * send a chat message
     * @param {string} message  Message to send
     */
    this.send = function(message) {
      message = (message && message.payload) ? message.payload: message;
      message = (message && message.type === 'chat') ? message : createChatMessage(message);
      if (parent._.activeSession) {
        parent._.activeSession.send(message);
      }
    };
    this._connect = function(sendMethod) {
      sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
      if (this._.enabled) {
        this.onEnabledMessage && sendMethod({'payload': this.onEnabledMessage});
        this._setState('connected');
        return true;
      } else {
        l('DEBUG') && console.log(this+ '_connect() !!!!! not enabled, skipping...'); 
        return false;
      }
    };
    // Message should be in the format:
    // {payload content... }
    // {'message': message, 'from':from}
    //
    this._processMessage = function(message) {
      // If we are connected, emit the message
      if (this.state === 'connected') {
        this.emit('message', message);
      } else {
        if (!parent.sessionStopped()) {
          parent._.activeSession && parent._.activeSession.pranswer();
          this._setState('alerting', message);
        }
      }
      return this;
    };
    this._setState = function(state, object) {
     l('DEBUG') && console.log(this+'._setState() setting state to: '+ state); 
      var currentState = this.state;
      try {
        this.state = state;
        this.emit(state, object);
      } catch(error) {
        console.error(error);
        console.error(this+'._setState() unsupported state: '+state );
        this.state = currentState;
      }
    };

  };
  Chat.prototype = util.RtcommBaseObject.extend({});

  var createChat = function createChat(parent) {
    var chat = new Chat(parent);
    chat.on('ringing', function(event_obj) {
      (parent.lastEvent !== 'session:ringing') && parent.emit('session:ringing');
    });
    chat.on('message', function(message) {
      parent.emit('chat:message', {'message': message});
    });
    chat.on('alerting', function(message) {
      var obj =  {};
      obj.message  = message;
      obj.protocols = 'chat';
      parent.emit('session:alerting', obj );
    });
    chat.on('connected', function() {
      parent.emit('chat:connected');
    });
    chat.on('disconnected', function() {
      parent.emit('chat:disconnected');
    });
    return chat;
  };


  var createWebRTCConnection = function createWebRTCConnection(parent) {
    /* globals WebRTCConnection:false */
    /* globals PhoneRTCConnection:false */
    /* globals cordova:false */
    var webrtc = null;
    if (typeof cordova !== 'undefined' || typeof phonertc !== 'undefined') {
      l('DEBUG') && console.log(" Cordova Detected, using PhoneRTC");
      webrtc = new PhoneRTCConnection(parent); 
    } else {
      webrtc = new WebRTCConnection(parent);
    }
    webrtc.on('ringing', function(event_obj) {
      (parent.lastEvent !== 'session:ringing') && parent.emit('session:ringing');
    });
    webrtc.on('alerting', function(event_obj) {
      parent.emit('session:alerting', {protocols: 'webrtc'});
    });
    webrtc.on('connected', function(event_obj) {
      parent.emit('webrtc:connected');
    });
    webrtc.on('disconnected', function(event_obj) {
      parent.emit('webrtc:disconnected');
    });
    return webrtc;
  };

/**
 *  @memberof module:rtcomm
 *  @description
 *  This object can only be created with the {@link module:rtcomm.EndpointProvider#getRtcommEndpoint|getRtcommEndpoint} function.
 *  <p>
 *  The RtcommEndpoint object provides an interface for the UI Developer to attach 
 *  Video and Audio input/output.  Essentially mapping a broadcast stream(a MediaStream that
 *  is intended to be sent) to a RTCPeerConnection output stream.   When an inbound stream
 *  is added to a RTCPeerConnection, then this also informs the RTCPeerConnection
 *  where to send that stream in the User Interface.
 *  <p>
 *  See the example under {@link module:rtcomm.EndpointProvider#getRtcommEndpoint|getRtcommEndpoint}
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
 */
  var RtcommEndpoint = function RtcommEndpoint(config) {
    // Presuming you creat an object based on this one, 
    // you must override the ession event handler and
    // then augment newSession object.
    //
    this.config = {
      ignoreAppContext: true,
      appContext : null,
      userid: null,
      chat: true,
      webrtc: true
    };
    this.dependencies = {
      endpointConnection: null,
    };
    // Private info.
    this._ = {
      objName: 'RtcommEndpoint',
      activeSession: null,
      available: true,
      /*global generateUUID:false */
      uuid: generateUUID(),
      initialized : false,
      protocols : [],
      // webrtc Only 
      inboundMedia: null,
      attachMedia: false,
      localStream : null,
      media : { In : null,
               Out: null},
    };
    // Used to store the last event emitted;
    this.lastEvent = null;
    // Used to store the last event emitted;
    //
    this.state = 'session:stopped';
    var self = this;
    config && Object.keys(config).forEach(function(key) {
      self.config[key] = config[key];
    });

    this.config.webrtc && this._.protocols.push('webrtc');
    this.config.chat && this._.protocols.push('chat');

    // expose the ID
    this.id = this._.uuid;
    this.userid = this.config.userid || null;
    this.appContext = this.config.appContext || null;

    /**
     * The attached {@link module:rtcomm.RtcommEndpoint.WebRTCConnection} object 
     * if enabled null if not enabled
     *
     * @type {module:rtcomm.RtcommEndpoint.WebRTCConnection}
     * @readonly
     */
    this.webrtc = (this.config.webrtc)?createWebRTCConnection(this): null;
    /**
     * The attached {@link module:rtcomm.RtcommEndpoint.Chat} object 
     * if enabled null if not enabled
     *
     * @type {module:rtcomm.RtcommEndpoint.Chat}
     * @readonly
     */
    this.chat = (this.config.chat) ? createChat(this): null;
    // Enable chat by default if it is set up that way.
    //this.chat && this.chat.enable();

    /** 
     * RtcommEndpoint Event type 
     *
     *  @typedef {Object} module:rtcomm.RtcommEndpoint~Event
     *  @property {name} eventName 
     *  @property {object} endpointObject - an object passed with the event
     *  @property {string} [reason] - Used for failure messages
     *  @property {string} [protocols] - Used for alerting messages
     *  @property {object} [message] - Used for chat:message and session:alerting
     */

    this.events = {
        /**
         * A signaling session to a peer has been established
         * @event module:rtcomm.RtcommEndpoint#session:started
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:started": [],
        /**
         * An inbound request to establish a call via 
         * 3PCC was initiated
         *
         * @event module:rtcomm.RtcommEndpoint#session:refer
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "session:refer": [],
        /**
         * A peer has been reached, but not connected (inbound/outound)
         * @event module:rtcomm.RtcommEndpoint#session:ringing
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:trying": [],
        /**
         * A Queue has been contacted and we are waiting for a response.
         * @event module:rtcomm.RtcommEndpoint#session:queued
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:queued": [],
        /**
         * A peer has been reached, but not connected (inbound/outound)
         * @event module:rtcomm.RtcommEndpoint#session:ringing
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:ringing": [],
        /**
         * An inbound connection is being requested.
         * @event module:rtcomm.RtcommEndpoint#session:alerting
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:alerting": [],
        /**
         * A failure occurred establishing the session (check reason)
         * @event module:rtcomm.RtcommEndpoint#session:failed
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:failed": [],
        /**
         * The session has stopped
         * @event module:rtcomm.RtcommEndpoint#session:stopped
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "session:stopped": [],
        /**
         * A PeerConnection to a peer has been established
         * @event module:rtcomm.RtcommEndpoint#webrtc:connected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "webrtc:connected": [],
        /**
         * The connection to a peer has been closed
         * @event module:rtcomm.RtcommEndpoint#webrtc:disconnected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "webrtc:disconnected": [],
        /**
         * Creating the connection to a peer failed
         * @event module:rtcomm.RtcommEndpoint#webrtc:failed
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'webrtc:failed': [],
        /**
         * A message has arrived from a peer
         * @event module:rtcomm.RtcommEndpoint#chat:message
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:message': [],
        /**
         * A chat session to a  peer has been established
         * @event module:rtcomm.RtcommEndpoint#chat:connected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:connected': [],
        /**
         * The connection to a peer has been closed
         * @event module:rtcomm.RtcommEndpoint#chat:disconnected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:disconnected':[],
        /**
         * The endpoint has destroyed itself, clean it up.
         * @event module:rtcomm.RtcommEndpoint#destroyed
         * @property {module:rtcomm.RtcommEndpoint}
         */
        'destroyed': [],
        /**
         * The endpoint received a 'onetimemessage'. The content of the message
         * should be in the 'otm' header
         * @event module:rtcomm.RtcommEndpoint#onetimemessage
         * @property {module:rtcomm.RtcommEndpoint}
         */
        'onetimemessage': [],
    };
  };
/*globals util:false*/
/*globals l:false*/
RtcommEndpoint.prototype = util.RtcommBaseObject.extend((function() {

  function createSignalingSession(endpoint, context) {
    var remoteEndpointID = null;
    var toTopic = null;
    if (typeof endpoint === 'object') {
      if (endpoint.remoteEndpointID && endpoint.toTopic) {
        remoteEndpointID = endpoint.remoteEndpointID;
        toTopic = endpoint.toTopic;
      } else {
        throw new Error('Invalid object passed on connect! should be {remoteEndpointID: something, toTopic: something}');
      }
    } else {
      remoteEndpointID = endpoint;
    } 
    l('DEBUG') && console.log(context+" createSignalingSession context: ", context);
    var sessid = null;
    if (!remoteEndpointID) {
      throw new Error('remoteEndpointID must be set');
    }
    var session = context.dependencies.endpointConnection.createSession({
      id : sessid,
      toTopic : toTopic,
      protocols: context._.protocols,
      remoteEndpointID: remoteEndpointID,
      appContext: context.config.appContext
    });
    return session;
  }
  // Protocol Specific handling of the session content. 
  //
  function addSessionCallbacks(context, session) {
     // Define our callbacks for the session.
    // received a pranswer
    session.on('have_pranswer', function(content){
      // Got a pranswer:
      context.setState('session:ringing');
      context._processMessage(content);
    });
    /*
     * this is a bit of a special message... content MAY contain:
     * content.queuePosition
     * content.message
     *
     * content.message is all we propogate.
     *
     */
    session.on('queued', function(content){
      l('DEBUG') && console.log('SigSession callback called to queue: ', content);
      var position = 0;
      if (typeof content.queuePosition !== 'undefined') {
        position = content.queuePosition;
        context.setState('session:queued',{'queuePosition':position});
        content = (content.message)? content.message : content;
      } else {
        context.setState('session:queued');
        context._processMessage(content);
      }
    });
    session.on('message', function(content){
      l('DEBUG') && console.log('SigSession callback called to process content: ', content);
      context._processMessage(content);
    });
    session.on('started', function(content){
      // Our Session is started!
      content && context._processMessage(content);
      context.setState('session:started');
    });
    session.on('stopped', function(message) {
      // In this case, we should disconnect();
      context.setState('session:stopped');
      context.disconnect();
    });
    session.on('starting', function() {
      context.setState('session:trying');
    });
    session.on('failed', function(message) {
      context.disconnect();
      context.setState('session:failed',{reason: message});
    });
    l('DEBUG') && console.log(context+' createSignalingSession created!', session);
   // session.listEvents();
    return true;
  }
/** @lends module:rtcomm.RtcommEndpoint.prototype */
return  {
  getAppContext:function() {return this.config.appContext;},
  newSession: function(session) {
      var event = null;
      var msg = null;
      // If there is a session.appContext, it must match unless this.ignoreAppContext is set 
      if (this.config.ignoreAppContext || 
         (session.appContext && (session.appContext === this.getAppContext())) || 
         (typeof session.appContext === 'undefined' )) {
        // We match appContexts (or don't care)
        if (this.available()){
          // We are available (we can mark ourselves busy to not accept the call)
          // Save the session 
          this._.activeSession = session;
          addSessionCallbacks(this,session);
          var commonProtocols = util.commonArrayItems(this._.protocols, session.protocols);
          l('DEBUG') && console.log(this+'.newSession() common protocols: '+ commonProtocols);
          // If this session is created by a REFER, we do something different
          if (session.referralTransaction ) {
            // Don't start it, emit 'session:refer'
            l('DEBUG') && console.log(this + '.newSession() REFER');
            // Set the protocols to match the endpoints.
            session.protocols = this._.protocols;
            this.setState('session:refer');
          } else if (commonProtocols.length > 0){
            // have a common protocol 
            // any other inbound session should be started.
            session.start({protocols: commonProtocols});
            // Depending on the session.message (i.e its peerContent or future content) then do something. 
            if (session.message && session.message.payload) {
              // If we need to pranswer, processMessage can handle it.
              this._processMessage(session.message.payload);
            } else {
              // it doesn't have any payload, but could have protocols subprotocol
              session.pranswer();
              this.setState('session:alerting', {protocols:commonProtocols});
            }
          } else {
            // can't do anything w/ this session, same as busy... different reason.
            l('DEBUG') && console.log(this+'.newSession() No common protocols');
            session.fail('No common protocols');
          }
          this.available(false);
        } else {
          msg = 'Busy';
          l('DEBUG') && console.log(this+'.newSession() '+msg);
          session.fail('Busy');
        }
      } else {
        msg = 'Client is unable to accept a mismatched appContext: ('+session.appContext+') <> ('+this.getAppContext()+')';
        l('DEBUG') && console.log(this+'.newSession() '+msg);
        session.fail(msg);
      }
  },
  _processMessage: function(payload) {

    // Content should be {type: blah, content: blah};
    // but may be {protocols: [], payload: {}}
    // basically a protocol router...
    var protocols;
    if (payload.protocols) {
      protocols = payload.protocols;
      payload = payload.payload;
    }
    var self = this;
    if (payload) {
      if (payload.type === 'chat') { 
      // It is a chat this will change to something different later on...
        if (this.config.chat) { 
          this.chat._processMessage(payload.content);
          //this.emit('chat:message', payload.userdata);
        } else {
          console.error('Received chat message, but chat not supported!',payload);
        }
      } else if (payload.type === 'webrtc') {
        if (this.config.webrtc && this.webrtc) { 
          // calling enable will enable if not already enabled... 
          if (this.webrtc.enabled()) {
            self.webrtc._processMessage(payload.content);
          } else {
            // This should only occur on inbound. don't connect, that is for outbound.
            this.webrtc.enable({connect: false}, function(success){
              if (success) {
                self.webrtc._processMessage(payload.content);
              }
            });
          }
        }
      } else if (payload.type === 'otm') {
        this.emit('onetimemessage', {'onetimemessage': payload.content});
      } else {
        console.error(this+' Received message, but unknown protocol: ', payload);
      }
   } else {
     l('DEBUG') && console.log(this+' Received message, but nothing to do with it', payload);
   }
  },
  /** Endpoint is available to accept an incoming call
   *
   * @returns {boolean}
   */

    available: function(a) {
     // if a is a boolean then set it, otherwise return it.
     if (typeof a === 'boolean') { 
       this._.available = a;
       l('DEBUG') && console.log(this+'.available() setting available to '+a);
       return a;
     } else  {
       return this._.available;
     }
    },

  /**
   *  @memberof module:rtcomm.RtcommEndpoint
   * Connect to another endpoint.  Depending on what is enabled, it may also start
   * a chat connection or a webrtc connection.
   * <p>
   * If webrtc is enabled by calling webrtc.enable() then the initial connect will 
   * also generate an Offer to the remote endpoint. <br>
   * If chat is enabled, an initial message will be sent in the session as well.
   * </p>
   *
   * @param {string|object} endpoint Remote ID of endpoint to connect.
   *
   * TODO:  Doc this..
   *
   */

  connect: function(endpoint) {
    if (this.ready()) {
      this.available(false);
      if (!this._.activeSession ) { 
        this._.activeSession = createSignalingSession(endpoint, this);
        addSessionCallbacks(this, this._.activeSession);
      } 
      this.setState('session:trying');
      if (this.config.webrtc && 
          this.webrtc._connect(this._.activeSession.start.bind(this._.activeSession))) {
        l('DEBUG') && console.log(this+'.connect() initiating with webrtc._connect');
      } else if (this.config.chat && 
                 this.chat._connect(this._.activeSession.start.bind(this._.activeSession))){
        l('DEBUG') && console.log(this+'.connect() initiating with chat._connect');
      } else {
        l('DEBUG') && console.log(this+'.connect() sending startMessage w/ no content');
        this._.activeSession.start();
      }
    } else {
      throw new Error('Unable to connect endpoint until EndpointProvider is initialized');
    }
    return this;
  },

  /**
   * Disconnect the endpoint from a remote endpoint.
   */
  disconnect: function() {
    this.webrtc && this.webrtc.disable();
    this.chat && this.chat.disable();
    if (this.sessionStarted()) {
      this._.activeSession.stop();
      this._.activeSession = null;
      this.setState('session:stopped');
    } else {
      this._.activeSession=null;
    }
    this.available(true);
    return this;
  },
  /**
   * Accept an inbound request.  This is typically called after a 
   * {@link module:rtcomm.RtcommEndpoint#session:alerting|session:alerting} event
   *
   */
  accept: function(options) {
    if (this.getState() === 'session:refer') {  
      this.connect(null);
    } else if (this.webrtc && this.webrtc && this.webrtc.accept(options)) {
      l('DEBUG') && console.log(this+'.accept() Accepted in webrtc.');
    } else if (this.chat && this.chat.accept(options)) {
      l('DEBUG') && console.log(this+'.accept() Accepted in chat.');
    } else {
      l('DEBUG') && console.log(this+'.accept() accepting generically.');
      if (!this.sessionStarted()) {
        this._.activeSession.respond();
      }
    }
    return this;
  },

  /**
   * Reject an inbound request.  This is typically called after a 
   * {@link module:rtcomm.RtcommEndpoint#session:alerting|session:alerting} event
   *
   */
  reject: function() {
      l('DEBUG') && console.log(this + ".reject() invoked ");
      this.webrtc.reject();
      this.chat.reject();
      this._.activeSession && this._.activeSession.fail("The user rejected the call");
      this.available(true);
      this._.activeSession = null;
      return this;
  },

  sendOneTimeMessage: function(message){
    var msg = {};
    if (this.sessionStarted()) {
      msg.type = 'otm';
      msg.content = (typeof message === 'object') ? message : {'message':message};
      this._.activeSession.send(msg);
    } else {
      throw new Error('Unable to send onetimemessage.  Session not started');
    }
  },

  /* used by the parent to assign the endpoint connection */
  setEndpointConnection: function(connection) {
    this.webrtc && this.webrtc.setIceServers(connection.RTCOMM_CONNECTOR_SERVICE);
    this.dependencies.endpointConnection = connection;
  },

  /** Return user id 
   * @returns {string} Local UserID that endpoint is using
   */
  getUserID : function(userid) {
      return this.config.userid; 
  },

  setUserID : function(userid) {
      this.userid = this.config.userid = userid;
  },

  getState: function() {
    return this.state;
  },

  /**
   * Endpoint is ready to connect
   * @returns {boolean}
   */
  ready : function() {
    var ready = (this.dependencies.endpointConnection) ? true : false;
    return ready;
  },
  /**
   * The Signaling Session is started 
   * @returns {boolean}
   */
  sessionStarted: function() {
    return (this._.activeSession && this._.activeSession.getState() === 'started');
  },
  /**
   * The Signaling Session does not exist or is stopped
   * @returns {boolean}
   */
  sessionStopped: function() {
    var state = (this._.activeSession) ? (this._.activeSession.getState() === 'stopped'): true;
    return state;
  },
  /**
   * Remote EndpointID this endpoint is connected to.
   * @returns {string}
   */
  getRemoteEndpointID: function() {
    return this._.activeSession ? this._.activeSession.remoteEndpointID : 'none';
  },
  /**
   * Local EndpointID this endpoint is using.
   * @returns {string}
   */
  getLocalEndpointID: function() {
    return this.userid;
  },

  /**
   *  Destroy this endpoint.  Cleans up everything and disconnects any and all connections
   */
  destroy : function() {
    l('DEBUG') && console.log(this+'.destroy Destroying RtcommEndpoint');
    this.emit('destroyed');
    this.disconnect();
    // this.getLocalStream() && this.getLocalStream().stop();
    l('DEBUG') && console.log(this+'.destroy() - detaching media streams');
    //detachMediaStream && detachMediaStream(this.getMediaIn());
    //detachMediaStream && detachMediaStream(this.getMediaOut());
    l('DEBUG') && console.log(this+'.destroy() - Finished');
  },

  /* This is an event formatter that is called by the prototype emit() to format an event if 
   * it exists
   * When passed an object, we ammend it w/ eventName and endpoint and pass it along.
   */
  _Event : function Event(event, object) {
      var RtcommEvent =  {
        eventName: '',
        endpoint: null
      };
      l('DEBUG') && console.log(this+'_Event -> creating event['+event+'], augmenting with', object);
      RtcommEvent.eventName= event;
      RtcommEvent.endpoint= this;
      if (typeof object === 'object') {
        Object.keys(object).forEach(function(key) { 
          RtcommEvent[key] = object[key];
        });
      }
      l('DEBUG') && console.log(this+'_Event -> created event: ',RtcommEvent);
      return RtcommEvent;
  }

  };


  })()); // End of Prototype

return RtcommEndpoint;
})();

 /*
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var WebRTCConnection = (function invocation() {

  /**
   * @memberof module:rtcomm.RtcommEndpoint
   *
   * @description 
   * A WebRTCConnection is a connection from one peer to another encapsulating
   * an RTCPeerConnection and a SigSession
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
   */
  var WebRTCConnection = function WebRTCConnection(parent) {
    var OfferConstraints = {'mandatory': {
      OfferToReceiveAudio: true, 
      OfferToReceiveVideo: true}
    };

    this.config = {
      RTCConfiguration : {iceTransports : "all"},
      RTCOfferConstraints: OfferConstraints,
      RTCConstraints : {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]},
      iceServers: [],
      mediaIn: null,
      mediaOut: null,
      broadcast: {
        audio: true,
        video: true 
      }
    };
    // TODO:  Throw error if no parent.
    this.dependencies = {
      parent: parent || null
    };
    this._ = {
      state: 'disconnected',
      objName:'WebRTCConnection',
      parentConnected : false,
      enabled : false
    };
    this.id = parent.id;
    // Defaults for peerConnection -- must be set on instantiation
    // Required to emit.
    this.events = {
      'alerting': [],
      'ringing': [],
      'trying': [],
      'connected': [],
      'disconnected': []
    };
    this.pc = null;
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;

  };

  /*global util:false*/

  WebRTCConnection.prototype = util.RtcommBaseObject.extend((function() {
    /** @lends module:rtcomm.RtcommEndpoint.WebRTCConnection.prototype */
    return {
    /*
     */
    // Same as options for creating a PeerConnection(and offer/answer)
    // include UI elements here.
    /**
     * enable webrtc
     * <p>
     * When enable() is called, if we are connected we will initiate a webrtc connection (generate offer)
     * Otherwise, call enable() prior to connect and when connect occurs it will do what is enabled...
     * </p>
     *
     * @param {object} [config]
     *
     * @param {object} [config.mediaIn]  UI component to attach inbound media stream
     * @param {object} [config.mediaOut] UI Component to attach outbound media stream
     * @param {object} [config.broadcast] 
     * @param {boolean} [config.broadcast.audio] Broadcast Audio
     * @param {boolean} [config.broadcast.video] Broadcast Video
     * @param {object} [config.RTCOfferConstraints] RTCPeerConnection specific config {@link http://w3c.github.io/webrtc-pc/} 
     * @param {object} [config.RTCConfiguration] RTCPeerConnection specific {@link http://w3c.github.io/webrtc-pc/} 
     * @param {object} [config.RTCConfiguration.peerIdentity] 
     * @param {boolean} [config.lazyAV=true]  Enable AV lazily [upon connect/accept] rather than during
     * right away
     * @param {boolean} [config.connect=true] Internal, do not use.
     *
     **/
    enable: function(config,callback) {
      // If you call enable, no matter what we can update the config.
      //
      var self = this;
      var parent = self.dependencies.parent;
      /*global l:false*/
      l('DEBUG') && console.log(self+'.enable()  --- entry ---');

      var RTCConfiguration = (config && config.RTCConfiguration) ?  config.RTCConfiguration : this.config.RTCConfiguration;
      RTCConfiguration.iceServers = RTCConfiguration.iceServers || this.getIceServers();
      var RTCConstraints= (config && config.RTCConstraints) ? config.RTCConstraints : this.config.RTCConstraints;
      this.config.RTCOfferConstraints= (config && config.RTCOfferConstraints) ? config.RTCOfferConstraints: this.config.RTCOfferConstraints;

      var connect = (config && typeof config.connect === 'boolean') ? config.connect : parent.sessionStarted();
      var lazyAV = (config && typeof config.lazyAV === 'boolean') ? config.lazyAV : true;

      l('DEBUG') && console.log(self+'.enable() config created, defining callback');

      callback = callback || ((typeof config === 'function') ? config :  function(success, message) {
        l('DEBUG') && console.log(self+'.enable() default callback(success='+success+',message='+message);
      });
      // When Enable is called we have a couple of options:
      // 1.  If parent is connected, enable will createofffer and send it.
      // 2.  if parent is NOT CONNECTED. enable will create offer and STORE it for sending by _connect.
      //
      // 3.  
      /*
       * create an offer during the enable process
       */

      // If we are enabled already, just return ourselves;
      //

      if (this._.enabled) {
        this.enableLocalAV(callback);
        return this;
      } else {
        l('DEBUG') && console.log(self+'.enable() connect if possible? '+connect);
        try {
          this.pc = createPeerConnection(RTCConfiguration, RTCConstraints, this);
        } catch (error) {
          // No PeerConnection support, cannot enable.
          throw new Error(error);
        }
        this._.enabled = true;
        // If we don't have lazy set and we aren't immediately connecting, enable AV.
        l('DEBUG') && console.log(self+'.enable() (lazyAV='+lazyAV+',connect='+connect);
        if (!lazyAV && !connect) {
          // enable now.
          this.enableLocalAV(function(success, message) {
            l('DEBUG') && console.log(self+'.enable() enableLocalAV Callback(success='+success+',message='+message);
            callback(true);
          });
        } else {
          if (connect) {
            this._connect(null, callback(true));
          } else {
            callback(true);
          } 
        } 
        return this;
      }
    },
    /** disable webrtc 
     * Disconnect and reset
     */
    disable: function() {
      this.onEnabledMessage = null;
      this._.enabled = false;
      this._disconnect();
      if (this.pc) {
        this.pc = null;
      }
      return this;
    },
    /**
     * WebRTCConnection is enabled
     * @returns {boolean}
     */
    enabled: function() {
      return this._.enabled;
    },

    /*
     * Called to 'connect' (Send message, change state)
     * Only works if enabled.
     *
     */
    _connect: function(sendMethod,callback) {
      var self = this;

      sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
      callback = callback ||function(success, message) {
        l('DEBUG') && console.log(self+'._connect() default callback(success='+success+',message='+message);
      };

      var doOffer =  function doOffer(success, msg) {
        if (success) { 
          self.pc.createOffer(
            function(offersdp) {
              l('DEBUG') && console.log(self+'.enable() createOffer created: ', offersdp);
                sendMethod({payload: self.createMessage(offersdp)});
                self._setState('trying');
                self.pc.setLocalDescription(offersdp, function(){
                  l('DEBUG') &&  console.log('************setLocalDescription Success!!! ');
                  callback(true);
                }, function(error) { callback(false, error);});
            },
            function(error) {
              console.error('webrtc._connect failed: ', error);
              callback(false);
            },
            self.config.RTCOfferConstraints);
        } else {
          callback(false);
          console.error('_connect failed, '+msg);
        }
      };
      if (this._.enabled && this.pc) {
        this.enableLocalAV(doOffer);
        return true;
      } else {
        return false;
      } 
    },

    _disconnect: function() {
      if (this.pc && this.pc.signalingState !== 'closed') {
        l('DEBUG') && console.log(this+'._disconnect() Closing peer connection');
       this.pc.close();
      }
      detachMediaStream(this.getMediaIn());
      this._.remoteStream = null;
      detachMediaStream(this.getMediaOut());
      if (this.getState() !== 'disconnected' && this.getState() !== 'alerting') {
        this._setState('disconnected');
      }
      return this;
    },

    send: function(message) {
      var parent = this.dependencies.parent;
      // Validate message?
      message = (message && message.payload) ? message.payload: message;
      if (parent._.activeSession) {
        parent._.activeSession.send(this.createMessage(message));
      }
    },

    /**
     * Accept an inbound connection
     */
    accept: function(options) {
      var self = this;

      var doAnswer = function doAnswer() {
        l('DEBUG') && console.log(this+'.accept() -- doAnswer -- peerConnection? ', self.pc);
        l('DEBUG') && console.log(this+'.accept() -- doAnswer -- constraints: ', self.config.RTCOfferConstraints);
        //console.log('localsttream audio:'+ self._.localStream.getAudioTracks().length );
        //console.log('localsttream video:'+ self._.localStream.getVideoTracks().length );
        //console.log('PC has a lcoalMediaStream:'+ self.pc.getLocalStreams(), self.pc.getLocalStreams());
        self.pc && self.pc.createAnswer(self._gotAnswer.bind(self), function(error) {
          console.error('failed to create answer', error);
        },
         self.config.RTCOfferConstraints
        );
      };
      l('DEBUG') && console.log(this+'.accept() -- accepting --');
      if (this.getState() === 'alerting') {
        this.enableLocalAV(doAnswer);
        return true;
      } else {
        return false;
      }
    },
    /** reject an inbound connection */
    reject: function() {
      this._disconnect();
    },
    /** State of the WebRTC, matches an event */
    getState: function() {
      return this._.state;
    },
    _setState: function(state) {
      l('DEBUG') && console.log(this+'._setState to '+state);
      this._.state = state;
      var event = state;
      l('DEBUG') && console.log(this+'._setState emitting event '+event);
      this.emit(event);
    },

    broadcastReady: function broadcastReady() {
      if (( this.config.broadcast.audio || this.config.broadcast.video) && (typeof this._.localStream === 'object')) {
        return true;
        // if we have neither, we are still 'ready'
      } else if (this.config.broadcast.audio === false  && this.config.broadcast.video === false) {
        return true;
      } else {
        return false;
      }
    },
    /** configure broadcast 
     *  @param {object} broadcast 
     *  @param {boolean} broadcast.audio
     *  @param {boolean} broadcast.video
     */
    setBroadcast : function setBroadcast(broadcast) {
      this.config.broadcast.audio = (broadcast.hasOwnProperty('audio') && 
                                     typeof broadcast.audio === 'boolean') ? 
                                      broadcast.audio :
                                      this.config.broadcast.audio;
      this.config.broadcast.video= (broadcast.hasOwnProperty('video') && 
                                    typeof broadcast.video=== 'boolean') ?
                                      broadcast.video:
                                      this.config.broadcast.video;
      /*
      if (!broadcast.audio && !broadcast.video) { 
        this.config.RTCOfferConstraints= {'mandatory': {OfferToReceiveAudio: true, OfferToReceiveVideo: true}};
      } else {
        this.config.RTCOfferConstraints = null;
      }
      */
      return this;
    },
    pauseBroadcast: function() {
      if (this._.localStream) {
        this._.localStream.getVideoTracks()[0].enabled = false;
        this._.localStream.getAudioTracks()[0].enabled = false;
      }
    },
    resumeBroadcast: function() {
      if (this._.localStream) {
        this._.localStream.getVideoTracks()[0].enabled = true;
        this._.localStream.getAudioTracks()[0].enabled = true;
      }
    },
    getMediaIn: function() {
      return this.config.mediaIn;
    },
    /**
     * DOM node to link the RtcommEndpoint inbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    setMediaIn: function(value) {
      if(validMediaElement(value) ) {
        if (this._.remoteStream) {
          // If we already have a media in and value is different than current, unset current.
          if (this.config.mediaIn && this.config.mediaIn !== value) {
            detachMediaStream(this.config.mediaIn);
          }
          attachMediaStream(value, this._.remoteStream);
          this.config.mediaIn = value;
        } else {
          detachMediaStream(value);
          this.config.mediaIn = value;
        }
      } else {
        throw new TypeError('Media Element object is invalid');
      }
      return this;
    },
    getMediaOut: function() { return this.config.mediaOut; },
    /**
     * DOM Endpoint to link outbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    setMediaOut: function(value) {
      l('DEBUG') && console.log(this+'.setMediaOut() called with value: ', value);
      if(validMediaElement(value) ) {
        // No matter WHAT (I believe) the outbound media element should be muted.
        value.muted = true; 
        if (this._.localStream) {
          // If we already have a media in and value is different than current, unset current.
          if (this.config.mediaOut && this.config.mediaOut !== value) {
            detachMediaStream(this.config.mediaOut);
          }
          // We have a stream already, just move the attachment.
          attachMediaStream(value, this._.localStream);
          // MediaOut should be muted, we should confirm it is...
          if (!value.muted) {
            l('DEBUG') && console.log(this+'.setMediaOut() element is not muted, muting.');
            value.muted = true; 
          }
          this.config.mediaOut = value;
        } else {
          // detach streams... for cleanup only.
          detachMediaStream(value);
          this.config.mediaOut = value;
        }
      } else {
        throw new TypeError('Media Element object is invalid');
      }
      return this;
    },
  /*
   * This is executed by createAnswer.  Typically, the intent is to just send the answer
   * and call setLocalDescription w/ it.  There are a couple of variations though.
   *
   * This also means we have applied (at some point) applie a remote offer as our RemoteDescriptor
   *
   * In most cases, we should be in 'have-remote-offer'
   *
   *  We have 3 options here:
   *  (have-remote-offer)
   *  1.  start a session w/ a message
   *  2.  start w/out a message
   *  3.  send message.
   *
   *  // ANSWER
   *  // PRANSWER or REAL_PRANSWER
   *
   *
   *
   */
  _gotAnswer :  function(desc) {

    l('DEBUG') && console.log(this+'.createAnswer answer created:  ', desc);

    var answer = null;
    var pcSigState = this.pc.signalingState;
    var session = this.dependencies.parent._.activeSession;
    var sessionState = session.getState();
    var PRANSWER = (pcSigState === 'have-remote-offer') && (sessionState === 'starting');
    var RESPOND = sessionState === 'pranswer' || pcSigState === 'have-local-pranswer';
    var SKIP = false;
    var message = this.createMessage(desc);
    l('DEBUG') && console.log(this+'.createAnswer._gotAnswer: pcSigState: '+pcSigState+' SIGSESSION STATE: '+ sessionState);
    if (RESPOND) {
      l('DEBUG') && console.log(this+'.createAnswer sending answer as a RESPONSE');
      //console.log(this+'.createAnswer sending answer as a RESPONSE', message);
      session.respond(true, message);
      this._setState('connected');
    } else if (PRANSWER){
      l('DEBUG') && console.log(this+'.createAnswer sending PRANSWER');
      this._setState('alerting');
      answer = {};
      answer.type = 'pranswer';
      answer.sdp = this.pranswer ? desc.sdp : '';
      desc = answer;
      session.pranswer(this.createMessage(desc));
    } else if (this.getState() === 'connected' || this.getState() === 'alerting') {
      l('DEBUG') && console.log(this+'.createAnswer sending ANSWER (renegotiation?)');
      // Should be a renegotiation, just send the answer...
      session.send(message);
    } else {
      SKIP = true;
      this._setState('alerting');
    }
    SKIP = (PRANSWER && answer && answer.sdp === '') || SKIP;
    l('DEBUG') && console.log('_gotAnswer: Skip setLocalDescription? '+ SKIP);
    if (!SKIP) {
      this.pc.setLocalDescription(desc,/*onSuccess*/ function() {
        l('DEBUG') && console.log('setLocalDescription in _gotAnswer was successful', desc);
      }.bind(this),
        /*error*/ function(message) {
        console.error(message);
      });
    }
  },

  createMessage: function(content) {
    if (content) {
      if (content.type && content.content) {
        // presumably OK, just return it
        return content;
      } else {
        return {'type':'webrtc', 'content': content};
      }
    } else {
        return {'type':'webrtc', 'content': content};
    }
  },

  /* Process inbound messages
   *
   *  These are 'PeerConnection' messages
   *  Offer/Answer/ICE Candidate, etc...
   */
  _processMessage : function(message) {
    var self = this;
    var isPC = this.pc ? true : false;
    if (!message) {
      return;
    }
    l('DEBUG') && console.log(this+"._processMessage Processing Message...", message);
    if (message.type) {
      switch(message.type) {
      case 'pranswer':
        /*
         * When a 'pranswer' is received, the target is 'THERE' and our state should
         * change to RINGING.
         *
         * Our PeerConnection is not 'stable' yet.  We still need an Answer.
         *
         */
        // Set our local description
        //  Only set state to ringing if we have a local offer...
        if (isPC && this.pc.signalingState === 'have-local-offer') {
          isPC && this.pc.setRemoteDescription(new MyRTCSessionDescription(message));
          this._setState('ringing');
        }
        break;
      case 'answer':
        /*
         *  If we get an 'answer', we should be in a state to RECEIVE the answer,
         *  meaning we can't have sent an answer and receive an answer.
         */
        l('DEBUG') && console.log(this+'._processMessage ANSWERING', message);
        /* global RTCSessionDescription: false */
        isPC && this.pc.setRemoteDescription(
          new MyRTCSessionDescription(message),
          function() {
            l('DEBUG') && console.log("Successfully set the ANSWER Description");
          },
          function(error) {
            console.error('setRemoteDescription has an Error', error);
          });
        this._setState('connected');
        break;
      case 'offer':
        /*
         * When an Offer is Received 
         * 
         * 1.  Set the RemoteDescription -- depending on that result, emit alerting.  whoever catches alerting needs to accept() in order
         * to answer;
         *
         * , we need to send an Answer, this may
         * be a renegotiation depending on our 'state' so we may or may not want
         * to inform the UI.
         */
        var offer = message;
        l('DEBUG') && console.log(this+'_processMessage received an offer -> State:  '+this.getState());
        if (this.getState() === 'disconnected') {
           self.pc.setRemoteDescription(new MyRTCSessionDescription(offer),
             /*onSuccess*/ function() {
               l('DEBUG') && console.log(this+' PRANSWER in processMessage for offer()');
                if (!self.dependencies.parent.sessionStarted()) { 
                  self.dependencies.parent._.activeSession.pranswer({'type': 'pranswer', 'sdp':''});
                }
                this._setState('alerting');
               }.bind(self),
               /*onFailure*/ function(error){
                 console.error('setRemoteDescription has an Error', error);
               });
        } else if (this.getState() === 'connected') {
          // THis should be a renegotiation.
          isPC && this.pc.setRemoteDescription(new MyRTCSessionDescription(message),
              /*onSuccess*/ function() {
                this.pc.createAnswer(this._gotAnswer.bind(this), function(error){
                  console.error('Failed to create Answer:'+error);
                });
              }.bind(this),
              /*onFailure*/ function(error){
                console.error('setRemoteDescription has an Error', error);
              });
        } else {
          l('DEBUG') && console.error(this+'_processMessage unable to process offer('+this.getState()+')', message);
        }
        break;
      case 'icecandidate':
        l('DEBUG') && console.log(this+'_processMessage iceCandidate --> message:', message);
        try {
          l('DEBUG') && console.log(this+'_processMessage iceCandidate -->', message.candidate);
          var iceCandidate = new MyRTCIceCandidate(message.candidate);
          l('DEBUG') && console.log(this+'_processMessage iceCandidate ', iceCandidate );
          isPC && this.pc.addIceCandidate(iceCandidate);
        } catch(err) {
          console.error('addIceCandidate threw an error', err);
        }
        break;
      default:
        // Pass it up out of here...
        // TODO: Fix this, should emit something different here...
        console.error(this+'._processMessage() Nothing to do with this message:', message);
      }
    } else {
      l('DEBUG') && console.log(this+'_processMessage Unknown Message', message);
    }
  },

 /**
  * Apply or update the Media configuration for the webrtc object
  * @param {object} [config]
  *
  * @param {boolean} config.enable
  * @param {object} config.broadcast
  * @param {boolean} config.broadcast.audio
  * @param {boolean} config.broadcast.video
  * @param {object} config.mediaIn
  * @param {object} config.mediaOut
  *
  * @param {function} [callback] callback called if getUserMedia enabled.
  *
  */
  setLocalMedia: function setLocalMedia(config,callback) {
    var enable = false;
    l('DEBUG') && console.log(this+'setLocalMedia() using config:', config);
    if (config && typeof config === 'object') {
      config.mediaIn && this.setMediaIn(config.mediaIn);
      config.mediaOut && this.setMediaOut(config.mediaOut);
      config.broadcast && this.setBroadcast(config.broadcast);
      enable = (typeof config.enable === 'boolean')? config.enable : enable;
    } else if (config && typeof config === 'function') {
      callback = config;
    } else {
      // using defaults
      l('DEBUG') && console.log(this+'setLocalMedia() using defaults');
    }

    var audio = this.config.broadcast.audio;
    var video = this.config.broadcast.video;
    var self = this;
    callback = callback || function(success, message) {
      l('DEBUG') && console.log(self+'.setLocalMedia() default callback(success='+success+',message='+message);
    };
    l('DEBUG') && console.log(self+'.setLocalMedia() audio['+audio+'] & video['+video+'], enable['+enable+']');

    // Enable AV or if enabled, attach it. 
    if (enable) {
      this.enableLocalAV(callback);
    }
    return this;
  },

  /**
   * Enable Local Audio/Video and attach it to the connection
   *
   * Generally called through setLocalMedia({enable:true})
   *
   * @param {object} options
   * @param {boolean} options.audio
   * @param {boolean} options.video
   * @callback 
   *
   */
  enableLocalAV: function(options, callback) {
    var self = this;
    var audio,video;
    if (options && typeof options === 'object') {
      audio = options.audio;
      video = options.video;
      // Update settings.
      this.setBroadcast({audio: audio, video: video});
    } else {
      callback = (typeof options === 'function') ? options : function(success, message) {
       l('DEBUG') && console.log(self+'.enableLocalAV() default callback(success='+success+',message='+message);
      };
      // using current settings.
      audio = this.config.broadcast.audio;
      video= this.config.broadcast.video;
    }

    var attachLocalStream = function attachLocalStream(stream){
      self.getMediaOut() && attachMediaStream(self.getMediaOut(),stream);
      if (self.pc) {
        if (self.pc.getLocalStreams()[0] === stream) {
          // Do nothing, already attached
          return true;
        } else {
          self._.localStream = stream;
          self.pc.addStream(stream);
          return true;
        }
      } else {
        l('DEBUG') && console.log(self+'.enableLocalAV() -- No peerConnection available');
        return false;
      }
    };
    
    if (audio || video ) { 
      if (this._.localStream) {
        l('DEBUG') && console.log(self+'.enableLocalAV() already setup, reattching stream');
        callback(attachLocalStream(this._.localStream));
      } else {
        getUserMedia({'audio': audio, 'video': video},
          /* onSuccess */ function(stream) {
            callback(attachLocalStream(stream));
          },
        /* onFailure */ function(error) {
          callback(false, "getUserMedia failed");
        });
      }
    } else {
      l('DEBUG') && console.log(self+'.enableLocalAV() - nothing to do; both audio & video are false');
    }
  },

 setIceServers: function(service) {
   function buildTURNobject(url) {
     // We expect this to be in form 
     // turn:<userid>@servername:port:credential:<password>
     var matches = /^turn:(\S+)\@(\S+\:\d+):credential:(.+$)/.exec(url);
     var user = matches[1] || null;
     var server = matches[2] || null;
     var credential = matches[3] || null;

     var iceServer = {
       'url': null,
       'username': null,
       'credential': null
     };
     if (user && server && credential) {
       iceServer.url = 'turn:'+server;
       iceServer.username= user;
       iceServer.credential= credential;
     } else {
       l('DEBUG') && console.log('Unable to parse the url into a Turn Server');
       iceServer = null;
     }
     return iceServer;
   }

    // Returned object expected to look something like:
    // {"iceServers":[{"url": "stun:host:port"}, {"url","turn:host:port"}] 
    var urls = [];
    if (service && service.iceURL)  {
        service.iceURL.split(',').forEach(function(url){
          // remove leading/trailing spaces
          url = url.trim();
          var obj = null;
          if (/^stun:/.test(url)) {
            l('DEBUG') && console.log(this+'.setIceServers() Is STUN: '+url);
            obj = {'url': url};
          } else if (/^turn:/.test(url)) {
            l('DEBUG') && console.log(this+'.setIceServers() Is TURN: '+url);
            obj = buildTURNobject(url);
          } else {
            l('DEBUG') && console.error('Failed to match anything, bad Ice URL: '+url);
          }
          obj && urls.push(obj);
        });
    } 
    this.config.iceServers = urls;
   },
  getIceServers: function() {
    return this.config.iceServers;
    }
 };

})()); // End of Prototype

function createPeerConnection(RTCConfiguration, RTCConstraints, /* object */ context) {
  var peerConnection = null;
  if (typeof MyRTCPeerConnection !== 'undefined'){
    l('DEBUG')&& console.log(this+" Creating PeerConnection with RTCConfiguration: " + RTCConfiguration + "and contrainsts: "+ RTCConstraints);
    peerConnection = new MyRTCPeerConnection(RTCConfiguration, RTCConstraints);

    //attach callbacks
    peerConnection.onicecandidate = function (evt) {
      l('DEBUG') && console.log(this+'onicecandidate Event',evt);
      if (evt.candidate) {
          l('DEBUG') && console.log(this+'onicecandidate Sending Ice Candidate');
          var msg = {'type': evt.type,'candidate': evt.candidate};
          this.send(msg);
      }
    }.bind(context);  // End of onicecandidate

    peerConnection.oniceconnectionstatechange = function (evt) {
      if (this.pc === null) {
        // If we are null, do nothing... Weird cases where we get here I don't understand yet.
        l('DEBUG') && console.log(this+' oniceconnectionstatechange ICE STATE CHANGE fired but this.pc is null');
        return;
      }
      l('DEBUG') && console.log(this+' oniceconnectionstatechange ICE STATE CHANGE '+ this.pc.iceConnectionState);
      // When this is connected, set our state to connected in webrtc.
      if (this.pc.iceConnectionState === 'closed') {
        // wait for it to be 'Closed'  
        this.disable();
      } else if (this.pc.iceConnectionState === 'connected') {
        this._setState('connected');
      }
    }.bind(context);  // End of oniceconnectionstatechange

    // once remote stream arrives, show it in the remote video element
    peerConnection.onaddstream = function (evt) {
      //Only called when there is a VIDEO or AUDIO stream on the remote end...
      l('DEBUG') && console.log(this+' onaddstream Remote Stream Arrived!', evt);
      l('TRACE') && console.log("TRACE onaddstream AUDIO", evt.stream.getAudioTracks());
      l('TRACE') && console.log("TRACE onaddstream Video", evt.stream.getVideoTracks());
      // This isn't really used, may remove
      if (evt.stream.getAudioTracks().length > 0) {
       // this.audio = true;
      }
      if (evt.stream.getVideoTracks().length > 0) {
       // this.video = true;
      }
      /*
       * At this point, we now know what streams are requested
       * we should see what component we have (if we do) and see which one
       * we find and confirm they are the same...
       *
       */
      // Save the stream
      context._.remoteStream = evt.stream;
      if (context.getMediaIn()) {
        l('DEBUG') && console.log(this+' onaddstream Attaching inbound stream to: ',context.getMediaIn());
        attachMediaStream(context.getMediaIn(), evt.stream);
      }
    }.bind(context);

    peerConnection.onnegotiationneeded = function(evt) {
      l('DEBUG') && console.log('ONNEGOTIATIONNEEDED : Received Event - ', evt);
      if ( this.pc.signalingState === 'stable' && this.getState() === 'CONNECTED') {
        // Only if we are stable, renegotiate!
        this.pc.createOffer(
            /*onSuccess*/ function(offer){
              this.pc.setLocalDescription(offer,
                  /*onSuccess*/ function() {
                  this.send(offer);
              }.bind(this),
                  /*onFailure*/ function(error){
                    console.error(error);
                  });


            }.bind(this),
            /*onFailure*/ function(error) {
              console.error(error);
            });
      } else {
        l('DEBUG') && console.log('ONNEGOTIATIONNEEDED Skipping renegotiate - not stable && connected. State: '+ this.pc.signalingState);
      }
    }.bind(context);

    peerConnection.onsignalingstatechange = function(evt) {
        l('DEBUG') && console.log('peerConnection onsignalingstatechange fired: ', evt);
    }.bind(context);

    peerConnection.onclosedconnection = function(evt) {
      l('DEBUG') && console.log('FIREFOX peerConnection onclosedconnection fired: ', evt);
    }.bind(context);
    peerConnection.onconnection = function(evt) {
      l('DEBUG') && console.log('FIREFOX peerConnection onconnection fired: ', evt);
    }.bind(context);

    peerConnection.onremovestream = function (evt) {
      l('DEBUG') && console.log('peerConnection onremovestream fired: ', evt);
      // Stream Removed...
      if (this.pc === null) {
        // If we are null, do nothing... Weird cases where we get here I don't understand yet.
        l('DEBUG') && console.log('peerConnection onremovestream fired: ', evt);
        return;
      }
      // TODO: Emit an event...
      // cleanup(?)
    }.bind(context);

  } else {
    throw new Error("No RTCPeerConnection Available - unsupported browser");
  }
  return peerConnection;
}  // end of createPeerConnection

/*
 *  Following are used to handle different browser implementations of WebRTC
 */
var getBrowser = function() {
    if (typeof navigator === 'undefined' && typeof window === 'undefined') {
      // probably in node.js no browser support
      return ('node.js','unknown');
    } else  if (navigator && navigator.mozGetUserMedia) {
      // firefox
      return("firefox", parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10));
    } else if (navigator && navigator.webkitGetUserMedia) {
     return("chrome", parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10));
    } else {
      return("Unknown","Unknown");
    }
  };

var MyRTCPeerConnection = (function() {
  /*global mozRTCPeerConnection:false */
  /*global webkitRTCPeerConnection:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  } else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCPeerConnection;
  } else if (navigator && navigator.webkitGetUserMedia) {
    return webkitRTCPeerConnection;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();

var MyRTCSessionDescription = (function() {
  /*global mozRTCSessionDescription:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  }  else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCSessionDescription;
  } else if (typeof RTCSessionDescription !== 'undefined' ) {
    return RTCSessionDescription;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();

l('DEBUG') && console.log("Setting RTCSessionDescription", MyRTCSessionDescription);


var MyRTCIceCandidate = (function() {
  /*global mozRTCIceCandidate:false */
  /*global RTCIceCandidate:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  } else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCIceCandidate;
  } else if (typeof RTCIceCandidate !== 'undefined') {
    return RTCIceCandidate;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();

l('DEBUG') && console.log("RTCIceCandidate", MyRTCIceCandidate);

var validMediaElement = function(element) {
  return( (typeof element.srcObject !== 'undefined') ||
      (typeof element.mozSrcObject !== 'undefined') ||
      (typeof element.src !== 'undefined'));
};

/*
 * Assign getUserMedia, attachMediaStream as private class functions
 */
var getUserMedia, attachMediaStream,detachMediaStream;
/* globals URL:false */

  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    getUserMedia = null;
    attachMediaStream = null;
    detachMediaStream = null;
  // Creating methods for Firefox
  } else if (navigator && navigator.mozGetUserMedia) {

    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    // Attach a media stream to an element.
    attachMediaStream = function(element, stream) {
      l('DEBUG') && console.log("FIREFOX --> Attaching media stream");
      try { 
        element.mozSrcObject = stream;
    //    element.play();
      } catch (e) {
        console.error('Attach Media Stream failed in FIREFOX:  ', e);
      }
    };
    detachMediaStream = function(element) {
    l('DEBUG') && console.log("FIREFOX --> Detaching media stream");
    if (element) {
      element.mozSrcObject = null;
    }
  };

} else if (navigator && navigator.webkitGetUserMedia) {
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
  attachMediaStream = function(element, stream) {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.error('Error attaching stream to element.');
    }
  };
  detachMediaStream = function(element) {
    var nullStream = '';
    if (element) {
      if (typeof element.srcObject !== 'undefined') {
        element.srcObject = nullStream;
      } else if (typeof element.mozSrcObject !== 'undefined') {
        element.mozSrcObject = nullStream;
      } else if (typeof element.src !== 'undefined') {
        element.src = nullStream;
      } else {
        console.error('Error attaching stream to element.');
      }
    }
  };
} else {
  console.error("Browser does not appear to be WebRTC-capable");
  var skip = function skip() {
    console.error("Function not supported in browser");
  };
  getUserMedia = skip;
  attachMediaStream = skip;
  detachMediaStream = skip;
}

return WebRTCConnection;

})();



return EndpointProvider;

}));
