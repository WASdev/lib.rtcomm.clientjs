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
 * @param {string}  [config.rtcommTopicName] - Default topic to register with ibmrtc Server
 * @param {string}  [config.topicPath]
 * @param {object}  [config.credentials] - Optional Credentials for mqtt server.
 *
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
        console.log('Clearing existing Timer: '+item.timer);
        clearTimeout(item.timer);
      }
      item.timer  = setTimeout(function() {
          if (item.id in registry ) {
            // didn't execute yet
            var errorMsg = item.objName + ' '+item.timer+' Timed out ['+item.id+'] '+Date();
            if (typeof registry[item.id].onFailure === 'function' ) {
              registry[item.id].onFailure({'failureReason': errorMsg});
            } else {
              l('DEBUG') && console.log(errorMsg);
            }
            delete registry[item.id];
          }
        },
        item.timeout || defaultTimeout);
      };

    var add = function(item) {
      /*global l:false*/

      l('TRACE') && console.log('Registry.add() Adding item to registry: ', item);

      item.on('finished', function() {
        this.remove(item);
      }.bind(this));

      timer && item.on('timeout_changed', function() {
        console.log('TIMEOUT CHANGED called: ', item);
        addTimer(item);
      }.bind(this));

      timer && addTimer(item);

      registry[item.id] = item;
    };

    return {
      add: add,
      remove: function(item) {
        if (item.id in registry) {
          l('DEBUG') && console.log('Removing item from registry: ', item);
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
    var topic = message.topic;
    var content = message.content;
    var fromEndpointID = message.fromEndpointID;
    var rtcommMessage = null;
    /*global MessageFactory:false*/
    try {
      rtcommMessage = MessageFactory.cast(content);
      l('DEBUG') && console.log(this+'.processMessage() processing Message', rtcommMessage);
    } catch (e) {
      l('INFO') && console.log(this+'.processMessage() Unable to cast message, emitting original message');
    }

    if (rtcommMessage && rtcommMessage.transID) {
      // this is in context of a transaction.
      if (rtcommMessage.method === 'RESPONSE') {
        // close an existing transaction we started.
        l('TRACE') && console.log(this+'.processMessage() this is a RESPONSE', rtcommMessage);
        var transaction = this.transactions.find(rtcommMessage.transID);
        if (transaction) {
          l('TRACE') && console.log(this+'.processMessage() existing transaction: ', transaction);
          transaction.finish(rtcommMessage);
        } else {
          console.error('Transaction ID: ['+rtcommMessage.transID+'] not found, nothing to do with RESPONSE:',rtcommMessage);
        }
      } else if (rtcommMessage.method === 'START_SESSION' )  {
        // Create a new session:
        this.emit('newsession', this.createSession({message:rtcommMessage, source: topic, fromEndpointID: fromEndpointID}));
      } else {
        // We have a transID, we need to pass message to it.
        // May fail? check.
        this.transactions.find(rtcommMessage.transID).emit('message',rtcommMessage);
      }
    } else if (rtcommMessage && rtcommMessage.sigSessID) {
      // has a session ID, fire it to that.
      this.emit(rtcommMessage.sigSessID, rtcommMessage);
    } else if (message.topic) {
      // If there is a topic, but it wasn't a START_SESSION, emit the WHOLE original message.
       // This should be a raw mqtt type message for any subscription that matches.
      var subs  = this.subscriptions;
      Object.keys(subs).forEach(function(key) {
         if (subs[key].regex.test(message.topic)){
           l('DEBUG') && console.log('Emitting Message to listener -> topic '+message.topic);
           subs[key].callback(message);
         }
      });
    } else {
      this.emit('message', message);
    }
  };


  /*
   * Instance Properties
   */
  this.objName = 'EndpointConnection';
  //Define events we support
  this.events = {
      'message': [],
      'newsession': []};

  // If we have services and are configured
  // We are fully functional at this point.
  this._ready = false;
  // If we are connected
  this.connected = false;
  this._init = false;

  var configDefinition = {
    required: { server: 'string', port: 'number'},
    optional: { credentials : 'object', myTopic: 'string', topicPath: 'string', rtcommTopicName: 'string', userid: 'string', secure: 'boolean'},
    defaults: { topicPath: '/rtcomm/', rtcommTopicName: 'management'}
  };

  // the configuration for Endpoint
  if (config) {
    /* global setConfig:false */
    // Set any defaults
    this.config = setConfig(config,configDefinition);
  } else {
    throw new Error("EndpointConnection instantiation requires a minimum configuration: "+ JSON.stringify(configDefinition));
  }
  l('DEBUG') && console.log('EndpointConnection constructor config: ', this.config);

  this.id = this.config.userid || 'unset';

  var mqttConfig = { server: this.config.server,
                     port: this.config.port,
                     topicPath: this.config.topicPath ,
                     credentials: this.config.credentials || null,
                     myTopic: this.config.myTopic || null };

  //Registry Store for Session & Transactions
  this.sessions = new Registry();
  this.transactions = new Registry(true);
  this.subscriptions = {};

  // Services Config.
  this.RTCOMM_CONNECTOR_SERVICE = {};
  this.connectorTopicName = "";
  this.RTCOMM_CALL_CONTROL_SERVICE = {};
  this.RTCOMM_CALL_QUEUE_SERVICE = {};

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
      var registerTimer = null;

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
                    .replace(/\/#$/g,'\\/.+')
                    .replace(/(\\)?\//g, function($0, $1){
                      return $1 ? $0 : '\\/';
                    });
        console.log('regex string: '+regex);
        // The ^ at the beginning in the return ensures that it STARTS w/ the topic passed.
        return new RegExp('^'+regex);
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

        normalizeTopic: function normalizeTopic(topic) {
        /*
         * The messaging standard is such that we will send to a topic
         * by appending our clientID as follows:  topic/<clientid>
         *
         * This can be Overridden by passing a qualified topic in as
         * toTopic, in that case we will leave it alone.
         *
         */

        // our topic should contain the topicPath -- we MUST stay in the topic Path... and we MUST append our ID after it, so...

          if (topic) {
            l('TRACE') && console.log(this+'.send toTopic is: '+topic);
            var begin = this.config.topicPath;
            var end = this.config.userid;
            var p = new RegExp("^" + begin,"g");
            topic = p.test(topic)? topic : begin + topic;
            var p2 = new RegExp(end + "$", "g");
            topic = p2.test(topic) ? topic: topic + "/" + end;
          } else {
            console.log('REMOVE ME! recursively claling normalize topic w/ topic:', topic);
            topic = this.normalizeTopic(this.connectorTopicName);
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
            var t = this.createTransaction({message: message, toTopic: this.config.rtcommTopicName }, onSuccess,onFailure);
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
          this.mqttConnection.connect(onSuccess.bind(this),onFailure.bind(this));
        },
        disconnect : function() {
          l('DEBUG') && console.log('EndpointConnection.disconnect() called: ', this.mqttConnection);
          this.mqttConnection.destroy();
          l('DEBUG') && console.log('destroyed mqttConnection');
          this.mqttConnection = null;
          this.connected = false;
          this.ready = false;
        },
        /**
         * Service Query for supported services by endpointConnection
         */
        serviceQuery: function(cbSuccess, cbFailure) {
          var self = this;
          util.whenTrue(
            /*true */ function() {
              return this.connected;
            }.bind(this),
            /*action*/ function(success) {
              if(success) {
                var message = this.createMessage('SERVICE_QUERY');
                this._query(message, 'services',
                       function(services) {
                          parseServices(services,self);
                          self.ready = true;
                          cbSuccess(services);
                        },
                        cbFailure);
               } else {
                 console.error('Unable to execute service query, not connected');
               }
              }.bind(this),
          1500);  
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
        publish: function(topic, message) {
          this.mqttConnection.publish(topic, message);
        },

        destroy : function() {
          if (this.connected) {
            this.disconnect();
          }
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
        /**
         * set the userid
         */
        setUserID : function(id) {
          id = id || createGuestUserID();
          if (this.id === 'unset') {
            // Set the id to what was passed.
            this.id = id;
            return id;
          } else {
            console.error(this+'.setUserID() ID already set, cannot be changed: '+ this.id);
            return id;
           }
        }
    };
  })()
);
