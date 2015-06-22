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
 * @class
 * @memberof module:rtcomm
 * @classdesc
 * Provides Services to register a user and create Endpoints (RtcommEndpoints & MqttEndpoints)
 * <p>
 * This programming interface lets a JavaScript client application use 
 * a {@link module:rtcomm.RtcommEndpoint|Real Time Communication Endpoint}
 * to implement WebRTC simply. When {@link module:rtcomm.EndpointProvider|instantiated} 
 * & {@link module:rtcomm.RtcommEndpointProvider#init|initialized} the
 * EndpointProvider connects to the defined MQTT Server and subscribes to a unique topic
 * that is used to receive inbound communication.
 * <p>
 * See the example in {@link module:rtcomm.EndpointProvider#init|EndpointProvider.init()}
 * <p>
 *
 * @requires {@link mqttws31.js}
 *
 */
/*global l:false*/
var rtcomm= (function rtcomm() {

   var endpointProvider = null;

   var events = {
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
        'newendpoint': [],
        'queueupdate': [],
        'ready': [],
        'reset': []
   };

   /* Defaults */
   var providerConfig = {
     server : window.document.location.hostname,
     port : window.document.location.port,
     managementTopicName : "management",
     appContext: "default",
     rtcommTopicPath: "/rtcomm/",
     presence: {topic: 'defaultRoom'}
   };


   var init = function init(config) {

     // Merge Config w/ epConfig
     var epConfig = util.combineObjects(config, providerConfig);

     var self = this;

     var endpointConfig = {
       mediaIn: epConfig.mediaIn,
       mediaOut: epConfig.mediaOut,
       ringback: epConfig.ringback,
       ringbacktone: epConfig.ringbacktone
     };

     delete epConfig.mediaIn;
     delete epConfig.mediaOut;
     delete epConfig.ringbacktone;
     delete epConfig.ringtone;

     console.log(epConfig);
     if (endpointProvider) {
       console.log('EndpointProvider is ',endpointProvider);
     } else {
       endpointProvider = new EndpointProvider();
     }

     endpointProvider.init(
       epConfig,
       /* onSuccess for init() will pass an object:
         *  { endpoint: RtcommEndpoint ,   <-- RtcommEndpoint Object if created
         *     ready: boolean,             <-- We are ready to proceed.
         *     registered: boolean}        <-- Register completed.
         */
        function(object) { 
          console.log('EndpointProvider initialized', object);
          self.emit('ready', object);
          //TODO: Emit an event here...
        }, function(error) { //onFailure
          console.error('init failed: ', error);
     });

   var rtcommCallback = function rtcommCallback(event_object) {
     // handle an EndpointEvent.
     console.log('Received the event ',event_object);
     self.emit(event_object.name, event_object);
   };
    /*
     * Assign the callbacks
     * 
     *  This happens prior to the doRegister above and defines the default callbacks to use for 
     *  all RtcommEndpoints created by the EndpointProvider.
     */
    endpointProvider.setRtcommEndpointConfig({
        broadcast:  { audio: true,video: true},
        // Played when call is going out
        ringbacktone: 'resources/ringbacktone.wav',
        // played when inbound call occurrs
        ringtone: 'resources/ringtone.wav',
        // Fired when any event is triggered
        bubble : rtcommCallback
    });
    endpointProvider.bubble(rtcommCallback);

    // Establish a presence monitor on the default topic we are published to
   // endpointProvider.getPresenceMonitor(presence.topic).on('updated', rtcommCallback);;
   };
   var connect = function connect(user) {
     // create an endpoint and connect it.
     return endpointProvider.getRtcommEndpoint().connect(user);
   };
   var answer = function answer() {
     return endpointProvider.getRtcommEndpoint().connect();
     // take an inbound enpdoint and answer?
   };

   var disconnect = function disconnect() {
     return endpointProvider.getRtcommEndpoint().disconnect();
     // disconnect/reject 
   };

   var Rtcomm = function Rtcomm() {
     this.events=events;
     this.init=init;
     this.connect=connect;
     this.answer=answer;
     this.disconnect= disconnect;
     this.EndpointProvider= EndpointProvider;
     this._MockRtcommServer = MockRtcommServer;
     this.connection= connection;
     this.util= util;
   };
   Rtcomm.prototype = util.RtcommBaseObject.extend({});
   return new Rtcomm();
 })();


