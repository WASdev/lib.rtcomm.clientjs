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
/*global l:false*/
/*global util:false*/
var SubProtocol= (function invocation() {

/**
   * @memberof module:rtcomm.EndpointConnection
   *
   * @description
   *
   * A SubProtocol behaves as follows:
   *
   * -- Random Thoughts --
   *   -- if protocols are 'enabled' then when 'connect' is called on the parent, it will call connect on the protocols.
   *
   * enable -- If our parent is connected, we 'enable' and send our OnEnabledMessage
   *        -- If our parent is not connected, we 'get ready' for a connect.
   *
   *  @constructor
   *  @extends  module:rtcomm.util.RtcommBaseObject
   */

  var protocolConfig = {
    name: '',
    config: {},
    onEnabled: function onEnabled(callback) {
      // Finished.
      callback(true, 'default');
    },
    getStartMessage: function getStartMessage(callback) {
      callback(true, 'default');
    },
    getAcceptMessage: function getAcceptMessage(callback) {
      callback(true, 'default');
    },
    getStopMessage: function getStopMessage() {
      return "";
    },
    constructMessage : function constructMessage(message) {

    },
    handleMessage : function handleMessage(message) {
    // Message should be in the format:
    // {payload content... }
    // {'message': message, 'from':from}
    //
        console.log('Should have been overridden...');
    }
  };



  var SubProtocol = function SubProtocol(object) {
    this._ = {};
    this._.enabled = false;
    // Need?
    this.config = {};
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;
    // Do maintain state
    this.state = 'disconnected';
    // TODO:  Throw error if no parent.
    this.dependencies = {
      parent: parent || null
    };
    this.events = {
      'message': [],
      'ringing': [],
      'connected': [],
      'alerting': [],
      'disconnected': []
    };

    // Merge the passed config w/ the default.
    this.protocolConfig = util.combineObjects(object, protocolConfig);
    l('DEBUG') && console.log(this+' SubProtocol constructor ', this.protocolConfig);
    // name gets assigned
    this.name = this.protocolConfig.name;
    this.config = this.protocolConfig.config;
  }; // End of Constructor
    /**
     * Send a message if connected, otherwise,
     * enables chat for subsequent RtcommEndpoint.connect();
     * @param {string} message  Message to send when enabled.
     */
  SubProtocol.prototype = util.RtcommBaseObject.extend({
    // Return message to be sent in a Start Session
    getStartMessage: function getStartMessage(callback) {
      return this.protocolConfig.getStartMessage.call(this,callback);
    },
    // Return message to be sent in a Stop Session
    getStopMessage: function getStopMessage(callback) {
      return this.protocolConfig.getStopMessage.call(this,callback);

    },
    /*
     * Default create Message -- should be overridden w/ the protocol
     */
    createMessage : function createMessage(message) {
      // default
      var protoMessage = {};
      protoMessage[this.name]= (typeof this.protocolConfig.constructMessage === 'function')  ?
        this.protocolConfig.constructMessage.call(this,message) :
          message;
      l('DEBUG') && console.log(this+'.createMessage() Created message is: ',protoMessage);
      return protoMessage;
    },

    setParent: function setParent(parent) {
      this.dependencies.parent = parent;
    },

    enable : function enable(callback) {
      // cast a message
      var parent = this.dependencies.parent;
      var connect = false;
      this.protocolConfig.onEnabled.call(this, function enableCallback(success, message){
        this._.enabled = true;
        // If our parent session is started, then call connect
        if (parent.sessionStarted()) {
          l('DEBUG') && console.log(this+'.enable() - Session Started, starting ');
          this.connect();
        }
        callback && callback(success, message);
      }.bind(this));
      return this;
    },
    /**
     * Accept an inbound connection
     */
    accept : function accept(callback) {
      var parent = this.dependencies.parent;
      l('DEBUG') && console.log(this+'.accept() -- accepting -- '+ parent.getState());
      // Only accept if enabled
      // We should be 'alerting' I think
      var acceptMessage = null;
      if (parent.getState() === 'session:alerting') {
        acceptMessage = this.enabled() ? this.connect(callback) : null;
      };
      l('DEBUG') && console.log(this+'.accept() -- finished, returning message: -- '+ acceptMessage);
      return acceptMessage;
    },

    connect : function connect(callback) {
      var self = this;
      var parent = self.dependencies.parent;
      this.getStartMessage(function connectCallback(success, startMessage) {
        if (parent.sessionStarted()) {
          this.send(startMessage);
        }
        this._setState('connected');
        callback(success,startMessage);
      }.bind(this));
    },

    /**
     * Reject an inbound session
     */
    reject : function reject() {
      // Does nothing.
      return this;
    },

    disconnect: function disconnect(callback) {
      this._setState('disconnected');
      callback(true, this.getStopMessage());
      // What if we are 'in session' but not STOPPING the whole thing... i.e. we are called directly and weould just send
      // our message?
      // TODO Figure that out.
    },
    /**
     * disable chat
     */
    disable : function disable(message) {
      if (this._.enabled) {
        this._.enabled = false;
        this.onDisabledMessage = message;
        this.send(this.onDisabledMessage);
      }
      return null;
    },
    enabled : function enabled(){
      return this._.enabled;
    },
    /**
     * send a message
     * @param {string} message  Message to send
     */
    send : function send(message) {
      var parent = this.dependencies.parent;
      if (parent._.activeSession) {
        parent._.activeSession.send(this.createMessage(message));
      }
      return this;
    },
    _processMessage: function _processMessage(message) {
      // Pass to the handleMessage (which should be defined by the implementer of this protocol)
      //
        this.protocolConfig.handleMessage.call(this,message);
      return this;
    },
    _setState : function _setState(state, object) {
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
    },
    getState : function getState() {
      return this.state;
    }
  });
  return SubProtocol;
})();
