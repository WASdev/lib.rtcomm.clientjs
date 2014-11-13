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
var WebRTCConnection = (function invocation() {

  /**
   * @memberof module:rtcomm.RtcommEndpoint
   *
   * @description 
   * A WebRTCConnection is a connection from one peer to another encapsulating
   * an RTCPeerConnection and a SigSession
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
   */
  var WebRTCConnection = function WebRTCConnection(parent) {
    var OfferConstraints = {'mandatory': {
      OfferToReceiveAudio: true, 
      OfferToReceiveVideo: true}
    };

    this.config = {
      RTCConfiguration : null,
      RTCOfferConstraints: null,
      RTCConstraints : {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]},
      iceServers: null,
      mediaIn: null,
      mediaOut: null,
      broadcast: {
        audio: true,
        video: true 
      }
    };
    // TODO:  Throw error if no parent.
    this.dependencies = {
      parent: parent || null
    };
    this._ = {
      state: 'disconnected',
      objName:'WebRTCConnection',
      parentConnected : false,
      enabled : false
    };
    this.id = parent.id;
    // Defaults for peerConnection -- must be set on instantiation
    // Required to emit.
    this.events = {
      'alerting': [],
      'ringing': [],
      'trying': [],
      'connected': [],
      'disconnected': []
    };
    this.pc = null;
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;

  };

  WebRTCConnection.prototype = util.RtcommBaseObject.extend((function() {
    /** @lends module:rtcomm.RtcommEndpoint.WebRTCConnection.prototype */
    return {
    /*
     */
    // Same as options for creating a PeerConnection(and offer/answer)
    // include UI elements here.
    /**
     * enable webrtc
     * <p>
     * When enable() is called, if we are connected we will initiate a webrtc connection (generate offer)
     * Otherwise, call enable() prior to connect and when connect occurs it will do what is enabled...
     * </p>
     *
     * @param {object} [config]
     *
     * @param {object} [config.mediaIn]  UI component to attach inbound media stream
     * @param {object} [config.mediaOut] UI Component to attach outbound media stream
     * @param {object} [config.broadcast] 
     * @param {boolean} [config.broadcast.audio] Broadcast Audio
     * @param {boolean} [config.broadcast.video] Broadcast Video
     * @param {object} [config.RTCOfferConstraints] RTCPeerConnection specific config {@link http://w3c.github.io/webrtc-pc/} 
     * @param {object} [config.RTCConfiguration] RTCPeerConnection specific {@link http://w3c.github.io/webrtc-pc/} 
     * @param {object} [config.RTCConfiguration.peerIdentity] 
     * @param {boolean} [config.lazyAV=true]  Enable AV lazily [upon connect/accept] rather than during
     * right away
     * @param {boolean} [config.connect=true] Internal, do not use.
     *
     **/
    enable: function(config,callback) {
      // If you call enable, no matter what we can update the config.
      //
      var self = this;
      var parent = self.dependencies.parent;
      l('DEBUG') && console.log(self+'.enable()  --- entry ---');
      var RTCConfiguration = (config && config.RTCConfiguration) ?  config.RTCConfiguration : this.config.RTCConfiguration;
      RTCConfiguration.iceServers = RTCConfiguration.iceServers || this.config.iceServers.iceServers;
      var RTCConstraints= (config && config.RTCConstraints) ? config.RTCConstraints : this.config.RTCConstraints;
      this.config.RTCOfferConstraints= (config && config.RTCOfferConstraints) ? config.RTCOfferConstraints: this.config.RTCOfferConstraints;

      var connect = (config && typeof config.connect === 'boolean') ? config.connect : parent.sessionStarted();
      var lazyAV = (config && typeof config.lazyAV === 'boolean') ? config.lazyAV : true;

      l('DEBUG') && console.log(self+'.enable() config created, defining callback');

      callback = callback || ((typeof config === 'function') ? config :  function(success, message) {
        l('DEBUG') && console.log(self+'.enable() default callback(success='+success+',message='+message);
      });
      // When Enable is called we have a couple of options:
      // 1.  If parent is connected, enable will createofffer and send it.
      // 2.  if parent is NOT CONNECTED. enable will create offer and STORE it for sending by _connect.
      //
      // 3.  
      /*
       * create an offer during the enable process
       */

      // If we are enabled already, just return ourselves;
      //

      if (this._.enabled) {
        this.enableLocalAV(callback);
        return this;
      } else {
        l('DEBUG') && console.log(self+'.enable() connect if possible? '+connect);
        try {
          this.pc = createPeerConnection(RTCConfiguration, RTCConstraints, this);
        } catch (error) {
          // No PeerConnection support, cannot enable.
          throw new Error(error);
        }
        this._.enabled = true;
        // If we don't have lazy set and we aren't immediately connecting, enable AV.
        l('DEBUG') && console.log(self+'.enable() (lazyAV='+lazyAV+',connect='+connect);
        if (!lazyAV && !connect) {
          // enable now.
          this.enableLocalAV(function(success, message) {
            l('DEBUG') && console.log(self+'.enable() enableLocalAV Callback(success='+success+',message='+message);
            callback(true);
          });
        } else {
          if (connect) {
            this._connect(null, callback(true));
          } else {
            callback(true);
          } 
        } 
        return this;
      }
    },
    /** disable webrtc 
     * Disconnect and reset
     */
    disable: function() {
      this.onEnabledMessage = null;
      this._.enabled = false;
      this._disconnect();
      if (this.pc) {
        this.pc = null;
      }
      return this;
    },
    /**
     * WebRTCConnection is enabled
     * @returns {boolean}
     */
    enabled: function() {
      return this._.enabled;
    },

    /*
     * Called to 'connect' (Send message, change state)
     * Only works if enabled.
     *
     */
    _connect: function(sendMethod,callback) {
      var self = this;

      sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
      callback = callback ||function(success, message) {
        l('DEBUG') && console.log(self+'._connect() default callback(success='+success+',message='+message);
      };

      var doOffer =  function doOffer(success, msg) {
        if (success) { 
          self.pc.createOffer(
            function(offersdp) {
              l('DEBUG') && console.log(self+'.enable() createOffer created: ', offersdp);
                sendMethod({message: offersdp});
                self._setState('trying');
                self.pc.setLocalDescription(offersdp, function(){
                  l('DEBUG') &&  console.log('************setLocalDescription Success!!! ');
                  callback(true);
                }, function(error) { callback(false, error);});
            },
            function(error) {
              console.error('webrtc._connect failed: ', error);
              callback(false);
            },
            self.config.RTCOfferConstraints);
        } else {
          callback(false);
          console.error('_connect failed, '+msg);
        }
      };
      if (this._.enabled && this.pc) {
        this.enableLocalAV(doOffer);
        return true;
      } else {
        return false;
      } 
    },

    _disconnect: function() {
      if (this.pc && this.pc.signalingState !== 'closed') {
        l('DEBUG') && console.debug(this+'._disconnect() Closing peer connection');
       this.pc.close();
      }

      detachMediaStream(this.getMediaIn());
      this._.remoteStream = null;
      detachMediaStream(this.getMediaOut());

      if (this.getState() !== 'disconnected') {
        this._setState('disconnected');
      }
      return this;
    },

    send: function(message) {
      var parent = this.dependencies.parent;
      // Validate message?
      message = (message && message.message) ? message.message : message;
      if (parent._.activeSession) {
        parent._.activeSession.send(message);
      }
    },

    /**
     * Accept an inbound connection
     */
    accept: function(options) {
      var self = this;

      var doAnswer = function doAnswer() {
        l('DEBUG') && console.log(this+'.accept() -- doAnswer -- peerConnection? ', self.pc);
        l('DEBUG') && console.log(this+'.accept() -- doAnswer -- constraints: ', self.config.RTCOfferConstraints);
        console.log('localsttream audio:'+ self._.localStream.getAudioTracks().length );
        console.log('localsttream video:'+ self._.localStream.getVideoTracks().length );
        console.log('PC has a lcoalMediaStream:'+ self.pc.getLocalStreams(), self.pc.getLocalStreams());
        self.pc && self.pc.createAnswer(self._gotAnswer.bind(self), function(error) {
          console.error('failed to create answer', error);
        }
        //self.config.RTCOfferConstraints);
        );
      };
      l('DEBUG') && console.log(this+'.accept() -- accepting --');
      if (this.getState() === 'alerting') {
        this.enableLocalAV(doAnswer);
      }
      return this;
    },
    /** reject an inbound connection */
    reject: function() {
      this._disconnect();
    },
    /** State of the WebRTC, matches an event */
    getState: function() {
      return this._.state;
    },
    _setState: function(state) {
      l('DEBUG') && console.log(this+'._setState to '+state);
      this._.state = state;
      var event = state;
      l('DEBUG') && console.log(this+'._setState emitting event '+event);
      this.emit(event);
    },

    broadcastReady: function broadcastReady() {
      if (( this.config.broadcast.audio || this.config.broadcast.video) && (typeof this._.localStream === 'object')) {
        return true;
        // if we have neither, we are still 'ready'
      } else if (this.config.broadcast.audio === false  && this.config.broadcast.video === false) {
        return true;
      } else {
        return false;
      };
    },
    /** configure broadcast 
     *  @param {object} broadcast 
     *  @param {boolean} broadcast.audio
     *  @param {boolean} broadcast.video
     */
    setBroadcast : function setBroadcast(broadcast) {
      this.config.broadcast.audio = (broadcast.hasOwnProperty('audio') && typeof broadcast.audio === 'boolean') ?
        broadcast.audio :
        this.config.broadcast.audio;
      this.config.broadcast.video= (broadcast.hasOwnProperty('video') && typeof broadcast.video=== 'boolean') ?
        broadcast.video:
        this.config.broadcast.video;
      if (!broadcast.audio && !broadcast.video) { 
        this.config.RTCOfferConstraints= {'mandatory': {OfferToReceiveAudio: true, OfferToReceiveVideo: true}};
      } else {
        this.config.RTCOfferConstraints = null;
      }
      return this;
    },
    pauseBroadcast: function() {
      if (this._.localStream) {
        this._.localStream.getVideoTracks()[0].enabled = false;
        this._.localStream.getAudioTracks()[0].enabled = false;
      }
    },
    resumeBroadcast: function() {
      if (this._.localStream) {
        this._.localStream.getVideoTracks()[0].enabled = true;
        this._.localStream.getAudioTracks()[0].enabled = true;
      }
    },
    getMediaIn: function() {
      return this.config.mediaIn;
    },
    /**
     * DOM node to link the RtcommEndpoint inbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    setMediaIn: function(value) {
      if(validMediaElement(value) ) {
        if (this._.remoteStream) {
          attachMediaStream(value, this._.remoteStream);
          this.config.mediaIn = value;
        } else {
          detachMediaStream(value);
          this.config.mediaIn = value;
        }
      } else {
        throw new TypeError('Media Element object is invalid');
      }
      return this;
    },
    getMediaOut: function() { return this.config.mediaOut; },
    /**
     * DOM Endpoint to link outbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    setMediaOut: function(value) {
      if(validMediaElement(value) ) {
        if (this._.localStream) {
          // We have a stream already, just move the attachment.
          attachMediaStream(value, this._.localStream);
          this.config.mediaOut = value;
        } else {
          // detach streams...
          detachMediaStream(value);
          this.config.mediaOut = value;
        }
      } else {
        throw new TypeError('Media Element object is invalid');
      }
      return this;
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
  _gotAnswer :  function(desc) {

    l('DEBUG') && console.log(this+'.createAnswer answer created:  ', desc);

    var answer = null;
    var pcSigState = this.pc.signalingState;
    var session = this.dependencies.parent._.activeSession;
    var sessionState = session.getState();
    var PRANSWER = (pcSigState === 'have-remote-offer') && (sessionState === 'starting');
    var RESPOND = sessionState === 'pranswer' || pcSigState === 'have-local-pranswer';
    var SKIP = false;
    l('DEBUG') && console.log(this+'.createAnswer._gotAnswer: pcSigState: '+pcSigState+' SIGSESSION STATE: '+ sessionState);
    if (RESPOND) {
      l('DEBUG') && console.log(this+'.createAnswer sending answer as a RESPONSE');
      console.log(this+'.createAnswer sending answer as a RESPONSE', desc);
      session.respond(true, desc);
      this._setState('connected');
    } else if (PRANSWER){
      l('DEBUG') && console.log(this+'.createAnswer sending PRANSWER');
      this._setState('alerting');
      answer = {};
      answer.type = 'pranswer';
      answer.sdp = this.pranswer ? desc.sdp : '';
      desc = answer;
      session.pranswer(desc);
    } else if (this.getState() === 'connected' || this.getState() === 'alerting') {
      l('DEBUG') && console.log(this+'.createAnswer sending ANSWER (renegotiation?)');
      // Should be a renegotiation, just send the answer...
      session.send(desc);
    } else {
      SKIP = true;
      this._setState('alerting');
    }
    SKIP = (PRANSWER && answer && answer.sdp === '') || SKIP;
    l('DEBUG') && console.log('_gotAnswer: Skip setLocalDescription? '+ SKIP);
    if (!SKIP) {
      this.pc.setLocalDescription(desc,/*onSuccess*/ function() {
        l('DEBUG') && console.log('setLocalDescription in _gotAnswer was successful', desc);
      }.bind(this),
        /*error*/ function(message) {
        console.error(message);
      });
    }
  },

  /* Process inbound messages
   *
   *  These are 'PeerConnection' messages
   *  Offer/Answer/ICE Candidate, etc...
   */
  _processMessage : function(message) {
    var self = this;
    var isPC = this.pc ? true : false;
    if (!message) {
      return;
    }
    l('DEBUG') && console.log(this+"._processMessage Processing Message...", message);
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
        // Set our local description
        isPC && this.pc.setRemoteDescription(new MyRTCSessionDescription(message));
        this._setState('ringing');
        break;
      case 'answer':
        /*
         *  If we get an 'answer', we should be in a state to RECEIVE the answer,
         *  meaning we can't have sent an answer and receive an answer.
         */
        l('DEBUG') && console.log(this+'._processMessage ANSWERING', message);
        /* global RTCSessionDescription: false */
        isPC && this.pc.setRemoteDescription(
          new MyRTCSessionDescription(message),
          function() {
            l('DEBUG') && console.log("Successfully set the ANSWER Description");
          },
          function(error) {
            console.error('setRemoteDescription has an Error', error);
          });
        this._setState('connected');
        break;
      case 'offer':
        /*
         * When an Offer is Received 
         * 
         * 1.  Set the RemoteDescription -- depending on that result, emit alerting.  whoever catches alerting needs to accept() in order
         * to answer;
         *
         * , we need to send an Answer, this may
         * be a renegotiation depending on our 'state' so we may or may not want
         * to inform the UI.
         */
        var offer = message;
        l('DEBUG') && console.log(this+'_processMessage received an offer ');
        if (this.getState() === 'disconnected') {
           self.pc.setRemoteDescription(new MyRTCSessionDescription(offer),
             /*onSuccess*/ function() {
               l('DEBUG') && console.log(this+' PRANSWER in processMessage for offer()');
                if (!self.dependencies.parent.sessionStarted()) { 
                  self.dependencies.parent._.activeSession.pranswer({'type': 'pranswer', 'sdp':''});
                }
                this._setState('alerting');
               }.bind(self),
               /*onFailure*/ function(error){
                 console.error('setRemoteDescription has an Error', error);
               });
        } else if (this.getState() === 'connected') {
          // THis should be a renegotiation.
          isPC && this.pc.setRemoteDescription(new MyRTCSessionDescription(message),
              /*onSuccess*/ function() {
                this.pc.createAnswer(this._gotAnswer.bind(this), function(error){
                  console.error('Failed to create Answer:'+error);
                });
              }.bind(this),
              /*onFailure*/ function(error){
                console.error('setRemoteDescription has an Error', error);
              });
        } else {
          l('DEBUG') && console.error(this+'_processMessage unable to process offer('+this.getState()+')', message);
        }
        break;
      case 'icecandidate':
        try {
          var iceCandidate = new MyRTCIceCandidate(message.candidate);
          l('DEBUG') && console.log(this+'_processMessage iceCandidate ', iceCandidate );
          isPC && this.pc.addIceCandidate(iceCandidate);
        } catch(err) {
          console.error('addIceCandidate threw an error', err);
        }
        break;
      default:
        // Pass it up out of here...
        // TODO: Fix this, should emit something different here...
        console.error(this+'._processMessage() Nothing to do with this message:', message);
      }
    } else {
      l('DEBUG') && console.log(this+'_processMessage Unknown Message', message);
    }
  },

 /**
  * Apply or update the Media configuration for the webrtc object
  * @param {object} [config]
  *
  * @param {boolean} config.enable
  * @param {object} config.broadcast
  * @param {boolean} config.broadcast.audio
  * @param {boolean} config.broadcast.video
  * @param {object} config.mediaIn
  * @param {object} config.mediaOut
  *
  * @param {function} [callback] callback called if getUserMedia enabled.
  *
  */
  setLocalMedia: function setLocalMedia(config,callback) {
    var enable = false;
    l('DEBUG') && console.log(this+'setLocalMedia() using config:', config);
    if (config && typeof config === 'object') {
      config.mediaIn && this.setMediaIn(config.mediaIn);
      config.mediaOut && this.setMediaOut(config.mediaOut);
      config.broadcast && this.setBroadcast(config.broadcast);
      enable = (typeof config.enable === 'boolean')? config.enable : enable;
    } else if (config && typeof config === 'function') {
      callback = config;
    } else {
      // using defaults
      l('DEBUG') && console.log(this+'setLocalMedia() using defaults');
    }

    var audio = this.config.broadcast.audio;
    var video = this.config.broadcast.video;
    var self = this;
    callback = callback || function(success, message) {
      l('DEBUG') && console.log(self+'.setLocalMedia() default callback(success='+success+',message='+message);
    };
    l('DEBUG') && console.log(self+'.setLocalMedia() audio['+audio+'] & video['+video+'], enable['+enable+']');

    // Enable AV or if enabled, attach it. 
    if (enable) {
      this.enableLocalAV(callback);
    }
    return this;
  },

  /**
   * Enable Local Audio/Video and attach it to the connection
   *
   * Generally called through setLocalMedia({enable:true})
   *
   * @param {object} options
   * @param {boolean} options.audio
   * @param {boolean} options.video
   * @callback 
   *
   */
  enableLocalAV: function(options, callback) {
    var self = this;
    var audio,video;
    if (options && typeof options === 'object') {
      audio = options.audio;
      video = options.video;
      // Update settings.
      this.setBroadcast({audio: audio, video: video});
    } else {
      callback = (typeof options === 'function') ? options : function(success, message) {
       l('DEBUG') && console.debug(self+'.enableLocalAV() default callback(success='+success+',message='+message);
      };
      // using current settings.
      audio = this.config.broadcast.audio;
      video= this.config.broadcast.video;
    }

    var attachLocalStream = function attachLocalStream(stream){
      self.getMediaOut() && attachMediaStream(self.getMediaOut(),stream);
      if (self.pc) {
        if (self.pc.getLocalStreams()[0] === stream) {
          // Do nothing, already attached
          return true;
        } else {
          self._.localStream = stream;
          self.pc.addStream(stream);
          return true;
        }
      } else {
        l('DEBUG') && console.log(self+'.enableLocalAV() -- No peerConnection available');
        return false;
      }
    };
    
    if (audio || video ) { 
      if (this._.localStream) {
        l('DEBUG') && console.log(self+'.enableLocalAV() already setup, reattching stream');
        callback(attachLocalStream(this._.localStream));
      } else {
        getUserMedia({'audio': audio, 'video': video},
          /* onSuccess */ function(stream) {
            callback(attachLocalStream(stream));
          },
        /* onFailure */ function(error) {
          callback(false, "getUserMedia failed");
        });
      }
    } else {
      l('DEBUG') && console.debug(self+'.enableLocalAV() - nothing to do; both audio & video are false');
    }
  },

 setIceServers: function(service) {
    // Returned object expected to look something like:
    // {"iceServers":[{"url": "stun:host:port"}, {"url","turn:host:port"}] 
    var iceServers = null ;
    if (service && service.iceURL)  {
        var urls = [];
        service.iceURL.split(',').forEach(function(url){
          urls.push({'url': url});
        });
        iceServers = {'iceServers':urls};
    } else {
     iceServers = {'iceServers':[]};
    }
    this.config.iceServers = iceServers;
   },
  getIceServers: function() {
    return this.config.iceServers;
  }
  };





})()); // End of Prototype

