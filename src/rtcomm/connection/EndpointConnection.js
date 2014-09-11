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
 * @param {string}  config.userid -  Unique user id representing user
 * @param {string}  config.connectorTopicName - Default topic to register with ibmrtc Server
 * @param {string}  [config.connectorTopicPath]
 *  @param {object}  [config.credentials] - Optional Credentials for mqtt server.
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

var EndpointConnection = function(config) {
  /*
   * Registery Object 
   */
  function Registry(timer) {
    timer = timer || false;
    var registry = {};
    var defaultTimeout = 5000;

    var add = function(item) {

      l('TRACE') && console.log('Registry.add() Adding item to registry: ', item);
      item.on('finished', function() {
        this.remove(item);
      }.bind(this));

      registry[item.id] = item;
      // Set a timeout for transaction
      if (timer) {
        setTimeout(function() {
          if ( item.id in registry ) {
            // didn't execute yet
            var errorMsg = 'Registry timed out ['+item.id+']';
            if (typeof registry[item.id].onFailure === 'function' ) {
              l('DEBUG') && console.log(errorMsg);
              registry[item.id].onFailure({'failureReason': errorMsg});
            } else {
              l('DEBUG') && console.log(errorMsg);
            }
            delete registry[item.id];
          }
        },
        item.timeout || defaultTimeout);
      }
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
   * create an RtcommService for use by the EndpointConnection
   */ 
  var createRtcommService = function(config) {
    var rtcService = new RtcommService(config);
    return rtcService; 
  };
  /*
   * Process a message, expects a bind(this) attached.
   */
  var processMessage = function(message) {
    var content = message.content;
    var fromEndpointID = message.fromEndpointID;
    var rtcommMessage = MessageFactory.cast(content);
    l('DEBUG') && console.log(this+'.processMessage() processing Message', rtcommMessage);
    if (rtcommMessage.transID) {
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
        this.emit('newsession', this.createSession({message:rtcommMessage, fromEndpointID: fromEndpointID}));
      } else {
        // We have a transID, we need to pass message to it.
        // May fail? check.
        this.transactions.find(rtcommMessage.transID).emit('message',rtcommMessage);
      }
    } else if (rtcommMessage.sigSessID) {
      // has a session ID, fire it to that.
      this.emit(rtcommMessage.sigSessID, rtcommMessage);
    } else {
      this.emit('message', rtcommMessage);
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
  this.registered = false;
//Define configuration
  this.config = {
  };
  this.ready = false;
  this._init = false;
  this.id = config.userid;

//Registry Store for Session & Transactions
  this.sessions = new Registry();
  this.transactions = new Registry(true);

//create our Service
  this.rtcService = createRtcommService(config);
  this.rtcService.on('message', processMessage.bind(this));
//Define configuration
  this.config = {
      userid  : config.userid,
      myTopic : this.rtcService.config.myTopic
  };
  this._init = true;
};

EndpointConnection.prototype = util.RtcommBaseObject.extend (
    (function() {
      /*
       * Class Globals
       */
      var registerTimer = null;

      /** @lends module:rtcomm.connector.EndpointConnection.prototype */
      return {
        /*
         * Instance Methods
         */


        setLogLevel: setLogLevel,
        getLogLevel: getLogLevel,
        /* Factory Methods */
        /**
         * Create a message for this EndpointConnection
         */
        createMessage: function(type) {
          if (!this.ready) {
            throw new Error('not Ready -- call connect() first');
          }
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
          if (!this.ready) {
            throw new Error('not Ready -- call connect() first');
          }
          var message = MessageFactory.createResponse(type);
          return message;
        },
        /**
         * Create a Transaction
         */
        createTransaction : function(options,onSuccess,onFailure) {
          if (!this.ready) {
            throw new Error('not Ready -- call connect() first');
          }
          // options = {message: message, timeout:timeout}
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
          if (!this.ready) {
            throw new Error('not Ready -- call connect() first');
          }
          // start a transaction of type START_SESSION
          // createSession({message:rtcommMessage, fromEndpointID: fromEndpointID}));
          // if message & fromEndpointID -- we are inbound..
          var session = new SigSession(config);
          session.endpointconnector = this;
          // apply EndpointConnection
          this.createEvent(session.id);
          this.on(session.id,session.processMessage.bind(session));
          this.sessions.add(session);
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
          if (this.ready) {
            var t = this.createTransaction({message: message}, onSuccess,onFailure);
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
          if (!this._init) {
            throw new Error('not initialized -- call init() first');
          }
          if (this.ready) {
            throw new Error(this+".connect() is already connected!");
          }
          var onSuccess = function(service) {
            this.ready = true;
            l('DEBUG') && console.log('EndpointConnection.connect() Success, calling callback - service:', service);
            if (cbSuccess && typeof cbSuccess === 'function') {
              cbSuccess(service);
            } else {
              console.log('No callback, but connect was successful');
            }
          };
          var onFailure = function() {
            this.ready = false;
            if (cbFailure && typeof cbFailure === 'function') {
              cbFailure;
              console.log('No callback, connect failed');
            }
          };

          this.rtcService.connect(onSuccess.bind(this),onFailure.bind(this));
        },
        disconnect : function() {
          l('DEBUG') && console.log('EndpointConnection.disconnect() called: ', this.rtcService);
          if (this.registered) {
            this.unregister();
            this.registered = false;
          }
          this.rtcService.destroy();
          l('DEBUG') && console.log('destroyed rtcService');
          this.rtcService = null;
          this.ready = false;
        },
        /**
         * Service Query for supported services by endpointConnection
         */
        service_query: function(cbSuccess, cbFailure) {
          if (this.ready) {
            var message = this.createMessage('SERVICE_QUERY');
            this._query(message, 'services',cbSuccess,cbFailure);
          } else {
            console.error('not ready');
          }
        },

        destroy : function() {
          if (this.ready) {
            this.disconnect();
          }
        },
        /**
         * Send a message
         * 
         */
        send : function(config) {
          if (!this.ready) {
            throw new Error('not Ready -- call connect() first');
          }

          if (config) { 
            this.rtcService.send({message:config.message, toTopic:config.toTopic});
          } else {
            console.error('EndpointConnection.send() Nothing to send');
          }
        }
      };
    })()
);
