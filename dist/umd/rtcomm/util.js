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

/*! lib.rtcomm.clientjs 1.0.0-beta.8 29-12-2014 */
console.log('lib.rtcomm.clientjs 1.0.0-beta.8 29-12-2014');
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
console.log('logging already set? ', logging);

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
  console.log(this+'.setConfig() passed in: -->  '+JSON.stringify(config));
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
          configObj[key] = config[key];
        }
      } else{
        throw new Error(key + ' is an invalid property for '+ JSON.stringify(configObj) );
      }
    }
    console.log(this+'.setConfig() Returning -->  '+JSON.stringify(configObj));
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
