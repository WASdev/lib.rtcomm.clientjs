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

