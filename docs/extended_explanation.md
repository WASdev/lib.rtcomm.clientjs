## Library Overview

The library exposes a single object called an 'EndpointProvider'.  The EndpointProvider utilizes MQTT over WebSockets to communicate with the rtcomm-1.0 feature on the Liberty Server.  The EndpointProvider object represents a single EndpointConnection(one instance of the MQTT Client) in the rtcomm infrastructure. The primary purpose of the EndpointProvider is to create Endpoints(RtcommEndpoint & MqttEndpoints).  Each RtcommEndpoint object provides the functionality to create Signaling Session between RtcommEndpoint Objects and enables that session to support chat and/or a RTCPeerConnection.  It also provides the necessary hooks to attach the UI components via events and media streams.  MqttEndpoints allow the user to attach a new subscriptions and add callbacks to receive messages.    

<p>
**NOTE:**  This library does not include any UI related components.  A simple html file demonstrating the use of the rtcomm.js library is included in the rtcomm.zip file.  It is discussed in the Sample section.

## Embedding in your Application

After installing (as referenced above with Bower) include the rtcomm library in your application.  This can be done classically via a global or as an AMD Module via RequireJS or dojo:
<p>
**Classically, imported to the 'rtcomm' namespace:**

```html
<script src="bower_components/bower-mqttws/mqttws31.js"></script>
<script src="bower_components/webrtc-adapter/adapter.js"></script>
<script src="bower_components/rtcomm/dist/rtcomm.js"></script>
```

**Via AMD(assuming proper AMD configuration):**

```javascript
    var endpointProvider = null; // We need to be global.
    require( ["rtcomm"],
    function(rtcomm) {
      endpointProvider = new rtcomm.EndpointProvider();
    });
```

## Using the EndpointProvider

The following shows how to configure and instantiate the EndpointProvider. You need to know the MQTT Server address and ensure you use a unique `rtcommTopicPath`:

```javascript
     var endpointProvider = new rtcomm.EndpointProvider(); 
     var endpointProviderConfig = {
            server : "messagesight.demos.ibm.com", // mqtt server 
            userid : 'ibmAgent1@mysurance.org', // userid
            rtcommTopicPath: '/rtcommMyCompany/', // RTCOMM connector Topic path
            port : 1883, // mqtt port
            createEndpoint : true,  // generate RtcommEndpoint instance, pass in onSuccess
            credentials : null // no security for this example (sso token, etc)
          };

     // Initialize the Service. [Using onSuccess/onFailure callbacks]
     // This initializes the MQTT layer and enables inbound Communication.
     var rtcommEndpoint = null;  
     endpointProvider.init(endpointProviderConfig, 
        /* onSuccess */ function(object) {
             // object is {'registered': <boolean>, 'ready': <boolean>, 'object': <endpoint if createEndpoint>}
             console.log('init was successful, rtcommEndpoint: ', object);
             rtcommEndpoint = object.endpoint;
        },
       /* onFailure */ function(error) {
             console.error('init failed: ', error);
       }
     );
```
The instantiation example above automatically registers with the 'rtcomm server' and creates a RtcommEndpoint which is assigned to the 'rtcommEndpoint' variable. However, the developer can choose to decouple this behavior and specifically init and getRtcommEndpoint.   The 'rtcommEndpoint' can now be used to create connections(calls) to other Endpoints.

Further information on the EndpointProvider API available in the `jsdoc` directory of the sample zip file or buy cloning and building the project with `grunt`

####Using the rtcommEndpoint object

The rtcommEndpoint object provides an interface for the UI Developer to attach Video and Audio input/output.  Essentially mapping a broadcast stream(a MediaStream that is intended to be sent) to a RTCPeerConnection output stream.   When an inbound stream is added to a RTCPeerConnection, then this also informs the RTCPeerConnection where to send that stream in the User Interface.  

Once the object has been created, in order to enable audio/video between Endpoints, mediaIn & mediaOut must be attached to DOM Nodes [The inbound `<video>` and outbound `<video>` elements for your application]. 
```javascript
    endpointObject.webrtc.setLocalMedia(
       { mediaOut: document.querySelector('#selfView'),
         mediaIn: document.querySelector('#remoteView'),
         broadcast: {audio: true, video: true}
       });
```
When the developer is ready to attach the local media, they need to 'enable' webrtc:

```javascript
    // Setup a real-time connection with specified user.
    rtcommEndpoint.webrtc.enable();
```
To create an outbound real-time connection with a specific user, the developer would attach the action of a UI component (like a Button) to the connect method of the rtcommEndpoint and call it when clicked:

```javascript
    // Setup a real-time connection with specified user.
    rtcommEndpoint.connect('userid');
```
To disconnect a real-time connection, the developer should call disconnect().

```javascript
    // Disconnect this endpoint from all other attached users.
    rtcommEndpoint.disconnect();
```
To handle events, the developer should attach callback functions to the events generated by the on() handler:
	 
```javascript
	 // Attach a handler to the 'webrtc:connected' event
	 endpointObject.on('webrtc:connected', function(event_object){
         console.log(event_object.message);
     });
```
The available events are:

<table>
<tr><th>event</th><th> description</th></tr>
<tr><td>session:started</td><td>A signaling session to a peer has been started </td></tr>
<tr><td>session:ringing </td><td>A peer has been reached, but not connected (outound)</td></tr>
<tr><td>session:alerting</td><td> An inbound connection is being requested. </td></tr>
<tr><td>session:failed</td><td> The creation of the session failed for a reason </td></tr>
<tr><td>session:rejected</td><td>The remote party rejected creation of the session</td></tr>
<tr><td>session:stopped</td><td>The session has stopped</td></tr>
<tr><td>session:refer </td><td>A third party call has been initiated (similar to incoming)</td></tr>
<tr><td>webrtc:connected </td><td>A connection to a peer has been established</td></tr>
<tr><td>webrtc:disconnected</td><td> The connection to a peer has been closed</td></tr>
<tr><td>webrtc:failed</td><td> The connection to a peer has failed for a reason</td></tr>
<tr><td>chat:message</td><td> A message has arrived from a peer </td></tr>
<tr><td>chat:connected </td><td>A chat connection has been established</td></tr>
<tr><td>chat:disconnected</td><td>A chat connection has been closed</td></tr>
</table>

Further information on the RtcommEndpoint API is located in the *jsdoc* which is available in the sample zip file or when you clone and build the project using `grunt`

####Advanced Features of the EndpointProvider & RtcommEndpoint Objects

The above scenario is the simplest way to connect two endpoints using the rtcomm-1.0 feature infrastructure.  However, these objects support several additional features:

1.  Each EndpointProvider is tied specifically to the MQTT Server and Service Topic and userid.  To use multiple MQTT Servers/ServiceTopics, multiple EndpointProviders can be configured and intialized.

2.  The EndpointProvider can create many RtcommEndpoints.  Each RtcommEndpoint can have a single WebRTCConnection.
