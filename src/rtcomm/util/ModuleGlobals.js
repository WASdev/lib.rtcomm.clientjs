/**
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
    l = logging.l,
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
validateConfig = function validateConfig(/* object */ config, /* object */ reference) {
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
},
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
applyConfig = function applyConfig(config, obj, lenient ) {
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
},


/*
 * setConfig
 *  @param configDefinition { required: {}, optional: {}, defaults{}}
 *  @param config config to check and apply defaults 
 */
setConfig = function(config,configDefinition) {
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
        configObj[key] = config[key];
      } else{
        throw new Error(key + ' is an invalid property for '+ JSON.stringify(configObj) );
      }
    }
    return configObj;
  } else {
    throw new Error("A minumum config is required: " + JSON.stringify(requiredConfig));
  }
},
/*
 * combine left object with right object
 * left object takes precendence
 */
combineObjects = function combineObjects(obj1, obj2) {
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
},

makeCopy = function(obj) {
  var returnObject = {};;
  Object.keys(obj).forEach(function(key){
    returnObject[key] = obj[key];
  });
  return returnObject;
},

Event = function() {
  /** so, no matter what is passed, let's return a:
  * {name:
  *  object: }
  */
  var event = {};
  // options: string --> Message
  //          object --> (is it an Event, cast it...)
  //  string, string (name,message)
  //  string,string,object

  var args = [].slice.call(arguments);
  if (args.length === 0 ) {
    event.name = "message";
    event.object = {};
 } else if (args.length === 1 ) {
    var arg = args[0];
    if (typeof arg === 'string') {
      event.name = 'message';
      event.message = arg;
    } else if (typeof arg === 'object') {
      if (arg.name && arg.message) {
        event = arg;

      } else {
        console.error("Invalid Object to create Event(must have name/message): ", arg);
      }

    } else {
      console.error("Invalid args to create Event(must have name/message): ", arg);
    }
  } else if (args.length === 2) {
    event.name = args[0];
    event.message = args[1];
  } else if (args.length === 3){
    event.name = args[0];
    event.message = args[1];
    event.object = args[2];
  } else {
    console.error("Too many arguments passed: ", args);
  }
  return event;
},

whenTrue = function(func1, callback, timeout) {
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


