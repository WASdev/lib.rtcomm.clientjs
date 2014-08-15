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
/**
 * @class 
 * @memberof module:rtcomm.connector
 * @classdesc
 *
 * Low level service used to create the RtcommService which connects
 * via mqtt over WebSockets to a server passed via the config object.
 *
 * @param {object}  config   - Config object for RtcService
 * @param {string}  config.server -  MQ Server for mqtt.
 * @param {integer} [config.port=1883] -  Server Port
 * @param {string}  config.userid -  Unique user id representing user
 * @param {string}  config.connectorTopicName - Default topic to register with ibmrtc Server
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
var RtcommService = function RtcommService(config) {
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
    var mqtt = null;
    if (typeof Paho.MQTT === 'object') {
      l('DEBUG') && console.log('RtcService createMqttClient using config: ', config);
      mqtt = new Paho.MQTT.Client(config.server,config.port,config.clientID);
      /* if a connection is lost, this callback is called, reconnect */
      mqtt.onConnectionLost = function(error) {
        if (error.errorCode !== 0) { // 0 means it was on purpose.
          console.error("RtcService: Connection Lost... : ", error  );
        }
      };

    } else {
      throw new Error("RtcommService depends on 'Paho.MQTT' being loaded via mqttws31.js.");
    }
    return mqtt;
  };

  // Our required properties
  this.objName = 'RtcService';
  this.dependencies = {};
  this.config = {};
  this.ready = false;
  this._init = false;
  this.id = null;
  // Events we can emit go here.
  this.events = {'message':[]};

  //config items that are required and must be the correct type or an error will be thrown
  var requiredConfig = { server: 'string', port: 'number', userid: 'string', connectorTopicName: 'string', connectorTopicPath: 'string'};
  var possibleConfig = { credentials : 'object', myTopic: 'string'};

  // the configuration for RtcService
  if (config) {
    this.config = setConfig(config,requiredConfig,possibleConfig);
  } else {
    throw new Error("RtcService instantiation requires a minimum configuration: "+ JSON.stringify(requiredConfig));
  }
  // Populate this.config
  this.config.clientID = this.config.myTopic || generateClientID();
  this.config.myTopic = this.config.myTopic || this.config.connectorTopicPath + this.config.clientID;
  this.config.destinationTopic = this.config.connectorTopicPath + this.config.connectorTopicName;
  // Save an 'ID' for this service.
  this.id = this.config.clientID;
  this.ready = false;
  // Create our MQTT Client.
  var mqttClient = this.dependencies.mqttClient = createMqttClient(this.config);

  mqttClient.onMessageArrived = function (message) {
    l('TRACE') && console.log('MQTT Raw message, ', message);
    var m = /\S+\/(.+)/g.exec(message.destinationName);
    /* rtcommMessage we emit */
    var rtcommMessage = {
        fromEndpointID : m?m[1]:null,
            content: message.payloadString
    };  
    try {
      l('MESSAGE') && console.log(this+' Received message: '+JSON.stringify(rtcommMessage));
      this.emit('message',rtcommMessage);
    } catch(e) {
      console.error('onMessageArrived callback chain failure:',e);
    }
  }.bind(this);
  // Init has be executed.

  this._init = true;

};
/* global util: false */
RtcommService.prototype  = util.RtcommBaseObject.extend(
    /** @lends module:rtcomm.connector.RtcommService.prototype */
    {
      setLogLevel: setLogLevel,
      getLogLevel: getLogLevel,
      /**
       * connect()
       */
      connect: function connect(cbOnsuccess, cbOnfailure) {
        if (!this._init) {
          throw new Error('init() must be called before calling connect()');
        }

        var mqttClient = this.dependencies.mqttClient;
        var mqttConnectOptions = {};

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
          l('DEBUG') && console.log(this+'.onFailure: RtcService.connect.onFailure - Connection Failed... ', response);
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
      /**
       *  Send a Message
       *
       *  @param {object} message -  RtcMessage to send.
       *  @param {string} [toTopic]  - Topic to send to.  Testing Only.
       *  @param {function} onSuccess
       *  @param {function} onFailure
       *
       */
      send : function(/*object */ config ) {
        if (!this.ready) {
          throw new Error('connect() must be called before calling init()');
        }
        var message = config.message,
        toTopic  = config.toTopic || this.config.destinationTopic,
        // onSuccess Callback
        onSuccess = config.onSuccess || function() {
          l('DEBUG')&& console.log(this+'.send was successful, override for more information');
        }.bind(this),
        // onFailure callback.
        onFailure = config.onFailure|| function(error) {
          l('DEBUG')&& console.log(this+'.send failed, override for more information', error);
        }.bind(this),
        messageToSend = "",
        mqttClient = this.dependencies.mqttClient;

        if (message && typeof message === 'object') {
          // Convert message for mqtt send
          messageToSend = new Paho.MQTT.Message(JSON.stringify(message.toJSON()));
        } else if (typeof message === 'string' ) {
          // If its just a string, we support sending it still, though no practical purpose for htis.
          messageToSend = new Paho.MQTT.Message(message);
        } else {
          console.error('RtcService.send: invalid message', message);
        }
        /*
         * The messaging standard is such that we will send to a topic
         * by appending our clientID as follows:  topic/<clientid>
         *
         * This can be Overridden by passing a qualified topic in as
         * toTopic, in that case we will leave it alone.
         *
         */

        // our topic should contain the topicPath -- we MUST stay in the topic Path... and we MUST append our ID after it, so...
        if (toTopic) {
          l('TRACE') && console.log(this+'.send toTopic is: '+toTopic);
          var begin = this.config.connectorTopicPath;
          var end = this.config.userid;
          var p = new RegExp("^" + begin,"g");
          toTopic = p.test(toTopic)? toTopic : begin + toTopic;
          var p2 = new RegExp(end + "$", "g");
          toTopic = p2.test(toTopic) ? toTopic: toTopic + "/" + this.config.userid;
        } 

        l('TRACE') && console.log(this+'.send using toTopic: '+toTopic);
        if (messageToSend) {
          // Append the 'userid'  We send to /service/userid
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
                  console.error('RtcService.send() failed - Timeout waiting for connect()');
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
        this.dependencies.mqttClient = null;
        // this.dependencies.mqttClient.disconnect();
        l('DEBUG') && console.log(this+'.destroy() called and finished');
      }
    }); // end of Return


