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
 *  @memberof module:rtcomm
 *  @description
 *  This object can only be created with the {@link module:rtcomm.EndpointProvider#getRtcommEndpoint|getRtcommEndpoint} function.
 *  <p>
 *  The RtcommEndpoint object provides an interface for the UI Developer to attach Video and Audio input/output.
 *  Essentially mapping a broadcast stream(a MediaStream that is intended to be sent) to a RTCPeerConnection output
 *  stream.   When an inbound stream is added to a RTCPeerConnection, then this also informs the RTCPeerConnection
 *  where to send that stream in the User Interface.
 *  <p>
 *  See the example under {@link module:rtcomm.EndpointProvider#getRtcommEndpoint|getRtcommEndpoint}
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
 */
/*global: l:false*/
/*global: generateUUID:false*/
/*global: util:false*/

var RtcommEndpoint = (function invocation(){

  var Chat = function Chat(parent) {
    // Does this matter?
    var createChatMessage = function(message) {
      return {'type':'user', 'userdata': {'message': message, 'from': parent.userid}};
    };
    var chat = this;
    this._ = {};
    this._.objName = 'Chat';
    this._.parentConnected = false;
    this._.enabled = false;
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;
    this.state = 'disconnected';

    this.events = {
      'message': [],
      'connected': [],
      'alerting': [],
      'disconnected': []
    };
    /*
     * When you call enable() if we are connected we will send a message.
     * otherwise, you should call enable() prior to connect and when connect occurs
     * it will do what is enabled... 
     */  
    this.enable =  function(message) {
      this.onEnabledMessage = message || createChatMessage(parent.userid + ' has initiated a Chat with you');
      // Don't need much, just set enabled to true.
      // Default message
      this._.enabled = true;
      if (parent.sessionStarted()) {
        this._connect();
      }
      return this;
    };
    this.accept = function(message) {
      if (this.state === 'alerting') {
        this.enable(message || 'Accepting chat connection');
      }
    };
    this.reject = function() {
      // Does nothing.
    };
    this.disable = function(message) {
      if (this._.enabled) { 
        this._.enabled = false;
        this.onDisabledMessage = message|| createChatMessage(parent.userid + ' has left the chat');
        this.send(this.onDisabledMessage);
        this._setState('disconnected');
      }
      return null;
    };
    this.send = function(message) {
      message = (message && message.message) ? message.message : message;
      message = (message && message.type === 'user') ? message : createChatMessage(message);
      if (parent._.activeSession) {
        parent._.activeSession.send(message);
      }
    };
    this._connect = function(sendMethod) {
      sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
      if (this._.enabled) {
        this.onEnabledMessage && sendMethod({message: this.onEnabledMessage});
        this._setState('connected');
        return true;
      } else {
        console.log('!!!!! not enabled, skipping...'); 
        return false;
      }
    };
    this._processMessage = function(message) {
      // If we are connected, emit the message
      if (this.state === 'connected') {
        if (message.type === 'user') { 
          this.emit('message', message.userdata);
        } 
      } else {
        if (!parent.sessionStopped()) {
          this._setState('alerting', {'message': message.userdata});
        }
      }
      return this;
    };
    this._setState = function(state, object) {
      try {
        this.emit(state, object);
        this.state = state;
      } catch(error) {
        console.error(this+'._setState() unsupported state');
      }
    };

  };
  Chat.prototype = util.RtcommBaseObject.extend({});

  var createChat = function createChat(parent) {
    var chat = new Chat(parent);
    chat.on('message', function(message) {
      parent.emit('chat:message', {'message': message});
    });
    chat.on('alerting', function(message) {
      parent.emit('session:alerting', {'protocols': 'chat', 'message': message});
    });
    chat.on('connected', function() {
      parent.emit('chat:connected');
    });
    chat.on('disconnected', function() {
      parent.emit('chat:disconnected');
    });

    return chat;
  };


  var createWebRTCConnection = function createWebRTCConnection(parent) {
    /* globals WebRTCConnection:false */
    var webrtc = new WebRTCConnection(parent);
    webrtc.on('ringing', function(event_obj) {
      parent.emit('session:ringing');
    });
    webrtc.on('alerting', function(event_obj) {
      parent.emit('session:alerting', {protocols: 'webrtc'});
    });
    webrtc.on('connected', function(event_obj) {
      parent.emit('webrtc:connected');
    });
    webrtc.on('disconnected', function(event_obj) {
      parent.emit('webrtc:disconnected');
    });
    return webrtc;
  };

  var RtcommEndpoint = function RtcommEndpoint(config) {
    // Presuming you creat an object based on this one, 
    // you must override the ession event handler and
    // then augment newSession object.
    this.config = {
      appContext : null,
      userid: null,
      autoAnswer: false,
      chat: true,
      webrtc: true
    };

    this.dependencies = {
      endpointConnection: null,
    };
    // Private info.
    this._ = {
      objName: 'RtcommEndpoint',
      referralSession: null,
      activeSession: null,
      available: true,
      uuid: generateUUID(),
      initialized : false,
      // webrtc Only 
      inboundMedia: null,
      attachMedia: false,
      localStream : null,
      media : { In : null,
               Out: null},
    };
    var self = this;
    config && Object.keys(config).forEach(function(key) {
      self.config[key] = config[key];
    });
    // expose the ID
    this.id = this._.uuid;
    this.userid = this.config.userid || null;
    this.appContext = this.config.appContext || null;
    this.webrtc = (this.config.webrtc)?createWebRTCConnection(this): null;
    this.chat = (this.config.chat) ? createChat(this): null;
    // Enable chat by default if it is set up that way.
    //this.chat && this.chat.enable();

    /** 
     * RtcommEndpoint Event type 
     *
     *  @typedef {Object} module:rtcomm.RtcommEndpoint~Event
     *  @property {name} eventName 
     *  @property {object} endpointObject - an object passed with the event
     *
     */

    this.events = {
        /**
         * A signaling session to a peer has been established
         * @event module:rtcomm.RtcommEndpoint#connected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         * 
         */
        "session:started": [],
        /**
         * An inbound request to establish a call via 
         * 3PCC was initiated
         *
         * Who asked to connect to?
         * TODO: Extra details...
         */
        "session:refer": [],
        /**
         * A peer has been reached, but not connected (inbound/outound)
         * @event module:rtcomm.RtcommEndpoint#ringing
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:ringing": [],
        /**
         * An inbound connection is being requested.
         * @event module:rtcomm.RtcommEndpoint#incoming
         * @property {module:rtcomm.WebRTCConnection}
         *
         * TODO:  Protocols 
         * protocols: [webrtc, chat, etc...]
         */
        "session:alerting": [],
        /**
         *  reason added
         *  TODO: Extra details...
         */
        "session:failed": [],
        /**
         *  reason added
         *  TODO: Extra details...
         */
        "session:rejected": [],
        /**
         * propogate through chat/webrtc.  
         *
         */
        "session:stopped": [],
        /**
         * A PeerConnection to a peer has been established
         * @event module:rtcomm.RtcommEndpoint#connected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "webrtc:connected": [],
        /**
         * The connection to a peer has been closed
         * @event module:rtcomm.RtcommEndpoint#disconnected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "webrtc:disconnected": [],
        /**
         * Creating the connection to a peer failed
         * @event module:rtcomm.RtcommEndpoint#failed
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'webrtc:failed': [],
        /**
         * A message has arrived from a peer
         * @event module:rtcomm.RtcommEndpoint#message
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:message': [],
        'chat:connected': [],
        'chat:disconnected':[],
        /**
         * The endpoint has destroyed itself, clean it up.
         * @event module:rtcomm.RtcommEndpoint#destroyed
         * @property {module:rtcomm.RtcommEndpoint}
         */
        'destroyed': [],
    };
  };
/*globals util:false*/
/*globals l:false*/
RtcommEndpoint.prototype = util.RtcommBaseObject.extend((function() {
  function createSignalingSession(remoteEndpointID, context) {
    l('DEBUG') && console.log("createSignalingSession context: ", context);
    var sessid = null;
    var toTopic = null;
    if (context._.referralSession) {
      var details = context._.referralSession.referralDetails;
      sessid =  (details && details.sessionID) ? details.sessionID : null;
      remoteEndpointID =  (details && details.remoteEndpointID) ? details.remoteEndpointID : null;
      toTopic =  (details && details.toTopic) ? details.toTopic : null;
    }
    if (!remoteEndpointID) {
      throw new Error('toEndpointID must be set');
    }
    var session = context.dependencies.endpointConnection.createSession({
      id : sessid,
      toTopic : toTopic,
      remoteEndpointID: remoteEndpointID,
      appContext: context.config.appContext
    });
    return session;
  }
  // Protocol Specific handling of the session content. 
  //
  function addSessionCallbacks(context, session) {
     // Define our callbacks for the session.
    session.on('pranswer', function(content){
      context._processMessage(content);
    });
    session.on('message', function(content){
      l('DEBUG') && console.log('SigSession callback called to process content: ', content);
      context._processMessage(content);
    });
    session.on('started', function(content){
      // Our Session is started!
      content && context._processMessage(content);
      if (context._.referralSession) {
        context._.referralSession.respond(true);
      }
      context.emit('session:started');
    });
    session.on('stopped', function(message) {
      // In this case, we should disconnect();
      console.log('Session Stopped');
      context.disconnect();
    });
    session.on('starting', function() {
      console.log('Session Starting');
    });
    session.on('failed', function(message) {
      context.disconnect();
      context.emit('session:failed',{reason: message});
    });
    l('DEBUG') && console.log('createSignalingSession created!', session);
   // session.listEvents();
    return true;
  }

return  {
  getAppContext:function() {return this.config.appContext;},
  newSession: function(session) {
      var event = null;
      var msg = null;
      // If there is a session.appContext, it must match unless this.ignoreAppContext is set 
      if (this.ignoreAppContext || 
         (session.appContext && (session.appContext === this.getAppContext())) || 
         (typeof session.appContext === 'undefined' && session.type === 'refer')) {
        // We match appContexts (or don't care)
        if (this.available()){
          // We are available (we can mark ourselves busy to not accept the call)
          // TODO:  Fix the inbound session to always alert.
          if (session.type === 'refer') {
            l('DEBUG') && console.log(this + '.newSession() REFER');
            event = 'session:refer';
          }
         // Save the session and start it.
         this._.activeSession = session;
         addSessionCallbacks(this,session);
         session.start();
         // Now, depending on the session.message (i.e its peerContent or future content) then do something. 
         //  For an inbound session, we have several scenarios:
         //
         //  1. peerContent === webrtc 
         //    -- we need to send a pranswer, create our webrtc endpoint, and 'answer'
         //
         //  2. peerContent === chat
         //    -- it is chat content, emit it out, but respond and set up the session.
         //
         if (session.message && session.message.peerContent) {
           // If it is chat. be consistent and pass to 
           if (session.message.peerContent.type === 'user') {
             session.respond();
           } 
           // If we need to pranswer, processMessage can handle it.
           this._processMessage(session.message.peerContent);
         } else {
           this.emit('session:alerting', {protocols:''})
           //session.respond();
         }
         this.available(false);
        } else {
          msg = 'Busy';
          l('DEBUG') && console.log(this+'.newSession() '+msg);
          session.fail('Busy');
        }
      } else {
        msg = 'Client is unable to accept a mismatched appContext: ('+session.appContext+') <> ('+this.getAppContext()+')';
        l('DEBUG') && console.log(this+'.newSession() '+msg);
        session.fail(msg);
      }
  },
  _processMessage: function(content) {
    // basically a protocol router...
    if (content) {
      if (content.type === 'user') { 
      // It is a chat this will change to something different later on...
      if (this.config.chat) { 
          this.chat._processMessage(content);
          //this.emit('chat:message', content.userdata);
        } else {
          console.error('Received chat message, but chat not supported!');
        }
      } else {
        if (this.config.webrtc) { 
          this.webrtc._processMessage(content);
        } else {
          console.error('Received webrtc message, but webrtc not supported!');
        }
      }
    }
  },
    available: function(a) {
      if (a) {
        if (typeof a === 'boolean') { 
          this._.available = a;
          return a;
        } 
      } else  {
        return this._.available;
      }
    },

  connect: function(endpointid) {

    this._.activeSession = createSignalingSession(endpointid, this);
    addSessionCallbacks(this, this._.activeSession);

    if (this.config.webrtc && this.webrtc._connect(this._.activeSession.start.bind(this._.activeSession))) {
      l('DEBUG') && console.log(this+'.connect() initiating with webrtc._connect');
    } else if (this.config.chat && this.chat._connect(this._.activeSession.start.bind(this._.activeSession))){
      l('DEBUG') && console.log(this+'.connect() initiating with chat._connect');
    } else {
      l('DEBUG') && console.log(this+'.connect() sending startMessage w/ no content');
      this._.activeSession.start();
    }
    return this;
  },

  disconnect: function() {
    this.webrtc && this.webrtc.disable();
    this.chat && this.chat.disable();
    if (this.sessionStarted()) {
      this._.activeSession.stop();
      this._.activeSession = null;
      this.emit('session:stopped');
    }
    return this;
  },


  accept: function(options) {
    this.webrtc && this.webrtc.accept(options);
    this.chat && this.chat.accept(options);

    // If the above 2 don't start the session, go ahead and respond.
    if (!this.sessionStarted()) {
      this._.activeSession.respond();
    }
    return this;
  },

  reject: function() {
      l('DEBUG') && console.log(this + ".reject() invoked ");
      this.webrtc.reject();
      this.chat.reject();
      this._.activeSession && this._.activeSession.fail("The user rejected the call");
      this._.activeSession = null;
      this.available(true);
      return this;
  },
  setEndpointConnection: function(connection) {
    this.dependencies.endpointConnection = connection;
  },
  setInboundMediaStream: function(stream) {
    this._.inboundMedia=URL.createObjectURL(stream);
    if (this.getMediaIn()) {
      this.attachMediaStream(this.getMediaIn(), stream);
    }
  },
  getInboundMediaStream: function() { return this._.inboundMedia;},
  getUserID : function(userid) {
      return this.config.userid; 
  },
  setUserID : function(userid) {
      this.userid = this.config.userid = userid;
  },

  sessionStarted: function() {
    return (this._.activeSession && this._.activeSession.getState() === 'started') 
  },

  /**
   * session doesn't exist or is stopped
   */

  sessionStopped: function() {
    var state = (this._.activeSession) ? (this._.activeSession.getState() === 'stopped'): true;
    return state;
  },
  getRemoteEndpointID: function() {
    return this._.activeSession ? this._.activeSession.remoteEndpointID : 'none';
  },
  getLocalEndpointID: function() {
    return this.userid;
  },
  /**
   *  Destroy this endpoint.  Cleans up everything and disconnects any and all connections
   *
   */
  destroy : function() {
    l('DEBUG') && console.log(this+'.destroy Destroying RtcommEndpoint');
    this.emit('destroyed');
    this.disconnect();
    // this.getLocalStream() && this.getLocalStream().stop();
    l('DEBUG') && console.log(this+'.destroy() - detaching media streams');
    //detachMediaStream && detachMediaStream(this.getMediaIn());
    //detachMediaStream && detachMediaStream(this.getMediaOut());
    l('DEBUG') && console.log(this+'.destroy() - Finished');
  },

  _Event : function Event(event, object) {
      var RtcommEvent =  {
        eventName: '',
        endpoint: null
      };

      RtcommEvent.eventName= event;
      RtcommEvent.endpoint= this;
      if (typeof object === 'object') {
        Object.keys(object).forEach(function(key) { 
          RtcommEvent[key] = object[key];
        });
      }
      return RtcommEvent;
  }

  };


  })()); // End of Prototype

return RtcommEndpoint;
})();