function createPeerConnection(RTCConfiguration, RTCConstraints, /* object */ context) {
  var peerConnection = null;
  if (typeof MyRTCPeerConnection !== 'undefined'){
    l('DEBUG')&& console.log("Creating PeerConnection with RTCConfiguration: " + RTCConfiguration + "and contrainsts: "+ RTCConstraints);
    peerConnection = new MyRTCPeerConnection(RTCConfiguration, RTCConstraints);

    //attach callbacks
    peerConnection.onicecandidate = function (evt) {
      l('DEBUG') && console.log(this+'onicecandidate Event',evt);
      if (evt.candidate) {
          l('DEBUG') && console.log(this+'onicecandidate Sending Ice Candidate');
          var msg = {'type': evt.type,'candidate': evt.candidate};
          this.send(msg);
      }
    }.bind(context);  // End of onicecandidate

    peerConnection.oniceconnectionstatechange = function (evt) {
      if (this.pc === null) {
        // If we are null, do nothing... Weird cases where we get here I don't understand yet.
        l('DEBUG') && console.log(this+' oniceconnectionstatechange ICE STATE CHANGE fired but this.pc is null');
        return;
      }
      l('DEBUG') && console.log(this+' oniceconnectionstatechange ICE STATE CHANGE '+ this.pc.iceConnectionState);
      // When this is connected, set our state to connected in webrtc.
      if (this.pc.iceConnectionState === 'disconnected') {
        this.disable();
      } else if (this.pc.iceConnectionState === 'connected') {
        this._setState('connected');
      }
    }.bind(context);  // End of oniceconnectionstatechange

    // once remote stream arrives, show it in the remote video element
    peerConnection.onaddstream = function (evt) {
      //Only called when there is a VIDEO or AUDIO stream on the remote end...
      l('DEBUG') && console.log(this+' onaddstream Remote Stream Arrived!', evt);
      l('TRACE') && console.log("TRACE onaddstream AUDIO", evt.stream.getAudioTracks());
      l('TRACE') && console.log("TRACE onaddstream Video", evt.stream.getVideoTracks());
      // This isn't really used, may remove
      if (evt.stream.getAudioTracks().length > 0) {
       // this.audio = true;
      }
      if (evt.stream.getVideoTracks().length > 0) {
       // this.video = true;
      }
      /*
       * At this point, we now know what streams are requested
       * we should see what component we have (if we do) and see which one
       * we find and confirm they are the same...
       *
       */
      // Save the stream
      context._.remoteStream = evt.stream;
      if (context.getMediaIn()) {
        l('DEBUG') && console.log(this+' onaddstream Attaching inbound stream to: ',context.getMediaIn());
        attachMediaStream(context.getMediaIn(), evt.stream);
      }
    }.bind(context);

    peerConnection.onnegotiationneeded = function(evt) {
      l('DEBUG') && console.log('ONNEGOTIATIONNEEDED : Received Event - ', evt);
      if ( this.pc.signalingState === 'stable' && this.getState() === 'CONNECTED') {
        // Only if we are stable, renegotiate!
        this.pc.createOffer(
            /*onSuccess*/ function(offer){
              this.pc.setLocalDescription(offer,
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
        l('DEBUG') && console.log('ONNEGOTIATIONNEEDED Skipping renegotiate - not stable && connected. State: '+ this.pc.signalingState);
      }
    }.bind(context);

    peerConnection.onsignalingstatechange = function(evt) {
        l('DEBUG') && console.log('peerConnection onsignalingstatechange fired: ', evt);
    }.bind(context);

    peerConnection.onclosedconnection = function(evt) {
      l('DEBUG') && console.log('FIREFOX peerConnection onclosedconnection fired: ', evt);
    }.bind(context);
    peerConnection.onconnection = function(evt) {
      l('DEBUG') && console.log('FIREFOX peerConnection onconnection fired: ', evt);
    }.bind(context);

    peerConnection.onremovestream = function (evt) {
      l('DEBUG') && console.log('peerConnection onremovestream fired: ', evt);
      // Stream Removed...
      if (this.pc === null) {
        // If we are null, do nothing... Weird cases where we get here I don't understand yet.
        l('DEBUG') && console.log('peerConnection onremovestream fired: ', evt);
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
var getBrowser = function() {
    if (typeof navigator === 'undefined' && typeof window === 'undefined') {
      // probably in node.js no browser support
      return ('node.js','unknown');
    } else  if (navigator && navigator.mozGetUserMedia) {
      // firefox
      return("firefox", parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10));
    } else if (navigator && navigator.webkitGetUserMedia) {
     return("chrome", parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10));
    } else {
      return("Unknown","Unknown");
    }
  };

var MyRTCPeerConnection = (function() {
  /*global mozRTCPeerConnection:false */
  /*global webkitRTCPeerConnection:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  } else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCPeerConnection;
  } else if (navigator && navigator.webkitGetUserMedia) {
    return webkitRTCPeerConnection;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();

var MyRTCSessionDescription = (function() {
  /*global mozRTCSessionDescription:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  }  else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCSessionDescription;
  } else if (typeof RTCSessionDescription !== 'undefined' ) {
    return RTCSessionDescription;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();

l('DEBUG') && console.log("Setting RTCSessionDescription", MyRTCSessionDescription);


var MyRTCIceCandidate = (function() {
  /*global mozRTCIceCandidate:false */
  /*global RTCIceCandidate:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  } else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCIceCandidate;
  } else if (typeof RTCIceCandidate !== 'undefined') {
    return RTCIceCandidate;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();
l('DEBUG') && console.log("RTCIceCandidate", MyRTCIceCandidate);

var validMediaElement = function(element) {
  return( (typeof element.srcObject !== 'undefined') ||
      (typeof element.mozSrcObject !== 'undefined') ||
      (typeof element.src !== 'undefined'));
};

/*
 * Assign getUserMedia, attachMediaStream as private class functions
 */
var getUserMedia, attachMediaStream,detachMediaStream;
/* globals URL:false */

  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    getUserMedia = null;
    attachMediaStream = null;
    detachMediaStream = null;
  // Creating methods for Firefox
  } else if (navigator && navigator.mozGetUserMedia) {

    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    // Attach a media stream to an element.
    attachMediaStream = function(element, stream) {
      l('DEBUG') && console.log("FIREFOX --> Attaching media stream");
      try { 
        element.mozSrcObject = stream;
    //    element.play();
      } catch (e) {
        console.error('Attach Media Stream failed in FIREFOX:  ', e);
      }
    };
    detachMediaStream = function(element) {
    l('DEBUG') && console.log("FIREFOX --> Detaching media stream");
    if (element) {
      element.mozSrcObject = null;
    }
  };

} else if (navigator && navigator.webkitGetUserMedia) {
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
  attachMediaStream = function(element, stream) {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.error('Error attaching stream to element.');
    }
  };
  detachMediaStream = function(element) {
    var nullStream = '';
    if (element) {
      if (typeof element.srcObject !== 'undefined') {
        element.srcObject = nullStream;
      } else if (typeof element.mozSrcObject !== 'undefined') {
        element.mozSrcObject = nullStream;
      } else if (typeof element.src !== 'undefined') {
        element.src = nullStream;
      } else {
        console.error('Error attaching stream to element.');
      }
    }
  };
} else {
  console.error("Browser does not appear to be WebRTC-capable");
  var skip = function skip() {
    console.error("Function not supported in browser");
  };
  getUserMedia = skip;
  attachMediaStream = skip;
  detachMediaStream = skip;
}

return WebRTCConnection;

})()


