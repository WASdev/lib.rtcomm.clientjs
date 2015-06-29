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
      l('DEBUG') && console.log(this+'.enable() - current state --> '+ this.state);

      this.onEnabledMessage = message || createChatMessage(parent.userid + ' has initiated a Chat with you');
      // Don't need much, just set enabled to true.
      // Default message
      this._.enabled = true;
      
      if (parent.sessionStarted()) {
        l('DEBUG') && console.log(this+'.enable() - Session Started, connecting chat');
        this._connect();
      } else { 
        l('DEBUG') && console.log(this+'.enable() - Session not starting, may respond, but also connecting chat');
        parent._.activeSession && parent._.activeSession.respond();
        this._connect();
      }
      return this;
    };
    /**
     * Accept an inbound connection  
     */
    this.accept = function(message) {
      l('DEBUG') && console.log(this+'.accept() -- accepting -- '+ this.state);
      if (this.state === 'alerting') {
        this.enable(message || 'Accepting chat connection');
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
    this._connect = function(sendMethod) {
      sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
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
      if (this.state === 'connected') {
        this.emit('message', message);
      } else {
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

  };
  Chat.prototype = util.RtcommBaseObject.extend({});

  return Chat;

})();
