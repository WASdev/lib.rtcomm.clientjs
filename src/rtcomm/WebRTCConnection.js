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
var WebRTCConnection = (function invocation() {
  
  var getIceServers = function(object) {
    // Expect object to look something like:
    // {"iceservers":{"urls": "stun:host:port", "urls","turn:host:port"} }
    
    var iceServers = [];
    var services = null;
    var servers = null;
    if (object && object.services && object.services.iceservers) {
      servers  = object.services.iceservers;
      if (servers && servers.iceURL) {
        var urls = [];
        servers.iceURL.split(',').forEach(function(url){
          urls.push({'url': url});
        });
        iceServers = {'iceServers':urls};
        return iceServers;
      } 
    } else {
      return  {'iceServers':[]};
    }
  };
  
  
  /**
   * @class
   * @memberof module:rtcomm.webrtc
   *
   * @classdesc
   * A WebRTCConnection is a connection from one peer to another encapsulating
   * an RTCPeerConnection and a SigSession
   *
   * 
   * @param {string}  [context] Option Context for the page
   * @param {boolean}  [audio] We want audio in our PeerConnection
   * @param {boolean}  [video] We want Video in our PeerConnection
   * @param {boolean}  [data]  We want Data in our PeerConnection
   * @param {string}  toEndpointID WHO We want to connect to
   * @param {string}  [context] A string representing an app/context/url  we are connecting from
   * @param {ibmrtc.rtcomm.RtcChannel} [channel] Channel to attach to
   * @param {ibmrtc.rtcomm.RtcMessage} [message] optional message to process on instantiation
   *
   * @throws  {String} Throws new Error Exception if invalid arguments
   * 
   * @private
   */
  
function WebRTCConnection(/* object */ config ) {


  /** @const */
  this.name = 'WebRTCConnection';

  var requiredConfig = { };

  /** Default parameter definition */
  this.endpointConnection = null;
  this.audio = false;
  this.video = false;
  this.data = false;
  this.appContext = null;
  this.rtcommEndpoint = null;
  this.toEndpointID = null;
  this.autoAnswer = false;
  
  this.streamAttached = false;
  // peer connection config
  this.pranswer = false;
  //TODO doesn't work yet. leave true.
  this.trickle = true;
  
  /** define our callbacks */
  //TODO Change this...
  this.onEvent = null;

  /** initialize variables */
  if (config) {
    // validates REQUIRED config upon instantiation.
    /* global _validateConfig: false */
    /* global _applyConfig: false  */
    validateConfig(config, requiredConfig);
    if (config.logLevel) {
      setLogLevel(config.logLevel);
      delete config.logLevel;
    }
    // Apply the Config to this object
    applyConfig(config, this);
  } else {
    throw new Error("WebRTCConnection instantiation requires a minimum configuration: " + JSON.stringify(requiredConfig));
  }

  this.STATES = { "READY": "Ready to Connect",
      "STARTED": "SigSession is connected, but no PeerConnection",
      "CONNECTED": "Connected to a target via a Signaling Session and has a PeerConnection connected. ",
      "DISCONNECTED":"Not connected to anything",
      "RINGING": "In Progress, waiting for a manual intervention (generally have pranswer, need answer)",
      "TRYING":"In progress",
      "FAILED": "Connection Failed"};

  /** Constant EVENT NAME of state  (note lowercase)  */

  this.EVENTS = {
      "ready": "Ready to connect",
      "connected":"Connected to %s",
      "ringing": "Waiting for an Answer",
      "trying": "Connecting to %s",
      "disconnected": "Disconnect from %s",
      "failed": "Connection Failed to %s"};

  this.state = "DISCONNECTED";
  // private
  this.ready = false;
  
  this._sigSession = null;
  this._peerConnection = null;
  
  this._referralSession = null;
  
  this.autoAnswer = this.rtcommEndpoint.getAutoAnswer();
  this.id = this.toEndpointID;
  
  /** Changes loglevel for the whole webrtc module */
  this.setLogLevel = setLogLevel;
  /** gets loglevel for the whole webrtc module */
  this.getLogLevel = getLogLevel;
  
  this.iceServers = null;
  
}  // End of Constructor


/* Prototype */
WebRTCConnection.prototype = function() {
  /**
   *  @memberof WebRTCConnection
   *  When we init, we attach our signalingSession and PeerConnection
   *
   *  If we are 'In Progress' meaning we are being init'd by our
   *  WebRTCClientService w/ a Channel & Message then we actually need to
   *  begin our SigSession so it can respond. Typically this should
   *  be w/ a 'pranswer'
   *
   *  @param {boolean} (caller) 'true' if caller, false, if callee
   *  @param {object} (session) a SigSession object created on inbound, don't need to create one.
   *
   *  @param {function} (onComplete) Callback executed when the init finishes.
   *  
   *  
   */
  var init = function(config) {

    var session = null,
    caller=true,
    onComplete = function(message) {
      console.log(this+'.init() is complete, override to process', message);
    };

    /* global log: false */
    /* global l: false */
    l('DEBUG') && console.log(this+'.init Initializing Connection with config: ', config);
    if (config){
      /* 
       * If there is a config.session - we need to check the type, if its 
       * 'refer' then this session is not our Session, we will create a new one.
       *  If its 'normal' then we are 'inbound'
       */
      if (config.session){
        if (config.session.type === 'normal') {
          session = config.session;
          this.appContext = config.session.appContext || "none";
          caller = false;
        } else if (config.session.type === 'refer') {
          this._referralSession = config.session;
        } else {
          console.error('Invalid Session passed: ', config.session);
        }
      }
      
      onComplete = config.onComplete || onComplete;
      
      l('DEBUG') && console.log(this+'.init caller is: ', caller);
      // If we have a endpoint attached, populate our variables from it.
      if (config.rtcommEndpoint) {
        this.rtcommEndpoint = config.rtcommEndpoint;
        this.audio = this.rtcommEndpoint.audio || false;
        this.video = this.rtcommEndpoint.video || false;
        this.data = this.rtcommEndpoint.data || false;
        this.iceServers = getIceServers(config.rtcommEndpoint);
      }
    } 
  
    if (this.rtcommEndpoint === null) {
      console.error("rtcommEndpoint required...");
      throw new Error("WebRTCConnection.init() - rtcommEndpoint required");
    }
    
    
    /*
     * If there is audio/video/data, we will create a peerconnection
     * Otherwise we can create JUST a signaling session.  This is 
     * really only practical when testing signaling.
     * 
     */
    if (this.audio || this.video || this.data) {
      // Create a peerconnection
      this._peerConnection =  createPeerConnection(this);
      if (this.attachLocalStream()) {
        l('DEBUG') && console.log('Successfully attached streams... ');
        l('DEBUG') && console.log('Local Streams: ' + JSON.stringify(this._peerConnection.getLocalStreams()));
        l('DEBUG') && console.log('Remote Streams: ' + JSON.stringify(this._peerConnection.getRemoteStreams()));
      }
    }
    // Create our SigSession, but not Beginning it - that will only happen
    // when we need to.
    
    session = session || createSignalingSession(this);
    this.toEndpointID = session.toEndpointID || this.toEndpointID;
    this.id = this.toEndpointID;
    addSessionCallbacks(this, session);
    this._sigSession = session;
   
    if (!caller) {
      var message = session.message;
      session.start();
      if (message && message.peerContent) {
        // If the peerCOntent is an 'offer' we will do our PC stuff.
        var content = message.peerContent;
    
        if (content.type === 'offer') {
          this._peerConnection.setRemoteDescription(new MyRTCSessionDescription(message.peerContent),
            /*success*/  function() {
              l('DEBUG') && console.log('Set Remote Description... should fire addstream event now... ');
              // Successfully set the Remote Description, create an answer.
              // this will also handle sending whatever is next. 
              /*
               * Defect:  If media hasn't been attached, then this answer will be bad in FF.  
               *   We only create this answer if we are going to send a REAL pranswer (which we 
               *   generally dont)
               */
              if (this.pranswer) {
                this._peerConnection.createAnswer(this._gotAnswer.bind(this), function(error) {
                  console.error('Failed to create an Answer: '+error);
                });
              } else {
                this._setState('RINGING');
                session.pranswer();
              }
           
            }.bind(this),
            function(error) {
              console.error('Failed Setting Remote Description', error);
          });
        } else {
          console.error('Not an offer, unsure what to do');
        }
      } else {
        // It is a start session, we will respond w/ a PRANSWER and someone can answer...
        // generally the case we are operating outside of a peerConnection.
        if (this.autoAnswer) {
          session.respond({'type':'answer', sdp:''});
        } else {
          session.pranswer();
        }
        //console.error('No message on inbound session, unsure what to do');
      }
    }
 
  }, // End of init()

  setRTCommEndpoint = function(rtcommEndpoint) {
    // It is possible to have this done automatically by the onComplete callback.  If it happens, we MAY need to answer...
    // Validate it has everything we should have in it..
    this.rtcommEndpoint = rtcommEndpoint;

  },
  /* 
   * This is executed by createAnswer.  Typically, the intent is to just send the answer
   * and call setLocalDescription w/ it.  There are a couple of variations though.
   * 
   * This also means we have applied (at some point) applie a remote offer as our RemoteDescriptor
   *
   * In most cases, we should be in 'have-remote-offer'
   * 
   *  We have 3 options here:
   *  (have-remote-offer)
   *  1.  start a session w/ a message 
   *  2.  start w/out a message
   *  3.  send message.
   *  
   *  // ANSWER
   *  // PRANSWER or REAL_PRANSWER
   *  
   *  
   *  
   */
  _gotAnswer =  function(desc) {
    
    l('DEBUG') && console.log(this+'.createAnswer answer created:  ', desc);

    var answer = null;
    var pcSigState = this._peerConnection.signalingState;
    var sessionState = this._sigSession.getState();

    var PRANSWER = (pcSigState === 'have-remote-offer') && (sessionState === 'starting');
    var RESPOND = this.AutoAnswer || sessionState === 'pranswer' || pcSigState === 'have-local-pranswer';

    l('DEBUG') && console.log(this+'.createAnswer._gotAnswer: pcSigState: '+pcSigState+' SIGSESSION STATE: '+ sessionState);
    
    if (RESPOND) {
      l('DEBUG') && console.log(this+'.createAnswer sending answer as a RESPONSE');
      this._setState('CONNECTED');
      this._sigSession.respond(true, desc);
    } else if (PRANSWER){
      l('DEBUG') && console.log(this+'.createAnswer sending PRANSWER');
      this._setState('RINGING');
      answer = {};
      answer.type = 'pranswer';
      answer.sdp = this.pranswer ? desc.sdp : '';
      desc = answer;
      this._sigSession.pranswer(desc);
    } else {
      l('DEBUG') && console.log(this+'.createAnswer sending ANSWER (renegotiation?)');
      // Should be a renegotiation, just send the answer...
      this._sigSession.send(desc);
    }
    // Should have been sent.
    l('DEBUG') && console.log('_gotAnswer: pcSigState: '+pcSigState+' SIGSESSION STATE: '+ sessionState);
    
    var SKIP = PRANSWER && answer && answer.sdp === '';
    if (!SKIP) {
      this._peerConnection.setLocalDescription(desc,/*onSuccess*/ function() {
        l('DEBUG') && console.log('setLocalDescription in _gotAnswer was successful', desc);
      }.bind(this), 
        /*error*/ function(message) {
        console.error(message);
    });

    }
  },

  /** Process inbound messages
   *
   *  These are 'PeerConnection' messages
   *  Offer/Answer/ICE Candidate, etc...
   */
  _processMessage = function(message) {
    
    var isPC = this._peerConnection ? true : false;
    
    if (!message) {
      return;
    }
    l('DEBUG') && console.log(this+"._processMessage Processing Message...", message);
   /* if (!this._peerConnection) {
      l('DEBUG') && log(this, '_processMessage', 'Dropping Message, no peerConnection', message);
      return;
    } */
    if (message.type) {
      switch(message.type) {
      case 'pranswer':
        /*
         * When a 'pranswer' is received, the target is 'THERE' and our state should
         * change to RINGING.
         *
         * Our PeerConnection is not 'stable' yet.  We still need an Answer.
         *
         */
        isPC && this._peerConnection.setRemoteDescription(new MyRTCSessionDescription(message));
        this._setState("RINGING");
        break;
      case 'answer':
        /*
         *  If we get an 'answer', we should be in a state to RECEIVE the answer,
         *  meaning we can't have sent an answer and receive an answer.
         *
         *  TODO:  Confirm we can receive this MESSAGE.
         *
         *  TODO:  Pull all of these Success/Failure callbacks somewhere.
         */
        l('DEBUG') && console.log(this+'._processMessage ANSWERING', message);
        /* global RTCSessionDescription: false */
        isPC && this._peerConnection.setRemoteDescription(new MyRTCSessionDescription(message),
            function() {
          l('DEBUG') && console.log("Successfully set the ANSWER Description");
        },
        function(error) {
          console.error('setRemoteDescription has an Error', error);
        });
        this._setState("CONNECTED");
        break;
      case 'offer':
        /*
         *  When we receive an offer here, we are NOT in the 'Session BEGIN' moment'
         *  There should be a session and our state should be READY or CONNECTED.
         *  
         * When an Offer is Received , we need to send an Answer, this may
         * be a renegotiation depending on our 'state' so we may or may not want
         * to include the UI. (meaning we wouldn't update it w/ a state change.
         */
        if (this.getState() === 'READY' || this.getState() === 'CONNECTED') {
          l('DEBUG') && console.log(this+'_processMessage offer renegotiating');
          isPC && this._peerConnection.setRemoteDescription(new MyRTCSessionDescription(message), 
              /*onSuccess*/ function() {
                this._peerConnection.createAnswer(this._gotAnswer.bind(this), function(error){
                  console.error('Failed to create Answer:'+error);
                });
              }.bind(this), 
              /*onFailure*/ function(error){
                console.error('setRemoteDescription has an Error', error);
              });
        } else {
          this._setState("RINGING");
        }
       
        break;
      case 'icecandidate':
        try {
          var iceCandidate = new MyRTCIceCandidate(message.candidate);
          l('DEBUG') && console.log(this+'_processMessage iceCandidate ', iceCandidate );
          isPC && this._peerConnection.addIceCandidate(iceCandidate);
        } catch(err) {
          console.error('addIceCandidate threw an error', err);
        }
        break;
      case 'user':
        this._emit(message.userdata);
        break;
      default:
        // Pass it up out of here...
        // TODO: Fix this, should emit something different here...
        this._emit(message);
     
      }
    } else {

      //TODO:  In both casses here, we need to consider emitting a raw message that is unprocessed...
      this._emit(message);
      l('DEBUG') && console.log(this+'_processMessage Unknown Message', message);
    }
  },
  
  attachLocalStream = function(callback) {
    // We should be able to get whether a Stream is attached from the peerconnection, 
    // however in Firefox, we can get here before the peerConnection REPORTS that a 
    // stream is attached w/ getLocalStreams().  In that case we could be in the middle
    // of addStream and if we call it again, then it messes up the peerConnection
    // 
    
    
    if (this.rtcommEndpoint && this.rtcommEndpoint.localStream) {
      // We have a localstream - we only support 1 local stream...  We should be able to add more streams, like music, etc... not yet. 
      if (this._peerConnection && !this.streamAttached) {
        l('DEBUG') && console.log(this+'.attachLocalStream() calling .addStream on peerConnection with: ', this.rtcommEndpoint.localStream);
        this._peerConnection.addStream(this.rtcommEndpoint.localStream);
        this.streamAttached = true;
        return true;
      } else {
        l('DEBUG') && console.log(this+'attachLocalStream() Stream already attached');
        return true;
      }
    } else {
      console.error('this.rtcommEndpoint.localStream is not set');
      return false;
    }
  },
  
  connect = function() {
    // We may not be init'd check first.
    if (this._sigSession === null) {
      l('DEBUG') && console.log(this+'.connect() -- Initializing on Connection');
      this.init();
    }
    
    // If we have a _peerConnection from init() we need to attach stream
    // TODO:  Attach a FAKE stream possibly...
    if (this._peerConnection) {
      if(!this.attachLocalStream()) {
        throw new Error('Unable to attach localStream');
      }
    }
    
    // What is our state?
    var state = this.getState();
    l('DEBUG') && console.log("STATE in connect..."+state);
    switch(state)
    {
    case "RINGING":
      if (this._peerConnection) {
        l('DEBUG') && console.log('connect() calling createAnswer');
        this._peerConnection.createAnswer(this._gotAnswer.bind(this), function(error){
          console.error('failed to create answer', error);
        });
      } else {
        console.log("If there's no PEER CONNECTION, we still need to setup the SigSession.");
        this._sigSession.respond();
      }
     break;
    case "CONNECTED":
      /* If connect() is called while CONNECTED, we RENEGOTIATE */
      if (this._peerConnection){
        this._peerConnection.createOffer(
        /*success*/  function(offer) {
          l('DEBUG') && console.log(this+'.connect RENEGOTIATING', offer);
          this._peerConnection.setLocalDescription(offer,function() {
              this.send(offer);
              console.log('calling updateIce()');
              this._peerConnection.updateIce();
          }.bind(this), function(error){
              console.error(error);
          });
        }.bind(this),
        /*failed*/ function(error) {
          console.log('Failed to create offer for Renegotiate', error);
        });
      } else {
       l('DEBUG') && console.log("No Peerconnection, nothing to do.");
      }
      break;
    case "DISCONNECTED":
      this._setState("TRYING");
   
      // Create Offer and send it.
      if (this._peerConnection) {
        l('DEBUG') && console.log(this+'.connect - creating Offer', this._peerConnection);
        this._peerConnection.createOffer(
          function(offer){
              l('DEBUG') && console.log(this+'.connect - created Offer: ', offer);
              this._peerConnection.setLocalDescription(offer,function() {
                l('DEBUG') && console.log('connect - setLocalDescription Success');
                }, function(error){
                  console.error(error);
                });
            this._sigSession.start({toEndpointID:this.toEndpointID, sdp: offer});
        }.bind(this),
        function(error) {
          console.log('Failed to create offer', error);
        });
      } else {
        l('DEBUG') && console.log(this+'.connect - beginning session');
        this._sigSession.start({toEndpointID:this.toEndpointID, content: null});
      }
      break;
    default:
      console.error('Unknown State in connect(): ' + state);
    }
  
  },


  /* internally used */
  
  send = function(msg) {
    /*
     * 
     * we send messages that are:
     *   {type: [offer|answer|icecandidate|user], [sdp|candidate|userdata]: ... }
     */
    msg = (msg && msg.type) ? msg : {'type':'user', 'userdata': {'message': msg}};
    // If there is a _sigSession, the message should be sent over it.  If there isn't, we will put the content inside a lower level message.
    if (this._sigSession) {
      this._sigSession.send(msg);
    }
  },
  
  destroy = function() {
    l('DEBUG') && console.log(this+'.destroy() Destroying the Connection');
    if (this._sigSession && this._sigSession.getState() !== 'stopped') {
      this._sigSession.stop();
      this._sigSession = null;
    } else {
      // already stopped, close it.
      this._sigSession = null;
    }
    if (this._peerConnection) {
      this._peerConnection.close();
      this._peerConnection = null;
    }
    if (this.getState() !== 'DISCONNECTED') {
      this._setState('DISCONNECTED');
    }
  },

  //TODO Not done, we should DESTROY ourselves too... how?
  // Do we need a Destroy Connection at the higher level to clean us up? 
  
  disconnect = function() {
    this.destroy();
  },

  update = function() {
    // Send another OFFER (presumably w/ a new SDP)
  },

  getState = function() {
    return this.state;
  },
  _setState = function(state) {
    if (state in this.STATES ) {
      this.state = state;
      this._emit(state.toLowerCase());
    }
  },

  /* We expect a single 'string' of an event typically */

  _emit = function(event, name) {
        var emitEvent = {};
      var userid = name?name:this.toEndpointID;
      l('TRACE') && console.log('WebRTCConnection._emit - TRACE: emitting event for id: '+userid);
      if (event in this.EVENTS) {
        emitEvent.name =  event;
        if (typeof userid !== 'undefined') {
          emitEvent.message = this.EVENTS[event].replace(/\%s/, userid);
        } else {
          emitEvent.message = this.EVENTS[event].replace(/\%s/, "unknown");
        }
        emitEvent.object = this.getStatus();
      } else if (event.name && event.message ) {
        emitEvent = event;
      } else {
        // Assume its a MEssage, emit a MESSAGE event w/ the name
        emitEvent.name = 'message';
        emitEvent.message = event;
        emitEvent.object = this.getStatus();
      }
      // Emit an event.
      if (this.onEvent && typeof this.onEvent === 'function') {
        l('DEBUG') && console.log(this+'._emit emitting event: ', emitEvent);
        this.onEvent(emitEvent);
      } else {
        l('DEBUG') && console.log(this+'_emit Nothing to do w/: ',event);
      } 
  },
  sendData = function() {
  },
  /** return the status of the connection */
  getStatus = function() {
    var connStatus = {};
    connStatus.state = this.state;
    connStatus.session = null;
    connStatus.pc = null;
    connStatus.pcSigState = null;
    connStatus.pcIceGatheringState = null;
    connStatus.pcIceConnectionState = null;
    if (this._sigSession) {
      connStatus.session = this._sigSession.id;
    }
    if (this._peerConnection) {
      connStatus.pc = this._peerConnection;
      connStatus.pcSigState = this._peerConnection.signalingState;
      connStatus.pcIceGatheringState = this._peerConnection.iceGatheringState;
      connStatus.pcIceConnectionState = this._peerConnection.iceConnectionState;
    }
    connStatus.remoteID = this.toEndpointID;
    connStatus.thisID = this.endpointConnection.userid;
    return connStatus;
  },
  getName = function() {
    return this.name || this.constructor.name;
  },
  
 
  toString = function() {
    return "WebRtcConnection[" + this.id +"]";
  };

  return {
    init: init,
    connect: connect,
    disconnect: disconnect,
    update: update,
    attachLocalStream: attachLocalStream,
    _processMessage: _processMessage,
    getState: getState,
    _setState: _setState,
    _gotAnswer: _gotAnswer,
    _emit:_emit,
    getStatus: getStatus,
    destroy: destroy,
    send: send,
    sendData: sendData,
    getName: getName,
    toString: toString
  };

}();  // End of Prototype


function createSignalingSession(context) {
  
  l('DEBUG') && console.log("createSignalingSession context: ", context);
  /* global SigSession : false */
  var sessid = null;
  var toTopic = null;
  if (context._referralSession) {
    var details = context._referralSession.referralDetails;
    sessid =  (details && details.sessionID) ? details.sessionID : null;
    context.toEndpointID =  (details && details.toEndpointID) ? details.toEndpointID : null;
    toTopic =  (details && details.toTopic) ? details.toTopic : null;
  }
 
  if (!context.toEndpointID) {
    throw new Error('toEndpointID must be set in WebRTCConnection object');
  }
  
  var session = context.endpointConnection.createSession({
    id : sessid,
    toTopic : toTopic,
    toEndpointID: context.toEndpointID
    });

  return session;
}
function addSessionCallbacks(context, session) {
   // Define our callbacks for the session.
 
  session.on('pranswer', function(content){
    context._processMessage(content);
  });
  session.on('ice_candidate', function(content){
    context._processMessage(content);
  });
  session.on('message', function(content){
    l('DEBUG') && console.log('SigSession callback called to process content: ', content);
    context._processMessage(content);
  });
  
  session.on('started', function(content){
    // Our Session is started!
    if (content) { context._processMessage(content);}
    //TODO:  This may have some state conflict...
    context.ready = true;
    if (context.pc) {
      if (context.pc.signalingState === 'stable') {
        context._setState("CONNECTED");
      } else if (context.pc.signalingState === 'closed'){
        // There was on offer created, we are just 'READY'
        context._setState('READY');
      } else {
        // All other states of the pc mean we are in the middle of a call
        context._setState("RINGING");
      }
    } else {
      context._setState('STARTED');
    }
    
    if (context._referralSession) {
      context._referralSession.respond(true);
    }
  });
  
  session.on('stopped', function() {
    console.log('stopped , cleaning up...');
    // we need to do some destruction
    context.destroy();
  });
  
  session.on('starting', function() {
    
  });
  session.on('failed', function(message) {
    context._setState('FAILED');
    context.destroy();
  });
  
  l('DEBUG') && console.log('createSignalingSession created!', session);
  
 // session.listEvents();
  return true;
}

function createPeerConnection(/* object */ context) {
  
  var configuration = context.iceServers || null; 
  // Must be true for Firefox
  var pcConstraints = {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]};
  // var pcConstraints =  null;
  /* global RTCPeerConnection: false */
  var peerConnection = null;
  
 
  if (typeof MyRTCPeerConnection !== 'undefined'){
    l('DEBUG')&& console.log("Creating PeerConnection with configuration: " + configuration + "and contrainsts: "+ pcConstraints);
    peerConnection = new MyRTCPeerConnection(configuration, pcConstraints);
   
    peerConnection.onicecandidate = function (evt) {
      
      l('DEBUG') && console.log(this+'onicecandidate Event',evt);
      // If we don't want to 'Trickle' the events, we need to wait here...
      // When we get a Null event, then Send the Offer/Answer...
      // We have changed this content... so, we have to 
      // have a candidate and trickle is on.
      if (evt.candidate) {
          l('DEBUG') && console.log(this+'onicecandidate Sending Ice Candidate');
          var msg = {'type': evt.type,'candidate': evt.candidate};
          this.send(msg);
          
      }
    }.bind(context);  // End of onicecandidate

    peerConnection.oniceconnectionstatechange = function (evt) {
      if (this._peerConnection === null) {
        // If we are null, do nothing... Weird cases where we get here I don't understand yet.
        return;
      }
      l('DEBUG') && console.log(this+' oniceconnectionstatechange ICE STATE CHANGE '+ this._peerConnection.iceConnectionState);
    }.bind(context);  // End of oniceconnectionstatechange

    // once remote stream arrives, show it in the remote video element
    peerConnection.onaddstream = function (evt) {
       console.log('Called??');
      //Only called when there is a VIDEO or AUDIO stream on the remote end...
      l('DEBUG') && console.log(this+' onaddstream Remote Stream Arrived!', evt);
      l('DEBUG') && console.log("TRACE onaddstream AUDIO", evt.stream.getAudioTracks());
      l('DEBUG') && console.log("TRACE onaddstream Video", evt.stream.getVideoTracks());

      if (evt.stream.getAudioTracks().length > 0) {
        this.audio = true;
      }
      if (evt.stream.getVideoTracks().length > 0) {
        this.video = true;
      }
      /*
       * At this point, we now know what streams are requested 
       * we should see what component we have (if we do) and see which one
       * we find and confirm they are the same... 
       * 
       */
     
      var rtcommEndpoint = this.rtcommEndpoint;
      if (this._peerConnection && this.rtcommEndpoint) {
        /* global URL: true */
        this.rtcommEndpoint.setInboundMediaStream(evt.stream);
        l('DEBUG') && console.log('peerConnection.onaddstream - Attached stream to rtcommEndpoint: ', this.rtcommEndpoint);
        /*  Commenting out -- Don't think we need to do this.
         * if(this.rtcommEndpoint.localStream){
          console.log("onaddstream  --> Adding LocalStream to FOUND rtcommEndpoint");
          this._peerConnection.addStream(this.rtcommEndpoint.localStream);
        }*/
      } else {
        // No UI Component... Need to Disconnect...
        console.error("peerConnection.onaddstream - Something is wrong, no peerConnection or rtcommEndpoint");
      }
    }.bind(context);
    
    peerConnection.onnegotiationneeded = function(evt) {
      l('DEBUG') && console.log('ONNEGOTIATIONNEEDED : Received Event - ', evt);
      if ( this._peerConnection.signalingState === 'stable' && this.getState() === 'CONNECTED') {
        // Only if we are stable, renegotiate!
        this._peerConnection.createOffer(
            /*onSuccess*/ function(offer){
              console.log(this+'connect Created Offer ', offer);
                
              this._peerConnection.setLocalDescription(offer,
                  /*onSuccess*/ function() {
                  this.send(offer);
              }.bind(this), 
                  /*onFailure*/ function(error){
                    console.error(error);
                  });
             
                
            }.bind(this),
            /*onFailure*/ function(error) {
              console.error(error);
            });
      } else {
        l('DEBUG') && console.log('ONNEGOTIATIONNEEDED Skipping renegotiate - not stable. State: '+ this._peerConnection.signalingState);
      }
    }.bind(context);
    peerConnection.onremovestream = function (evt) {
      // Stream Removed...
      if (this._peerConnection === null) {
        // If we are null, do nothing... Weird cases where we get here I don't understand yet.
        return;
      }
      // TODO: Emit an event...
      // cleanup(?)
    }.bind(context);

  } else {
    throw new Error("No RTCPeerConnection Available - unsupported browser");

  }
  return peerConnection;
}  // end of createPeerConnection
/*
 *  Following are used to handle different browser implementations of WebRTC
 */
  var MyRTCPeerConnection = (function() { 
    /*global mozRTCPeerConnection:false */
    /*global webkitRTCPeerConnection:false */
    if (navigator.mozGetUserMedia) {
      return mozRTCPeerConnection;
    } else if (navigator.webkitGetUserMedia) {
      return webkitRTCPeerConnection;
    } else {
      throw new Error("Unsupported Browser: ", getBrowser());
    }
  })();
  
  var MyRTCSessionDescription = (function() { 
    /*global mozRTCSessionDescription:false */
    if (navigator.mozGetUserMedia) {
      return mozRTCSessionDescription;
    } else if (RTCSessionDescription) {
      return RTCSessionDescription;
    } else {
      throw new Error("Unsupported Browser: ", getBrowser());
    }
  })();
 
  l('DEBUG') && console.log("Setting RTCSessionDescription", MyRTCSessionDescription);

  var MyRTCIceCandidate = (function() { 
    /*global mozRTCIceCandidate:false */
    /*global RTCIceCandidate:false */
    
    if (navigator.mozGetUserMedia) {
      return mozRTCIceCandidate;
    } else if (RTCIceCandidate) {
      return RTCIceCandidate;
    } else {
      throw new Error("Unsupported Browser: ", getBrowser());
    }
  })();
  l('DEBUG') && console.log("RTCIceCandidate", MyRTCIceCandidate);
  var getBrowser = function() {
    if (navigator.mozGetUserMedia) {
      // firefox
      return("firefox", parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10));
    } else if (navigator.webkitGetUserMedia) {
     return("chrome", parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10));
    } else {
      return("Unknown","Unknown");
    } 
  };
  return WebRTCConnection;
}());

