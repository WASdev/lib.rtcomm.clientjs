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
/*global: l:false*/
/*global: generateUUID:false*/
/*global: util:false*/

var RtcommEndpoint = (function invocation(){

  var createChat = function createChat(parent) {
    /* globals Chat:false */
    var chat = new Chat(parent);
    chat.on('ringing', function(event_obj) {
      (parent.lastEvent !== 'session:ringing') && parent.emit('session:ringing');
    });
    chat.on('message', function(message) {
      parent.emit('chat:message', {'message': message});
    });
    chat.on('alerting', function(message) {
      l('DEBUG') && console.log('RtcommEndpoint emitting session:alerting event');
      var obj =  {};
      obj.message  = message;
      obj.protocols = 'chat';
      // Have to do setState here because the parent state needs to change.
      parent.setState('session:alerting', obj );
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
    /* globals PhoneRTCConnection:false */
    /* globals cordova:false */
    var webrtc = null;
    if (typeof cordova !== 'undefined' || typeof phonertc !== 'undefined') {
      l('DEBUG') && console.log(" Cordova Detected, using PhoneRTC");
      webrtc = new PhoneRTCConnection(parent); 
    } else {
      webrtc = new WebRTCConnection(parent);
    }
    webrtc.on('ringing', function(event_obj) {
     l('DEBUG') && console.log("on ringing - play a ringback tone ", parent._.ringbackTone); 
     parent._playRingback();
     (parent.lastEvent !== 'session:ringing') && parent.emit('session:ringing');
    });

    webrtc.on('trying', function(event_obj) {
     l('DEBUG') && console.log("on trying - play a ringback tone ", parent._.ringbackTone); 
     parent._playRingback();
     (parent.lastEvent !== 'session:trying') && parent.emit('session:trying');
    });
    webrtc.on('alerting', function(event_obj) {
      parent._playRingtone();
      parent.emit('session:alerting', {protocols: 'webrtc'});
    });
    webrtc.on('connected', function(event_obj) {
     l('DEBUG') && console.log("on connected - stop ringing ");
      parent._stopRing();
      parent.emit('webrtc:connected');
    });
    webrtc.on('disconnected', function(event_obj) {
      l('DEBUG') && console.log("on disconnected - stop ringing ");
      parent._stopRing();
      parent.emit('webrtc:disconnected');
    });
    webrtc.on('remotemuted', function(event_obj) {
      parent.emit('webrtc:remotemuted', event_obj);
    });
    return webrtc;
  };

/**
 *  @memberof module:rtcomm
 *  @description
 *  This object can only be created with the {@link module:rtcomm.EndpointProvider#getRtcommEndpoint|getRtcommEndpoint} function.
 *  <p>
 *  The RtcommEndpoint object provides an interface for the UI Developer to attach 
 *  Video and Audio input/output.  Essentially mapping a broadcast stream(a MediaStream that
 *  is intended to be sent) to a RTCPeerConnection output stream.   When an inbound stream
 *  is added to a RTCPeerConnection, then this also informs the RTCPeerConnection
 *  where to send that stream in the User Interface.
 *  <p>
 *  See the example under {@link module:rtcomm.EndpointProvider#getRtcommEndpoint|getRtcommEndpoint}
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
 */
  var RtcommEndpoint = function RtcommEndpoint(config) {
    /** 
     * @typedef {object} module:rtcomm.RtcommEndpoint~config
     *
     * @property {boolean} [autoEnable=false]  Automatically enable webrtc/chat upon connect if feature is supported (webrtc/chat = true);
     * @property {string}  [userid=null] UserID the endpoint will use (generally provided by the EndpointProvider
     * @property {string}  [appContext=null] UI Component to attach outbound media stream
     * @property {string} [ringtone=null] Path to a  ringtone to play when we are ringing on inbound call
     * @property {string} [ringbacktone=null] path to a ringbacktone to play on outbound call
     * @property {boolean} [webrtc=true]  Whether the endpoint supports webrtc
     * @property {module:rtcomm.RtcommEndpoint.WebRTCConnection~webrtcConfig} webrtcConfig - Object to configure webrtc with (rather than on enable)
     * @property {boolean} [chat=true]  Wehther the endpoint supports chat
     * @property {module:rtcomm.RtcommEndpoint.WebRTCConnection~chatConfig} chatConfig - object to pre-configure chat with (rather than on enable)
     *
     */
    this.config = {
      // if a feature is supported, enable by default.
      autoEnable: false,
      ignoreAppContext: true,
      appContext : null,
      userid: null,
      ringtone: null,
      ringbacktone: null,
      chat: true,
      chatConfig: {},
      webrtc:true,
      webrtcConfig:{}
    };

    this.dependencies = {
      endpointConnection: null,
    };
    // Private info.
    this._ = {
      objName: 'RtcommEndpoint',
      activeSession: null,
      available: true,
      /*global generateUUID:false */
      uuid: generateUUID(),
      initialized : false,
      disconnecting: false,
      protocols : [],
      // webrtc Only 
      inboundMedia: null,
      attachMedia: false,
      localStream : null,
      ringTone : null,
      ringbackTone : null,
      media : { In : null,
               Out: null},
    };
    // Used to store the last event emitted;
    this.lastEvent = null;
    // Used to store the last event emitted
    //
    this.state = 'session:stopped';
    var self = this;
    config && Object.keys(config).forEach(function(key) {
      self.config[key] = config[key];
    });

    this.config.webrtc && this._.protocols.push('webrtc');
    this.config.chat && this._.protocols.push('chat');

    //load the sounds 
    this._.ringTone = (this.config.ringtone) ? util.Sound(this.config.ringtone).load(): null;
    this._.ringbackTone= (this.config.ringbacktone) ? util.Sound(this.config.ringbacktone).load() : null;

    // expose the ID
    this.id = this._.uuid;
    this.userid = this.config.userid || null;
    this.appContext = this.config.appContext || null;

    /**
     * The attached {@link module:rtcomm.RtcommEndpoint.WebRTCConnection} object 
     * if enabled null if not enabled
     *
     * @type {module:rtcomm.RtcommEndpoint.WebRTCConnection}
     * @readonly
     */
    this.webrtc = (this.config.webrtc)?createWebRTCConnection(this): null;
    /**
     * The attached {@link module:rtcomm.RtcommEndpoint.Chat} object 
     * if enabled null if not enabled
     *
     * @type {module:rtcomm.RtcommEndpoint.Chat}
     * @readonly
     */
    this.chat = (this.config.chat) ? createChat(this): null;
    // Enable chat by default if it is set up that way.
    //this.chat && this.chat.enable();

    /** 
     * RtcommEndpoint Event type 
     *
     *  @typedef {Object} module:rtcomm.RtcommEndpoint~Event
     *  @property {name} eventName 
     *  @property {object} endpointObject - an object passed with the event
     *  @property {string} [reason] - Used for failure messages
     *  @property {string} [protocols] - Used for alerting messages
     *  @property {object} [message] - Used for chat:message and session:alerting
     */

    this.events = {
        /**
         * A signaling session to a peer has been established
         * @event module:rtcomm.RtcommEndpoint#session:started
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:started": [],
        /**
         * An inbound request to establish a call via 
         * 3PCC was initiated
         *
         * @event module:rtcomm.RtcommEndpoint#session:refer
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "session:refer": [],
        /**
         * A peer has been reached, but not connected (inbound/outound)
         * @event module:rtcomm.RtcommEndpoint#session:ringing
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:trying": [],
        /**
         * A Queue has been contacted and we are waiting for a response.
         * @event module:rtcomm.RtcommEndpoint#session:queued
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:queued": [],
        /**
         * A peer has been reached, but not connected (inbound/outound)
         * @event module:rtcomm.RtcommEndpoint#session:ringing
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:ringing": [],
        /**
         * An inbound connection is being requested.
         * @event module:rtcomm.RtcommEndpoint#session:alerting
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:alerting": [],
        /**
         * A failure occurred establishing the session (check reason)
         * @event module:rtcomm.RtcommEndpoint#session:failed
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:failed": [],
        /**
         * The session has stopped
         * @event module:rtcomm.RtcommEndpoint#session:stopped
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "session:stopped": [],
        /**
         * A PeerConnection to a peer has been established
         * @event module:rtcomm.RtcommEndpoint#webrtc:connected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "webrtc:connected": [],
        /**
         * The connection to a peer has been closed
         * @event module:rtcomm.RtcommEndpoint#webrtc:disconnected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "webrtc:disconnected": [],
        /**
         * The remote peer muted their stream
         * @event module:rtcomm.RtcommEndpoint#webrtc:remotemuted
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         * Additional properties of the Event Object:
         *  label: label of the stream
         *  audio: boolean indicating muted(false) or not(true)
         *  video: boolean indicating muted(false) or not(true)
         */
        "webrtc:remotemuted": [],
        /**
         * Creating the connection to a peer failed
         * @event module:rtcomm.RtcommEndpoint#webrtc:failed
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'webrtc:failed': [],
        /**
         * A message has arrived from a peer
         * @event module:rtcomm.RtcommEndpoint#chat:message
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:message': [],
        /**
         * A chat session to a  peer has been established
         * @event module:rtcomm.RtcommEndpoint#chat:connected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:connected': [],
        /**
         * The connection to a peer has been closed
         * @event module:rtcomm.RtcommEndpoint#chat:disconnected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:disconnected':[],
        /**
         * The endpoint has destroyed itself, clean it up.
         * @event module:rtcomm.RtcommEndpoint#destroyed
         * @property {module:rtcomm.RtcommEndpoint}
         */
        'destroyed': [],
        /**
         * The endpoint received a 'onetimemessage'. The content of the message
         * should be in the 'otm' header
         * @event module:rtcomm.RtcommEndpoint#onetimemessage
         * @property {module:rtcomm.RtcommEndpoint}
         */
        'onetimemessage': [],
    };
  };
/*globals util:false*/
/*globals l:false*/
RtcommEndpoint.prototype = util.RtcommBaseObject.extend((function() {

  function createSignalingSession(endpoint, context) {
    var remoteEndpointID = null;
    var toTopic = null;
    if (typeof endpoint === 'object') {
      if (endpoint.remoteEndpointID && endpoint.toTopic) {
        remoteEndpointID = endpoint.remoteEndpointID;
        toTopic = endpoint.toTopic;
      } else {
        throw new Error('Invalid object passed on connect! should be {remoteEndpointID: something, toTopic: something}');
      }
    } else {
      remoteEndpointID = endpoint;
    } 
    l('DEBUG') && console.log(context+" createSignalingSession context: ", context);
    var sessid = null;
    if (!remoteEndpointID) {
      throw new Error('remoteEndpointID must be set');
    }
    var session = context.dependencies.endpointConnection.createSession({
      id : sessid,
      toTopic : toTopic,
      protocols: context._.protocols,
      remoteEndpointID: remoteEndpointID,
      appContext: context.config.appContext
    });
    return session;
  }
  // Protocol Specific handling of the session content. 
  //
  function addSessionCallbacks(context, session) {
     // Define our callbacks for the session.
    // received a pranswer
    session.on('have_pranswer', function(content){
      // Got a pranswer:
      context.setState('session:ringing');
      context._processMessage(content);
    });
    /*
     * this is a bit of a special message... content MAY contain:
     * content.queuePosition
     * content.message
     *
     * content.message is all we propogate.
     *
     */
    session.on('queued', function(content){
      l('DEBUG') && console.log('SigSession callback called to queue: ', content);
      var position = 0;
      if (typeof content.queuePosition !== 'undefined') {
        position = content.queuePosition;
        context.setState('session:queued',{'queuePosition':position});
        content = (content.message)? content.message : content;
      } else {
        context.setState('session:queued');
        context._processMessage(content);
      }
    });
    session.on('message', function(content){
      l('DEBUG') && console.log('SigSession callback called to process content: ', content);
      context._processMessage(content);
    });
    session.on('started', function(content){
      // Our Session is started!
      content && context._processMessage(content);
      context.setState('session:started');
    });
    session.on('stopped', function(message) {
      // We could already be stopped, ignore it in that case.
      l('DEBUG') && console.log(context+' SigSession callback called to process STOPPED: ' + context.getState());
      if (context.getState() !== 'session:stopped') {
        // In this case, we should disconnect();
        context.setState('session:stopped');
        context.disconnect();
      }
    });
    session.on('starting', function() {
      context.setState('session:trying');
    });
    session.on('failed', function(message) {
      context.disconnect();
      context.setState('session:failed',{reason: message});
    });
    l('DEBUG') && console.log(context+' createSignalingSession created!', session);
   // session.listEvents();
    return true;
  }

/** @lends module:rtcomm.RtcommEndpoint.prototype */
var proto = {
  getAppContext:function() {return this.config.appContext;},
  newSession: function(session) {
      var event = null;
      var msg = null;
      // If there is a session.appContext, it must match unless this.ignoreAppContext is set 
      if (this.config.ignoreAppContext || 
         (session.appContext && (session.appContext === this.getAppContext())) || 
         (typeof session.appContext === 'undefined' )) {
        // We match appContexts (or don't care)
        if (this.available()){
          // We are available (we can mark ourselves busy to not accept the call)
          // Save the session 
          this._.activeSession = session;
          addSessionCallbacks(this,session);
          var commonProtocols = util.commonArrayItems(this._.protocols, session.protocols);
          l('DEBUG') && console.log(this+'.newSession() common protocols: '+ commonProtocols);
          // If this session is created by a REFER, we do something different
          if (session.referralTransaction ) {
            // Don't start it, emit 'session:refer'
            l('DEBUG') && console.log(this + '.newSession() REFER');
            // Set the protocols to match the endpoints.
            session.protocols = this._.protocols;
            this.setState('session:refer');
          } else if (commonProtocols.length > 0){
            // have a common protocol 
            // any other inbound session should be started.
            session.start({protocols: commonProtocols});
            // Depending on the session.message (i.e its peerContent or future content) then do something. 
            if (session.message && session.message.payload) {
              // If we need to pranswer, processMessage can handle it.
              this._processMessage(session.message.payload);
            } else {
              // it doesn't have any payload, but could have protocols subprotocol
              session.pranswer();
              this.setState('session:alerting', {protocols:commonProtocols});
            }
          } else {
            // can't do anything w/ this session, same as busy... different reason.
            l('DEBUG') && console.log(this+'.newSession() No common protocols');
            session.fail('No common protocols');
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
  _processMessage: function(payload) {

    var self = this;
    /*
     * payload will be a key:object map where key is 'webrtc' or 'chat' for example
     * and the object is the 'content' that should be routed to that object.
     */
    // but may be {protocols: [], payload: {}}
    // basically a protocol router...
    var protocols;
    if (payload && payload.protocols) {
      protocols = payload.protocols;
      payload = payload.payload;
    }
    if (payload) {
      for (var type in payload) {
        if (payload.hasOwnProperty(type)){
          switch(type) {
            case 'chat': 
              // It is a chat this will change to something different later on...
              if (this.config.chat) { 
                this.chat._processMessage(payload[type]);
              } else {
                console.error('Received chat message, but chat not supported!',payload[type]);
              }
              break;
            case 'webrtc':
              if (this.config.webrtc && this.webrtc) { 
                // calling enable will enable if not already enabled... 
                if (this.webrtc.enabled()) {
                  self.webrtc._processMessage(payload[type]);
                } else {
                  // This should only occur on inbound. don't connect, that is for outbound.
                  this.webrtc.enable({connect: false}, function(success){
                    if (success) {
                      self.webrtc._processMessage(payload[type]);
                    }
                  });
                }
              } else {
                console.error('Received chat message, but chat not supported!',payload[type]);
              }
              break;
            case 'otm':
              this.emit('onetimemessage', {'onetimemessage': payload[type]});
              break;
            default:
              console.error(this+' Received message, but unknown protocol: ', type);
          } // end of switch
        }
      } // end of for
   } else {
     l('DEBUG') && console.log(this+' Received message, but nothing to do with it', payload);
   }
  },
  _playRingtone: function() {
    this._.ringTone && this._.ringTone.play();
  },
  _playRingback: function() {
    this._.ringbackTone && this._.ringbackTone.play();
  },
  _stopRing: function() {
    l('DEBUG') && console.log(this+'._stopRing() should stop ring if ringing... ',this._.ringbackTone);
    l('DEBUG') && console.log(this+'._stopRing() should stop ring if ringing... ',this._.ringTone);
    this._.ringbackTone && this._.ringbackTone.playing && this._.ringbackTone.stop();
    this._.ringTone && this._.ringTone.playing && this._.ringTone.stop();
  },

  /** Endpoint is available to accept an incoming call
   *
   * @returns {boolean}
   */

    available: function(a) {
     // if a is a boolean then set it, otherwise return it.
     if (typeof a === 'boolean') { 
       this._.available = a;
       l('DEBUG') && console.log(this+'.available() setting available to '+a);
       return a;
     } else  {
       return this._.available;
     }
    },

  /**
   * Connect to another endpoint.  Depending on what is enabled, it may also start
   * a chat connection or a webrtc connection.
   * <p>
   * If webrtc is enabled by calling webrtc.enable() then the initial connect will 
   * also generate an Offer to the remote endpoint. <br>
   * If chat is enabled, an initial message will be sent in the session as well.
   * </p>
   *
   * @param {string|object} endpoint Remote ID of endpoint to connect.
   */

  connect: function(endpoint) {
    if (this.ready()) {
      this.available(false);
      this._.disconnecting = false;
      if (!this._.activeSession ) { 
        this._.activeSession = createSignalingSession(endpoint, this);
        addSessionCallbacks(this, this._.activeSession);
      } 
      this.setState('session:trying');
      if (this.config.webrtc && this.webrtc.connect()) {
        l('DEBUG') && console.log(this+'.connect() initiating with webrtc.enable({connect:true})');
      } else if (this.config.chat && this.chat.enable({connect:true})){
        l('DEBUG') && console.log(this+'.connect() initiating with chat.enable({connect:true})');
      } else {
        l('DEBUG') && console.log(this+'.connect() sending startMessage w/ no content');
        this._.activeSession.start();
      }
    } else {
      throw new Error('Unable to connect endpoint until EndpointProvider is initialized');
    }
    return this;
  },

  /**
   * Disconnect the endpoint from a remote endpoint.
   */
  disconnect: function() {
    l('DEBUG') && console.log(this+'.disconnect() Entry');
    if (!this._.disconnecting) {
      // Not in progress, move along
      l('DEBUG') && console.log(this+'.disconnect() Starting disconnect process');
      this._.disconnecting = true;
      this.webrtc && this.webrtc.disable();
      this.chat && this.chat.disable();
      if (!this.sessionStopped()) {
        this._.activeSession.stop();
        this._.activeSession = null;
        this.setState('session:stopped');
      } else {
        this._.activeSession=null;
      }

      this._.disconnecting = false;
      this.available(true);
    } else {
      l('DEBUG') && console.log(this+'.disconnect() in progress, cannot disconnect again');
    }
    l('DEBUG') && console.log(this+'.disconnect() Exit');
    return this;
  },
  /**
   * Accept an inbound request.  This is typically called after a 
   * {@link module:rtcomm.RtcommEndpoint#session:alerting|session:alerting} event
   *
   *
   * @param {module:rtcomm.RtcommEndpoint.WebRTCConnection~callback} callback - The callback when accept is complete.
   *
   * @returns {module:rtcomm.RtcommEndpoint}
   */
  accept: function(callback) {
    if (this.getState() === 'session:refer') {  
      this.connect(null);
    } else if (this.webrtc && this.webrtc && this.webrtc.accept(callback)) {
      l('DEBUG') && console.log(this+'.accept() Accepted in webrtc.');
    } else if (this.chat && this.chat.accept(callback)) {
      l('DEBUG') && console.log(this+'.accept() Accepted in chat.');
    } else {
      l('DEBUG') && console.log(this+'.accept() accepting generically.');
      if (!this.sessionStarted()) {
        this._.activeSession.respond();
      }
    }
    return this;
  },

  /**
   * Reject an inbound request.  This is typically called after a 
   * {@link module:rtcomm.RtcommEndpoint#session:alerting|session:alerting} event
   *
   */
  reject: function() {
      l('DEBUG') && console.log(this + ".reject() invoked ");
      this._stopRing();
      this.webrtc.reject();
      this.chat.reject();
      this._.activeSession && this._.activeSession.fail("The user rejected the call");
      this.available(true);
      this._.activeSession = null;
      return this;
  },

  sendOneTimeMessage: function(message){
    // Sending message:
    l('DEBUG') && console.log(this+'.sendOneTimeMessage() sending '+message);
    var msg = {};
    if (this.sessionStarted()) {
      msg.otm = (typeof message === 'object') ? message : {'message':message};
      l('DEBUG') && console.log(this+'.sendOneTimeMessage() sending ',msg);
      this._.activeSession.send(msg);
    } else {
      throw new Error('Unable to send onetimemessage.  Session not started');
    }
  },

  getRtcommConnectorService: function(){
    return this.dependencies.endpointConnection.services.RTCOMM_CONNECTOR_SERVICE;
  },
  /* used by the parent to assign the endpoint connection */
  setEndpointConnection: function(connection) {
    var webrtc = this.webrtc;
    webrtc && webrtc.setIceServers(connection.services.RTCOMM_CONNECTOR_SERVICE);
    this.dependencies.endpointConnection = connection;
    this.dependencies.endpointConnection.on('servicesupdate', function(services) {
        l('DEBUG') && console.log('setEndpointConnection: resetting the ice servers to '+services.RTCOMM_CONNECTOR_SERVICE);
        webrtc && webrtc.setIceServers(services.RTCOMM_CONNECTOR_SERVICE);
    });
  },

  /** Return user id 
   * @returns {string} Local UserID that endpoint is using
   */
  getUserID : function(userid) {
      return this.config.userid; 
  },

  setUserID : function(userid) {
      this.userid = this.config.userid = userid;
  },

  getState: function() {
    return this.state;
  },

  /**
   * Endpoint is ready to connect
   * @returns {boolean}
   */
  ready : function() {
    var ready = (this.dependencies.endpointConnection) ? true : false;
    return ready;
  },
  /**
   * The Signaling Session is started 
   * @returns {boolean}
   */
  sessionStarted: function() {
    return (this._.activeSession && this._.activeSession.getState() === 'started');
  },
  /**
   * The Signaling Session does not exist or is stopped
   * @returns {boolean}
   */
  sessionStopped: function() {
    var state = (this._.activeSession) ? (this._.activeSession.getState() === 'stopped'): true;
    return state;
  },
  /**
   * Remote EndpointID this endpoint is connected to.
   * @returns {string}
   */
  getRemoteEndpointID: function() {
    return this._.activeSession ? this._.activeSession.remoteEndpointID : 'none';
  },
  /**
   * Local EndpointID this endpoint is using.
   * @returns {string}
   */
  getLocalEndpointID: function() {
    return this.userid;
  },

  /**
   *  Destroy this endpoint.  Cleans up everything and disconnects any and all connections
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

  /* This is an event formatter that is called by the prototype emit() to format an event if 
   * it exists
   * When passed an object, we ammend it w/ eventName and endpoint and pass it along.
   */
  _Event : function Event(event, object) {
      var RtcommEvent =  {
        eventName: '',
        endpoint: null
      };
      l('DEBUG') && console.log(this+'_Event -> creating event['+event+'], augmenting with', object);
      RtcommEvent.eventName= event;
      RtcommEvent.endpoint= this;
      if (typeof object === 'object') {
        Object.keys(object).forEach(function(key) { 
          RtcommEvent[key] = object[key];
        });
      }
      l('DEBUG') && console.log(this+'_Event -> created event: ',RtcommEvent);
      return RtcommEvent;
  }

  };

  // This construct is to get the jsdoc correct
  return proto;

  })()); // End of Prototype

return RtcommEndpoint;
})();
