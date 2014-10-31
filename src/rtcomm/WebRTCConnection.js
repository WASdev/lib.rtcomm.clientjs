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
   * @class
   * @memberof module:rtcomm.webrtc
   *
   * @classdesc
   * A WebRTCConnection is a connection from one peer to another encapsulating
   * an RTCPeerConnection and a SigSession
   *
   *
   * @private
   */
  var WebRTCConnection = function WebRTCConnection(parent) {
    this.config = {
      autoAnswer: false,
      RTCConfiguration : null,
      RTCConstraints : {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]},
      mediaIn: null,
      mediaOut: null,
      broadcast: {
        audio: false,
        video: false
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

  WebRTCConnection.prototype = util.RtcommBaseObject.extend({
    /*
     * When you call enable() if we are connected we will send a message.
     * otherwise, you should call enable() prior to connect and when connect occurs
     * it will do what is enabled...
     */
    // Same as options for creating a PeerConnection(and offer/answer)
    // include UI elements here.
    /**
     * @param {object} [config]
     *
     * @param {object} [config.mediaIn]
     * @param {object} [config.mediaOut]
     * @param {object} [config.broadcast]
     * @param {boolean} config.broadcast.audio
     * @param {boolean} config.broadcast.video
     *
     * Generally, these will not be messed with unless specific control of the 
     * peerConnection is required.
     *
     * @param {object} [config.RTCOfferOptions]
     * @param {object} [config.RTCConfiguration]
     * @param {object} [config.RTCConfiguration.iceServers]
     * @param {object} [config.RTCConfiguration.iceTranports]
     * @param {object} [config.RTCConfiguration.peerIdentity]
     *
     * @param {boolean} [config.connect=true]
     *
     * mediaIn/MediaOut?
     **/
    enable: function(config,callback) {
      // If you call enable, no matter what we can update the config.
      //
      var self = this;
      var parent = self.dependencies.parent;

      l('DEBUG') && console.log(self+'.enable()  --- entry ---');
      var RTCConfiguration = (config && config.RTCConfiguration) ?  config.RTCConfiguration : this.config.RTCConfiguration;
      var RTCConstraints= (config && config.RTCConstraints) ? config.RTCConstraints : this.config.RTCConstraints;
      var RTCOfferOptions= (config && config.RTCOfferOptions) ? config.RTCOfferOptions: this.config.RTCOfferOptions;
      var connect = (config && typeof config.connect === 'boolean') ? config.connect : true;

      callback = callback || (typeof config === 'function') ? config :  function(success, message) {
        l('DEBUG') && console.log(self+'.enable() default callback(success='+success+',message='+message);
      };

      /*
       * create an offer during the enable process
       */
      var createOffer = function createOffer() {
        l('DEBUG') && console.log(self+'.enable() calling createOffer()');
        // Did addstream work?
        //
         self.pc.createOffer(
          function(offersdp) {
            self.onEnabledMessage = offersdp;
            l('DEBUG') && console.log(self+'.enable() createOffer created: ', offersdp);
            if (parent.sessionStarted() && connect) {
              self._connect();
            }
            callback(true);
          },
          function(error) {
            callback(false, error);
          });
         // RTCOfferOptions);
      };
      // If we are enabled already, just return ourselves;
      if (this._.enabled) {
        callback(true);
        return this;
      } else {
        try {
          this.pc = createPeerConnection(RTCConfiguration, RTCConstraints, this);
        } catch (error) {
          // No PeerConnection support, cannot enable.
          throw new Error(error);
        }
        l('DEBUG') && console.log(self+'.enable() connect if possible? '+connect);
        if (this.config.broadcast.audio || this.config.broadcast.video) {
          l('DEBUG') && console.log(self+'.enable() calling .setLocalMedia()');
          this.setLocalMedia({enable:true},function(success, message) {
            l('DEBUG') && console.log(self+'.enable() setLocalMedia Callback(success='+success+',message='+message);
            if (success) {
              l('DEBUG') && console.log('LocalStream should be set here:  self._.localStream', self._.localStream);
              self._.localStream && self.pc.addStream(self._.localStream);
            }
            createOffer();
          });
        } else {
          // set ReceiveOnly
          createOffer();
        }
        // Don't need much, just set enabled to true.
        // Default message
        //
        // Our enable should be an OFFER - ready to go.
          this._.enabled = true;
          return this;
      }
    },

    disable: function() {
      this.onEnabledMessage = null;
      this._.enabled = false;
      this._disconnect();
      if (this.pc) {
        this.pc = null;
      }
      return this;
    },

    _disconnect: function() {
      if (this.pc && this.pc.signalingState !== 'closed') {
       this.pc.close();
      }
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
    /*
     * options should be override w/ RTCOfferOptions I guess..
     */
    accept: function(options) {
      if (this.getState() === 'alerting') {
      this.pc && this.pc.createAnswer(this._gotAnswer.bind(this), function(error) {
          console.error('failed to create answer', error);
        },
        this.config.RTCOfferOptions);
      }
    },
    reject: function() {
      this._disconnect();
    },
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
    /*
     * Called to 'connect' (Send message, change state)
     * Only works if enabled.
     *
     */
    _connect: function(sendMethod) {
      // Changes state, returns message that hsould be sent?
      //
      sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
      if (this._.enabled && this.onEnabledMessage) {
        sendMethod({message: this.onEnabledMessage});
        this._setState('trying');
        this.pc.setLocalDescription(this.onEnabledMessage, function(){
          l('DEBUG') &&  console.log('************setLocalDescription Success!!! ');
        });
        return true;
      } else {
         l('DEBUG') && console.log('!!!!! not enabled, skipping...');
        return false;
      }
    },
    setBroadcast : function setBroadcast(broadcast) {
      this.config.broadcast.audio = (broadcast.hasOwnProperty('audio') && typeof broadcast.audio === 'boolean') ?
        broadcast.audio :
        this.config.broadcast.audio;
      this.config.broadcast.video= (broadcast.hasOwnProperty('video') && typeof broadcast.video=== 'boolean') ?
        broadcast.video:
        this.config.broadcast.video;
      return this;
    },
    /**
     * DOM node to link the RtcommEndpoint inbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    getMediaIn: function() {
      return this.config.mediaIn;
    },
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
    /**
     * DOM Endpoint to link outbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    getMediaOut: function() { return this.config.mediaOut; },
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
    getAutoAnswer: function() { return this.config.autoAnswer },

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
    var RESPOND = this.config.autoAnswer || sessionState === 'pranswer' || pcSigState === 'have-local-pranswer';
    var SKIP = false;
    l('DEBUG') && console.log(this+'.createAnswer._gotAnswer: pcSigState: '+pcSigState+' SIGSESSION STATE: '+ sessionState);
    if (RESPOND) {
      l('DEBUG') && console.log(this+'.createAnswer sending answer as a RESPONSE');
      this._setState('connected');
      session.respond(true, desc);
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

  /** Process inbound messages
   *
   *  These are 'PeerConnection' messages
   *  Offer/Answer/ICE Candidate, etc...
   */
  _processMessage : function(message) {
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
         * When an Offer is Received , we need to send an Answer, this may
         * be a renegotiation depending on our 'state' so we may or may not want
         * to inform the UI.
         */
        if (this.getState() === 'disconnected' || this.getState() === 'connected') {
          l('DEBUG') && console.log(this+'_processMessage received an offer ');
          if (!this._.enabled) { 
            // enable us, but don't connect, we'll have to answer here and accept at some point
            this.enable({connect: false});
            // reset this if we had to enable...
            isPC = this.pc ? true : false;
          }
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
    if (config && typeof config === 'object') {
      config.mediaIn && this.setMediaIn(config.mediaIn);
      config.mediaOut && this.setMediaOut(config.mediaOut);
      config.broadcast && this.setBroadcast(config.broadcast);
      enable = config.enable || enable;
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
    if(audio || video) {
      // a mediaOut is required
      if (this.getMediaOut()) {
        if (enable) {
          //TODO:  Check and see if we are adding audio or video?
          if (!self._.localStream) {
            getUserMedia({'audio': audio, 'video': video},
                /* onSuccess */ function(stream) {
                  // save the localstream
                  self._.localStream = stream;
                  attachMediaStream(self.getMediaOut(),stream);
                  callback(true);
                },
              /* onFailure */ function(error) {
                callback(false, "getUserMedia failed");
              });
          } else {
            callback(true);
          }
        }
      } else {
        console.error("No MediaOut set... !Nothing to broadcast");
      }
    }
    return this;
  },
  });  // End of Prototype

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
      // Save the stream
      context._.remoteStream = evt.stream;
      if (context.getMediaIn()) {
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
        l('DEBUG') && console.log('ONNEGOTIATIONNEEDED Skipping renegotiate - not stable. State: '+ this.pc.signalingState);
      }
    }.bind(context);

    peerConnection.onsignalingstatechange = function(evt) {
        l('DEBUG') && console.log('peerConnection onsignalingstatechange fired: ', evt);
       // l('DEBUG') && console.log('State: '+ this.pc.signalingState);
    }.bind(context);

    peerConnection.onremovestream = function (evt) {
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
    } else if (navigator && navigator.mozGetUserMedia) {
    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    // Attach a media stream to an element.
    attachMediaStream = function(element, stream) {
      l('DEBUG') && console.log("FIREFOX --> Attaching media stream");
      element.mozSrcObject = stream;
      element.play();
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
  }

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
return WebRTCConnection;

})()


