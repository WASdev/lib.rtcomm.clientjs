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
 var rtcomm= (function rtcomm() {

   var endpointProvider = null;

   /* Defaults */
   var epConfig = {
     server : window.document.location.hostname,
     port : window.document.location.port,
     managementTopicName : "management",
     appContext: "default",
     rtcommTopicPath: "/rtcomm/",
     presence: {topic: 'defaultRoom'},
     mediaIn: null,
     mediaOut: null
   };

   var rtcommCallback = function rtcommCallback(event_object) {
     // handle an EndpointEvent.
   };

   var init = function init(config) {

     // Merge Config w/ epConfig
     if (endpointProvider) {

     } else {
       endpointProvider = new rtcomm.EndpointProvider();
     }
     endpointProvider.init(
       epConfig,
       /* onSuccess for init() will pass an object:
         *  { endpoint: RtcommEndpoint ,   <-- RtcommEndpoint Object if created
         *     ready: boolean,             <-- We are ready to proceed.
         *     registered: boolean}        <-- Register completed.
         */
        function(object) { 
          l('DEBUG') && console.log('EndpointProvider initialized', object);
          //TODO: Emit an event here...
        }, function(error) { //onFailure
          console.error('init failed: ', error);
     });
    /*
     * Assign the callbacks
     * 
     *  This happens prior to the doRegister above and defines the default callbacks to use for 
     *  all RtcommEndpoints created by the EndpointProvider.
     */
    endpointProvider.setRtcommEndpointConfig({
        broadcast:  { audio: broadcast.audio, video: broadcast.video},
        // Played when call is going out
        ringbacktone: 'resources/ringbacktone.wav',
        // played when inbound call occurrs
        ringtone: 'resources/ringtone.wav',
        // Fired when webrtc is connected 
        'webrtc:connected': rtcommCallback,
        // Fired when webrtc is disconnected 
        'webrtc:disconnected': rtcommCallback,
        // An outbound call is starting and the target user has been reached.
        'session:ringing': rtcommCallback,
        // An inbound call was received.
        'session:alerting': rtcommCallback,
        // Establishing the session failed, display a message, cleanup.
        'session:failed': rtcommCallback,
        // An inbound Refer was received.  
        'session:refer': rtcommCallback
    });



   };

   var connect = function connect() {

   };
   var answer = function answer() {

   };
   var disconnect = function disconnect() {

   };


   return {
     init: init,
     connect: connect,
     answer: answer,
     disconnect: disconnect,
     EndpointProvider: EndpointProvider,
     connection: connection,
     util: util
   };

 })();


