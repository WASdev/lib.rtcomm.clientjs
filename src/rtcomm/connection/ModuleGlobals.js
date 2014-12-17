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
              console.log(logMessage, css, remainder);
            } else {
              console.log(logMessage,css);
            }
          } else {
            if (remainder) {
              console.log(logMessage, remainder);
            } else {
              console.log(logMessage);
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
