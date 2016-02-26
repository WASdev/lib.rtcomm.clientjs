var RtcommEndpoint = (function invocation() {
  /**
   *  @memberof module:rtcomm.EndpointProvider
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
   *  @extends  module:rtcomm.SessionEndpoint
   */
  var RtcommEndpoint = function RtcommEndpoint(config) {
      /** 
       * @typedef {object} module:rtcomm.RtcommEndpoint~config
       *
       * @property {boolean} [autoEnable=false]  Automatically enable webrtc/chat upon connect if feature is supported (webrtc/chat = true);
       * @property {string}  [userid=null] UserID the endpoint will use (generally provided by the EndpointProvider
       * @property {string}  [appContext=null] UI Component to attach outbound media stream
       * @property {string} [ringtone=null] Path to a  ringtone to play when we are ringing on inbound callh
       * @property {string} [ringbacktone=null] path to a ringbacktone to play on outbound call
       * @property {boolean} [webrtc=true]  Whether the endpoint supports webrtc
       * @property {module:rtcomm.RtcommEndpoint.WebRTCConnection~webrtcConfig} webrtcConfig - Object to configure webrtc with (rather than on enable)
       * @property {boolean} [chat=true]  Whether the endpoint supports chat
       * @property {module:rtcomm.RtcommEndpoint.WebRTCConnection~chatConfig} chatConfig - object to pre-configure chat with (rather than on enable)
       * @property {module:rtcomm.EndpointProvider} [parent] - set the parent Should be done automatically.
       *
       */
      var defaultConfig = {
        // if a feature is supported, enable by default.
        autoEnable: true,
        ignoreAppContext: true,
        appContext: null,
        userid: null,
        ringtone: null,
        ringbacktone: null,
        chat: true,
        chatConfig: {},
        webrtc: true,
        webrtcConfig: {}
      };


      function addChatHandlers(ep) {
        var chat = ep.chat;
        // Configure chat event handling...
        //
        chat.on('ringing', function(event_obj) {
          (ep.lastEvent !== 'session:ringing') && ep.emit('session:ringing');
        });
        ep.createEvent('chat:message');
        chat.on('message', function(message) {
          // Should be '{message: blah, from: blah}'
          ep.emit('chat:message', message);
        });
        chat.on('alerting', function(message) {
          l('DEBUG') && console.log('RtcommEndpoint emitting session:alerting event');
          var obj = {};
          obj.message = message;
          obj.protocols = 'chat';
          // Have to do setState here because the ep state needs to change.
          ep.setState('session:alerting', obj);
        });
        ep.createEvent('chat:connected');
        chat.on('connected', function() {
          ep.emit('chat:connected');
        });
        ep.createEvent('chat:disconnected');
        chat.on('disconnected', function() {
          ep.emit('chat:disconnected');
        });
      };

      function addWebrtcHandlers(ep) {
        // Webrtc protocol...
        var webrtc = ep.webrtc;

        webrtc.on('ringing', function(event_obj) {
          l('DEBUG') && console.log("on ringing - play a ringback tone ", ep._.ringbackTone);
          ep._playRingback();
          (ep.lastEvent !== 'session:ringing') && ep.emit('s<LeftMouse>ession:ringing');
        });

        webrtc.on('trying', function(event_obj) {
          l('DEBUG') && console.log("on trying - play a ringback tone ", ep._.ringbackTone);
          ep._playRingback();
          (ep.lastEvent !== 'session:trying') && ep.emit('session:trying');
        });
        webrtc.on('alerting', function(event_obj) {
          ep._playRingtone();
          ep.emit('session:alerting', {
            protocols: 'ep.webrtc'
          });
        });

        ep.createEvent('webrtc:connected');
        webrtc.on('connected', function(event_obj) {
          l('DEBUG') && console.log("on connected - stop ringing ");
          ep._stopRing();
          ep.emit('webrtc:connected');
        });
        ep.createEvent('webrtc:disconnected');
        webrtc.on('disconnected', function(event_obj) {
          l('DEBUG') && console.log("on disconnected - stop ringing ");
          ep._stopRing();
          ep.emit('webrtc:disconnected');
        });
        ep.createEvent('webrtc:remotemuted');
        webrtc.on('remotemuted', function(event_obj) {
          ep.emit('webrtc:remotemuted', event_obj);
        });
      };

      function addGenericMessageHandlers(ep) {
        ep.createEvent('onetimemessage');
        ep.createEvent('generic_message:message');
        ep.generic_message.on('message', function(event_obj) {
          console.log('eventObject?', event_obj);
          // This shoudl be deprecated (onetimemessage) that is.
          var deprecatedEvent = {
            'onetimemessage': event_obj.message
          };
          ep.emit('onetimemessage', deprecatedEvent);
          ep.emit('generic_message:message', event_obj);
        });
      };

      // Call the Super Constructor
      SessionEndpoint.call(this, config);
      // Add the protocols
      this.addProtocol(new ChatProtocol());
      this.addProtocol(new WebRTCConnection(this));
      this.addProtocol(new GenericMessageProtocol());
      // Add the handlers to the protocols;
      addChatHandlers(this);
      addWebrtcHandlers(this);
      addGenericMessageHandlers(this);
      if (this.config.autoEnable) {
        this.config.chat && this.chat.enable();
        this.config.webrtc && this.webrtc.enable();
      };

      // generic-message and chat are enabled by default and always availble for now
      this.generic_message.enable();
      this.chat.enable();

      // WebRTC Specific configuration.
      // TODO:  MOve to the webrtc protocol
      this._.ringTone = (this.config.ringtone) ? util.Sound(this.config.ringtone).load() : null;
      this._.ringbackTone = (this.config.ringbacktone) ? util.Sound(this.config.ringbacktone).load() : null;
      this._.inboundMedia = null;
      this._.attachMedia = false;
      this._.localStream = null;
      this._.media = {
        In: null,
        Out: null
      };

    } // End of Constructor

  RtcommEndpoint.prototype = Object.create(SessionEndpoint.prototype);
  RtcommEndpoint.prototype.constructor = RtcommEndpoint;

  // RtcommEndpoint Specific additions to the SessioNEndpoint
  RtcommEndpoint.prototype._playRingtone = function() {
    this._.ringTone && this._.ringTone.play();
  };
  RtcommEndpoint.prototype._playRingback = function() {
    this._.ringbackTone && this._.ringbackTone.play();
  };

  RtcommEndpoint.prototype._stopRing = function() {
    l('DEBUG') && console.log(this + '._stopRing() should stop ring if ringing... ', this._.ringbackTone);
    l('DEBUG') && console.log(this + '._stopRing() should stop ring if ringing... ', this._.ringTone);
    this._.ringbackTone && this._.ringbackTone.playing && this._.ringbackTone.stop();
    this._.ringTone && this._.ringTone.playing && this._.ringTone.stop();
  };

  /* deprecated , use RtcommEndpoint.generic-message.send(message) instead */
  RtcommEndpoint.prototype.sendOneTimeMessage = function sendOneTimeMessage(message) {
    this.generic_message.send(message);
  };

  return RtcommEndpoint;
})();
