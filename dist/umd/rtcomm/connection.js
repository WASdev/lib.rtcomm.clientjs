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

  this.private = {};
  // If we have services and are configured
  // We are fully functional at this point.
  this.ready = false;
  // If we are connected
  this.connected = false;
  this._init = false;
  this._registerTimer = null;
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
      userid: 'string', 
      appContext: 'string', 
      secure: 'boolean', 
      presence: 'object'
    },
    defaults: { 
      rtcommTopicPath: rtcommTopicPath, 
      managementTopicName: 'management', 
      presence: { 
        rootTopic: rtcommTopicPath + 'sphere/',
        topic: '', // Same as rootTopic by default
      }
    }
  };

  // the configuration for Endpoint
  if (config) {
    /* global setConfig:false */
    // Set any defaults
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
  this.connectorTopicName = "nodeConnector";

  this.RTCOMM_CONNECTOR_SERVICE = {};
  this.RTCOMM_CALL_CONTROL_SERVICE = {};
  this.RTCOMM_CALL_QUEUE_SERVICE = {};

  // LWT config 
  this.private.willMessage = null;
  //create our Mqtt Layer
  this.mqttConnection = createMqttConnection(mqttConfig);
  this.mqttConnection.on('message', processMessage.bind(this));

  this.config.myTopic = this.mqttConnection.config.myTopic;
  this._init = true;
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
            connection.RTCOMM_CONNECTOR_SERVICE = services.RTCOMM_CONNECTOR_SERVICE;
            connection.connectorTopicName = services.RTCOMM_CONNECTOR_SERVICE.topic;
          }
          if (services.RTCOMM_CALL_CONTROL_SERVICE) {
            connection.RTCOMM_CALL_CONTROL_SERVICE = services.RTCOMM_CALL_CONTROL_SERVICE;
          }
          if (services.RTCOMM_CALL_QUEUE_SERVICE) {
            connection.RTCOMM_CALL_QUEUE_SERVICE = services.RTCOMM_CALL_QUEUE_SERVICE;
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

        // our topic should contain the rtcommTopicPath -- we MUST stay in the topic Path... and we MUST append our ID after it, so...
          if (topic) {
            l('TRACE') && console.log(this+'.normalizeTopic topic is: '+topic);
            var begin = this.config.rtcommTopicPath;
            adduserid = (typeof adduserid === 'boolean') ? adduserid : true;
            var end = (adduserid) ? this.config.userid: '';
            var p = new RegExp("^" + begin,"g");
            topic = p.test(topic)? topic : begin + topic;
            var p2 = new RegExp(end + "$", "g");
            topic = p2.test(topic) ? topic: topic + "/" + end;
          } else {
            if (this.connectorTopicName) { 
              topic = this.normalizeTopic(this.connectorTopicName);
            } else {
              throw new Error('normalize Topic requires connectorTopicName to be set - call serviceQuery?');
            }
          }
          l('TRACE') && console.log(this+'.getTopic returing topic: '+topic);
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
          var presenceDocument = {
            topic: '',
            endpointID: '',
            state: '',
            alias: '',
            userDefines: []
          };
          presenceDocument.topic = this.getMyTopic();
          presenceDocument.endpointID = this.getUserID();
          if (config) {
            presenceDocument.state = config.state || presenceDocument.state;
            presenceDocument.alias = config.alias || presenceDocument.alias;
            presenceDocument.userDefines = config.userDefines || presenceDocument.userDefines;
          }
          return presenceDocument;
        },
        publishPresence : function(presenceDoc) {
          this.publish(this.getMyPresenceTopic(), presenceDoc, true);
        },
        /**
         * Create a Response Message for this EndpointConnection
         */
        createResponse : function(type) {
          var message = MessageFactory.createResponse(type);
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
          var successContent = contentfield || 'peerContent';
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
            var t = this.createTransaction({message: message, toTopic: this.config.managementTopicName }, onSuccess,onFailure);
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
          if (!this._init) {
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
          this.mqttConnection.connect({'willMessage': this.getLwtMessage(),
                                       'presenceTopic' : this.getMyPresenceTopic(),
                                      'onSuccess': onSuccess.bind(this),
                                       'onFailure': onFailure.bind(this)});
         },
        disconnect : function() {
          l('DEBUG') && console.log('EndpointConnection.disconnect() called: ', this.mqttConnection);
          this.unregister();
          l('DEBUG') && console.log(this+'.disconnect() RegisterTimer should be null: '+ this._registerTimer);
          l('DEBUG') && console.log(this+'.disconnect() publishing LWT');
          this.publish(this.getMyPresenceTopic(), this.getLwtMessage());
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
         *  Register the 'userid' used in {@link module:rtcomm.RtcommEndpointProvider#init|init} with the
         *  rtcomm service so it can receive inbound requests.
         *
         *  @param {string} [userid] 
         *  @param {function} [onSuccess] Called when register completes successfully with the returned message about the userid
         *  @param {function} [onFailure] Callback executed if register fails, argument contains reason.
         */
        register : function(userid, cbSuccess, cbFailure) {
          var endpointConnection = this;
          l('DEBUG') && console.log(endpointConnection+'.register() Register Timer is set to: '+this._registerTimer);
          // Initialize the input
          if (typeof userid === 'function') { 
            cbFailure = cbSuccess;
            cbSuccess = userid;
            userid = null;
          }
          cbSuccess = cbSuccess || function(message) {
            console.log(endpointConnection+'.register() Default Success message, use callback to process:', message);
          };
          cbFailure = cbFailure || function(error) {
            console.log(endpointConnection+'.register() Default Failure message, use callback to process:', error);
          };
          var minimumReregister = 30;  // 30 seconds;
          var onSuccess = function(register_message) {
            l('DEBUG') && console.log(endpointConnection+'register() REGISTER RESPONSE: ', register_message);
            //
            // TO BE removed in the future.  Configure how to disable this.
            // Essentially, if the SERVICE_QUERY does not return an LWT topic, we know our LWT won't
            // work.  So, we need to keep our time.
            //
            if (!this.useLwt()) {
              if (register_message.orig === 'REGISTER' && register_message.expires) {
                var expires = register_message.expires;
                l('DEBUG') && console.log(endpointConnection+'.register() Message Expires in: '+ expires);
                /* We will reregister every expires/2 unless that is less than minimumReregister */
                var regAgain = expires/2>minimumReregister?expires/2:minimumReregister;
                // we have a expire in seconds, register a timer...
                l('DEBUG') && console.log(endpointConnection+'.register() Setting Timeout to:  '+regAgain*1000);
                endpointConnection._registerTimer = setTimeout(endpointConnection.register.bind(endpointConnection), regAgain*1000);
              }
            }
            endpointConnection.registered = true;
            // Call our passed in w/ no info...
            if (cbSuccess && typeof cbSuccess === 'function') {
              cbSuccess(register_message);
            } else {
              l('DEBUG') && console.log(endpointConnection + ".register() Register Succeeded (use onSuccess Callback to get the message)", register_message);
            }
          };
          // {'failureReason': 'some reason' }
          var onFailure = function(errorObject) {
            if (cbFailure && typeof cbFailure === 'function') {
              cbFailure(errorObject.failureReason);
            } else {
              console.error('Registration failed : '+errorObject.failureReason);
            }
          };

          var doRegister =  function() {
            var message = endpointConnection.createMessage('REGISTER');
            message.appContext = endpointConnection.appContext;
            message.regTopic = message.fromTopic;
            var t = endpointConnection.createTransaction({message:message}, onSuccess.bind(this), onFailure.bind(this));
            t.start();
          }.bind(this);

          /*
           * It is possible to register with an id, if one is not already set. 
           */

          if (userid) {
            this.setUserID(userid);
          }

          if (this.userid) {
            if (this.ready) {
              doRegister(true);
            } else {
              this.serviceQuery(doRegister, cbFailure);
            }
          } else {
            cbFailure('No userid to register');
          }
        },
        /**
         *  Unregister the userid associated with the EndpointConnection
         */
        unregister : function() {
          if (this._registerTimer) {
            clearTimeout(this._registerTimer);
            this._registerTimer=null;
            var message = this.createMessage('REGISTER');
            message.regTopic = message.fromTopic;
            message.appContext = this.appContext;
            message.expires = "0";
            this.send({'message':message});
            this.registered = false;
          } else {
            l('DEBUG') && console.log(this+' No registration found, cannot unregister');
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
          var toTopic = null;
          if (config) {
            toTopic = this.normalizeTopic(config.toTopic);
            this.mqttConnection.send({userid: this.config.userid, message:config.message, toTopic:toTopic});
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
          this.private.willMessage =  this.private.willMessage || ''; 
          return this.private.willMessage;
        },

        /**
         * Return the topic my presence is published to (includes user id);
         */
        getMyPresenceTopic: function() {
          this.private.presenceTopic = this.private.presenceTopic || this.normalizeTopic(this.config.presence.rootTopic + this.config.presence.topic ,true);
          l('DEBUG') && console.log(this+'.getMyPresenceTopic() returning topic: '+this.private.presenceTopic);
          return this.private.presenceTopic;
        },
        getPresenceRoot: function() {
          l('DEBUG') && console.log(this+'.getPresenceRoot() returning topic: '+ 
                                   this.normalizeTopic(this.config.presence.rootTopic));
          return this.normalizeTopic(this.config.presence.rootTopic,false);
        },
        useLwt: function() {
          if (this.RTCOMM_CONNECTOR_SERVICE.sphereTopic) {
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
      'rtcommVer': 'v0.2.0',
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
        'sigSessID':null,
        'transID':null,
        'toEndpointID': null,
        'peerContent': null,
      },
     'STOP_SESSION' : {
        'method': 'STOP_SESSION',
        'sigSessID':null,
        'peerContent': null,
      },
      'PRANSWER': {
        'method': 'PRANSWER',
        'peerContent': null
      },
      // Message is generic and could be anything... 
      'MESSAGE':{
        'method':'MESSAGE',
        'peerContent': null
      },
      'ICE_CANDIDATE':{
        'method':'ICE_CANDIDATE',
        'fromTopic': null
      },
      'REGISTER': {
        'method': 'REGISTER',
        'regTopic':null,
        'appContext':null
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
        'sigSessID': null,
        'result': null,
        'peerContent': null,
        'transID': null,
      },
      'REGISTER': {
        'orig': 'REGISTER',
        'expires': 120,
        'result': null,
        'transID': null,
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

  console.log(this+'>>>>>>> constructor config: '+JSON.stringify(this.config));

  // Populate this.config
  this.config.clientID = this.config.myTopic || generateClientID();
  this.config.myTopic = this.config.myTopic || this.config.rtcommTopicPath + this.config.clientID;
  this.config.presenceTopic = this.config.presenceTopic || this.config.rtcommTopicPath+"sphere/";
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
        
        l('DEBUG')&& console.log(this+'.connect() called with options: ', options);
        if (options) {
          cbOnsuccess = options.onSuccess || null;
          cbOnfailure = options.onFailure || null;
          willMessage = options.willMessage || null;
          presenceTopic = options.presenceTopic || null;
        }

        var mqttConnectOptions = {};

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
            console.log("No onSuccess callback... ", onSuccess);
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
            userid = config.userid,
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
  this.toTopic = null;
  this.type = 'normal'; // or refer
  this.referralDetails = null;
  this.appContext = null;

  if (config) {
    if (config.message && config.message.sigSessID) {
      // We are INBOUND. 
      this.message = config.message;
      this.id = config.message.sigSessID;
      this.appContext = config.message.appContext || null;
      this.remoteEndpointID = config.fromEndpointID || null;
      this.source = config.source || null;
      this.toTopic = config.toTopic || config.message.fromTopic || null;
      if (config.message.peerContent && config.message.peerContent.type === 'refer') {
        this.type = 'refer';
        this.referralDetails = config.message.peerContent.details;
      }
    } else {
      this.remoteEndpointID = config.remoteEndpointID || null;
      this.id = this.id || config.id;
      this.toTopic = this.toTopic || config.toTopic;
      this.appContext = this.appContext|| config.appContext;
    }
  } 

  /* global generateUUID: false */
  this.id = this.id || generateUUID();

  l('DEBUG') && console.log(this+'.constructor creating session from config: ', config);
  l('DEBUG') && console.log(this+'.constructor created session from config: ', this);
 
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
     *  config = {remoteEndpointID: something, message:  }
     */
    start : function(config) {

      if (this._startTransaction) {
        // already Started
        //
        l('DEBUG') && console.log('SigSession.start() already started/starting');
        return;
      }



      this._setupQueue();
      /*global l:false*/
      l('DEBUG') && console.log('SigSession.start() using config: ', config);
      var remoteEndpointID = this.remoteEndpointID;
      var message = null;
      if (config) {
        this.remoteEndpointID = remoteEndpointID = config.remoteEndpointID || remoteEndpointID;
        message = config.message|| null;
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
        this.message = this.createMessage('START_SESSION');
        this.message.peerContent = message || null;
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
          l('DEBUG') && console.log(this+'.sessionStarted! updating remoteEndpointID to: '+ message.fromEndpointID);
          this.remoteEndpointID = message.fromEndpointID;
        }

        this._startTransaction = null;
        //  this.processMessage(message);
        // if Inbound it means we SENT an answer. and have 'FINISHED' the transaction.
        this.emit('started', message.peerContent);
      };

      var session_failed = function(message) {
        this._startTransaction = null;
        var reason = (message && message.reason) ? message.reason : 'Session Start failed for unknown reason';
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

        if (SUCCESS) { 
          messageToSend.result = 'SUCCESS';
          messageToSend.peerContent = (this.type === 'refer') ? {type: 'refer'} : message; 
          this.state = 'started';
        } else {
          messageToSend.result = 'FAILURE';
          messageToSend.reason = message || "Unknown";
          this.state = 'failed';
        }
        // Finish the transaction
        this._startTransaction.finish(messageToSend);
        this.emit(this.state);
      } else {
        // No transaction to respond to.
        console.log('NO TRANSACTION TO RESPOND TO.');
      }
    },
    /**
     * Fail the session, this is only a RESPONSE to a START_SESSION
     */
    fail: function(message) {
      this.start();
      this.respond(false,message);
    },

    /**
     *  send a pranswer
     *  
     *  peerContent -- Message to send
     *  timeout -- in SECONDS -- timeout to wait.
     */
    pranswer : function(peerContent, timeout) {
      if (typeof peerContent !== 'number') { 
        peerContent = peerContent || {'type':'pranswer'};
      } else {
        timeout = peerContent;
        peerContent = {'type':'pranswer'};
      }
      var pranswerMessage = this.createMessage(peerContent);
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
    createMessage : function(object) {
      // We create messages for a sigSession... 
      // generally, this is what we should send, peerContent.
      var peerContent = null;
      // object could be a RAW Message... 
      // Object could be a peerContent type of message {type:offer|answer/icecandidate/user sdp/candidate/userdata: }
      //   where could infer our message type.
      // object could be a type we are going to set content...
      if (object && object.type ) { 
        peerContent = object;
      }
      var type = 'MESSAGE';
      if (peerContent) {
        type = peerContent.type === 'pranswer' ? 'PRANSWER' : 'MESSAGE';
      } else {
        type = object;
      }
      var message = this.endpointconnector.createMessage(type);
      message.toEndpointID = this.remoteEndpointID;
      message.sigSessID = this.id;
      message.peerContent = peerContent ? object : null;
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
          this.emit('queued', {'queuePosition': message.queuePosition, 'message': message.peerContent});
        } else {
          this.state = 'have_pranswer';
          this.emit('have_pranswer', message.peerContent);
        } 
        break;
      case 'ICE_CANDIDATE':
        this.emit('ice_candidate', message.peerContent);
        break;
      case 'STOP_SESSION':
        this.state='stopped';
        this.emit('stopped', message.peerContent);
        this.emit('finished');
        break;
      case 'MESSAGE':
        l('DEBUG') && console.log('Emitting event [message]', message.peerContent);
        this.emit('message', message.peerContent);
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
  this.toTopic = toTopic;
  this.message = message;
  this.onSuccess = cbSuccess || function(object) {
    console.log(this+' Response for Transaction received, requires callback for more information:', object);
  };
  this.onFailure = cbFailure || function(object) {
    console.log(this+' Transaction failed, requires callback for more information:', object);
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
