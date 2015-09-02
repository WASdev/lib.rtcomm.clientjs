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
var Chat = (function invocation() {
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
      return {'chat':{'message': message, 'from': parent.userid}};
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
    /**
     * Send a message if connected, otherwise, 
     * enables chat for subsequent RtcommEndpoint.connect();
     * @param {string} message  Message to send when enabled.
     */  
    this.enable =  function(message) {
      var connect = false;
      if (typeof message === 'object') {
        if (typeof message.connect === 'boolean') {
          connect = message.connect;
        }
        if (message.message) {
          message = message.message;
        } else {
          message = null;
        }
      } 

      /*
       * TODO:  Get this working, write new tests too!  
       *
       * Remember, all sessions support CHAT be default so we should 'just work'
       *
       * Work on this over weekend!!!!
       *
       */
      l('DEBUG') && console.log(this+'.enable() - message --> '+ message);
      l('DEBUG') && console.log(this+'.enable() - --> '+ connect);
      l('DEBUG') && console.log(this+'.enable() - current state --> '+ this.state);
      this.onEnabledMessage = message || createChatMessage(parent.userid + ' has initiated a Chat with you');
      // Don't need much, just set enabled to true.
      // Default message
      this._.enabled = true;

      if (parent.sessionStarted()) {
        l('DEBUG') && console.log(this+'.enable() - Session Started, connecting chat');
        this._connect();
      } else { 
        if (connect) {
          // we are expected to actually connect
          this._connect();
        } else {
          l('DEBUG') && console.log(this+'.enable() - Session not starting, may respond, but also connecting chat');
          // respond to a session if we are active
          parent._.activeSession && parent._.activeSession.respond();
        }
      }
      return this;
    };
    /**
     * Accept an inbound connection  
     */
    this.accept = function(callback) {
      l('DEBUG') && console.log(this+'.accept() -- accepting -- '+ this.state);
      if (this.state === 'alerting') {
        this.enable(callback|| 'Accepting chat connection');
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
    this.enabled = function enabled(){ 
      return this._.enabled;
    };
    /**
     * send a chat message
     * @param {string} message  Message to send
     */
    this.send = function(message) {
      message = (message && message.payload) ? message.payload: message;
      message = (message && message.chat)  ? message : createChatMessage(message);
      if (parent._.activeSession) {
        parent._.activeSession.send(message);
      }
    };

    this.connect = function() {
      if (this.dependencies.parent.autoEnable) {
        this.enable({connect:true});
      } else {
        this._connect();
      }
    };
    this._connect = function() {
      var self = this;
      var sendMethod = null;
      var parent = self.dependencies.parent;
      if (parent.sessionStarted()) {
        sendMethod = this.send.bind(this);
      } else if (parent._.activeSession ) {
        sendMethod = parent._.activeSession.start.bind(parent._.activeSession);
      } else {
        throw new Error(self+'._connect() unable to find a sendMethod');
      }
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
      var parent = this.dependencies.parent;
      if (this.state === 'connected') {
        this.emit('message', message);
      } else if (this.state === 'alerting') {
        // dropping message, not in a state to receive it.
        l('DEBUG') && console.log(this+ '_processMessage() Dropping message -- unable to receive in alerting state'); 
      } else {
        // If we aren't stopped, then we should pranswer it and alert.
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

    this.getState = function() {
      return this.state;
    };
  };
  Chat.prototype = util.RtcommBaseObject.extend({});

  return Chat;

})();
