 /*
 *useCordova  Copyright 2014 IBM Corp.
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
var PhoneRTCConnection = (function invocation() {

  /**
   * @memberof module:rtcomm.RtcommEndpoint
   *
   * @description 
   * A PhoneRTCConnection is a shim to the cordova.phonertc plugin it replaces the WebRTCConnection
   * if cordova.phonertc is found.
   *
   *  @constructor
   *
   *  @extends  module:rtcomm.util.RtcommBaseObject
   */
   /*global phonertc:false*/ 
   /*global cordova:false*/ 
   /*global l:false*/ 
   /*global util:false*/ 
  var PhoneRTCConnection = function PhoneRTCConnection(parent) {

    this.config = {
      RTCConfiguration : {iceTransports : "all"},
      RTCOfferConstraints: null,
      RTCConstraints : {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]},
      iceServers: [],
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
      objName:'PhoneRTCConnection',
      parentConnected : false,
      enabled : false
    };
    // Note, this may be a problem... 
    // Needs to be cordova.plugins.phonertc in other apps...
    if (typeof phonertc !== 'undefined') {
      console.log('phonertc is: ', phonertc);
      this._.phonertc = phonertc; 
    } else if (typeof cordova !== 'undefined') {
      console.log('Cordova is: ', cordova);
      if (cordova.plugins) {
        if (cordova.plugins.phonertc) {
            console.log('phonertc is: ', cordova.plugins.phonertc);
            this._.phonertc = cordova.plugins.phonertc; 
        } else {
           console.error('UNABLE TO FIND phonertc!');
        }
      } else {
        console.error('UNABLE TO FIND cordova.plugins!');
      }
    } else {
       console.error('UNABLE TO FIND cordova!');
    }
    this.id = parent.id;
    // Required to emit.
    this.events = {
      'alerting': [],
      'ringing': [],
      'trying': [],
      'connected': [],
      'disconnected': []
    };
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;
  };

  /*global util:false*/

  PhoneRTCConnection.prototype = util.RtcommBaseObject.extend((function() {
    /** @lends module:rtcomm.RtcommEndpoint.PhoneRTCConnection.prototype */
    var proto = {
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
        if (config) {
          if (typeof config === 'function') {
            callback = config;
          }
        }
        l('DEBUG') && console.log(this+'.enable() called...');
        this._.enabled = true;
        callback && callback(true);
        //TODO:  If connected, call _connect
        return this;
      },
      /** disable webrtc 
       * Disconnect and reset
       */
      disable: function() {
        this.onEnabledMessage = null;
        this._.enabled = false;
        this._disconnect();
        if (this._.phonertc) {
          this._.phonertc = null;
        }
        return this;
      },
      /**
       * PhoneRTCConnection is enabled
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
        l('DEBUG') && console.log(self+'._connect() called!' );
        sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
        callback = callback ||function(success, message) {
          l('DEBUG') && console.log(self+'._connect() default callback(success='+success+',message='+message);
        };
        if (this._.enabled) {
          this._setState('trying');
          createPhoneRTCSession(true,this).call();
          return true;
        } else {
          return false;
        } 
      },

      _disconnect: function() {
        this._.pSession && this._.pSession.close();
        this._.pSession = null;
        if (this.getState() !== 'disconnected' && this.getState() !== 'alerting') {
          this._setState('disconnected');
        }
        return this;
      },

      /**
       * Accept an inbound connection
       */
      accept: function(options) {
        var self = this;
        l('DEBUG') && console.log(this+'.accept() -- accepting --');
        if (this.getState() === 'alerting') {
          // We need to receive this now. 
          if (this._.offer) {
            self._.pSession.receiveMessage(self._.offer);
            delete self._.offer;
            this._setState('connected');
            return true;
          } else {
            l('DEBUG') && console.log(this+'.accept() -- No Offer to receive --');
          }
        } else {
          return false;
        }
      },
      /** reject an inbound connection */
      reject: function() {
        this._disconnect();
      },
      send: function(message) {
        l('DEBUG') && console.log('Trying to send message: ', message);
        var parent = this.dependencies.parent;
        var session = parent._.activeSession;
        var sendMethod = null;

        if (session) { 
          // Validate message?
          message = this.createMessage(message);
          switch(message.content.type) {
            case 'offer': 
              if (session.getState() === 'stopped') {
                 sendMethod = session.start.bind(session);
              }
              break;
            case 'answer':
              if (session.getState() === 'pranswer') {
                 // Actually need to respond.
                 sendMethod = session.respond.bind(session);
              }
              break;
            case 'candidate':

              // Our 'in' message to send here looks like:
              //  { type: candidate,
              //    candidate: 'candidate:asbdsadf asdfasdf asdf sad fsdf',
              //    label: sdpMLineIndex;
              //    id: sdpMid
              // Need to change back to 'normal'
              //
              // Transform the message
              message.content.type = 'icecandidate';
              var newCandidate = {
                candidate: message.content.candidate,
                sdpMLineIndex: message.content.label,
                sdpMid: message.content.id
              };
              delete message.content.label;
              delete message.content.id;
              message.content.candidate = newCandidate;
              sendMethod = session.send.bind(session);
              break;
            case 'bye':
              console.log('phonertc.bye - doing not sending');
              break;
            default:
              sendMethod = session.send.bind(session);
          }
          console.log('sendMethod', message);
          sendMethod({payload: message});
        } else {
          console.log('No session for send method, dropping message', message);
        }
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
        }
      },
      /** configure broadcast 
       *  @param {object} broadcast 
       *  @param {boolean} broadcast.audio
       *  @param {boolean} broadcast.video
       */
      setBroadcast : function setBroadcast(broadcast) {
        this.config.broadcast.audio = (broadcast.hasOwnProperty('audio') && 
                                       typeof broadcast.audio === 'boolean') ? 
                                        broadcast.audio :
                                        this.config.broadcast.audio;
        this.config.broadcast.video= (broadcast.hasOwnProperty('video') && 
                                      typeof broadcast.video=== 'boolean') ?
                                        broadcast.video:
                                        this.config.broadcast.video;
        /*
        if (!broadcast.audio && !broadcast.video) { 
          this.config.RTCOfferConstraints= {'mandatory': {OfferToReceiveAudio: true, OfferToReceiveVideo: true}};
        } else {
          this.config.RTCOfferConstraints = null;
        }
        */
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
        // Setting the 'local' should cause the getuserMeida to be called...
        this._.phonertc && this._.phonertc.setVideoView({
          'container': value, 
          local: {
                position: [0, 0],
                size: [100, 100]
          }});
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
    createMessage: function(content) {
      var message = {'type': 'webrtc', 'content': null};
      if (content) {
        if (content.type && content.content) {
          // presumably OK, just return it
          message = content;
        } else {
     //     if (content.candidate) {
            // Its an icecandidate, need to normalize this.
    //        message.content =  {'type': 'icecandidate','candidate': content.candidate};
      //    } else {
            message.content = content;
       //   }
        }
      }
      return message;
    },

    /* Process inbound messages
     *
     *  These are 'PeerConnection' messages
     *  Offer/Answer/ICE Candidate, etc...
     */
    _processMessage : function(message) {
      var self = this;
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
           */
          // Set our local description
          //  Only set state to ringing if we have a local offer...
          this._setState('ringing');
          break;
        case 'answer':
          /*
           *  If we get an 'answer', we should be in a state to RECEIVE the answer,
           *  meaning we can't have sent an answer and receive an answer.
           */
          l('DEBUG') && console.log(this+'._processMessage ANSWERING', message);
          /* global RTCSessionDescription: false */
          this._.pSession.receiveMessage(message);
          this._setState('connected');
          break;
        case 'offer':
          var offer = message;
          l('DEBUG') && console.log(this+'_processMessage received an offer -> State:  '+this.getState());
          l('DEBUG') && console.log(this+' PRANSWER in processMessage for offer()');
          //This sets up peerconnection
          // Save the message so we can receive it on accept.
          self._.offer = offer;
          if (!self.dependencies.parent.sessionStarted()) { 
             createPhoneRTCSession(false,self).call();
             self.dependencies.parent._.activeSession.pranswer({'type': 'pranswer', 'sdp':''});
          }
          self._setState('alerting');
          break;
        case 'icecandidate':
          // Transfrom message 
          var newMessage = { 
            type: 'candidate',
            label: message.candidate.sdpMLineIndex,
            id: message.candidate.sdpMid,
            candidate: message.candidate.candidate
          };
          l('DEBUG') && console.log(this+'_processMessage iceCandidate --> newMessage:', newMessage);
          self._.pSession.receiveMessage(newMessage);
          break;
        default:
          self._.pSession.receiveMessage(message);
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
      } else {
        callback(this);
      }
      return this;
    },

   setIceServers: function(service) {
     function buildTURNobject(url) {
       // We expect this to be in form 
       // turn:<userid>@servername:port:credential:<password>
       var matches = /^turn:(\S+)\@(\S+\:\d+):credential:(.+$)/.exec(url);
       var user = matches[1] || null;
       var server = matches[2] || null;
       var credential = matches[3] || null;

       var iceServer = {
         'url': null,
         'username': null,
         'credential': null
       };
       if (user && server && credential) {
         iceServer.url = 'turn:'+server;
         iceServer.username= user;
         iceServer.credential= credential;
       } else {
         l('DEBUG') && console.log('Unable to parse the url into a Turn Server');
         iceServer = null;
       }
       return iceServer;
     }

      // Returned object expected to look something like:
      // {"iceServers":[{"url": "stun:host:port"}, {"url","turn:host:port"}] 
      var urls = [];
      if (service && service.iceURL)  {
          service.iceURL.split(',').forEach(function(url){
            // remove leading/trailing spaces
            url = url.trim();
            var obj = null;
            if (/^stun:/.test(url)) {
              l('DEBUG') && console.log(this+'.setIceServers() Is STUN: '+url);
              obj = {'url': url};
            } else if (/^turn:/.test(url)) {
              l('DEBUG') && console.log(this+'.setIceServers() Is TURN: '+url);
              obj = buildTURNobject(url);
            } else {
              l('DEBUG') && console.error('Failed to match anything, bad Ice URL: '+url);
            }
            obj && urls.push(obj);
          });
      } 
      this.config.iceServers = urls;
     },
    getIceServers: function() {
      return this.config.iceServers;
      }
   };
   return proto;

  })()); // End of Prototype

  /*
   *  Following are used to handle different browser implementations of WebRTC
   */
  function createPhoneRTCSession(initiator,context) {
    // This only supports 1, not a list of them...
     
     var config = {
       isInitiator: initiator,
       // Need to be populated some other way... 
        turn: {
                host: 'turn:turn.example.com:3478',
                username: 'test',
                password: '123'
        },
       
       streams: {
         audio: context.config.broadcast.audio,
         video: context.config.broadcast.video
       }
     };
     var iceServers = context.getIceServers(); 
     l('DEBUG') && console.log('createPhoneRTCSession using iceServers: ', iceServers);
     if (iceServers.length > 0) {
       config.turn = {};
       config.turn.host = iceServers[0].host;
       config.turn.username= iceServers[0].username ;
       config.turn.password = iceServers[0].credentials;
     }

     l('DEBUG') && console.log('createPhoneRTCSession using config: ', config);

     context._.pSession = new context._.phonertc.Session(config);
     /* Define callback for the pSession to send a message. */
     context._.pSession.on('sendMessage', context.send.bind(context));
     context._.pSession.on('answer', function(data){
       l('DEBUG') && console.log(context + ' Other Client Answered: ', data);
       // Other client answered...
     });
     context._.pSession.on('disconnect', function(data){
        l('DEBUG') && console.log(context+' Other Client Disconnected', data);
      });
    return context._.pSession;
  }

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

  return PhoneRTCConnection;

  })();


