#lib.rtcomm.clientjs

The rtcomm.js library is a JavaScript Universal Module Description(UMD) formatted module that provides an API for client side web application developers to enable WebRTC functionality.  This module handles signaling and creation of WebRTC PeerConnections between endpoints in a simple and flexible way. This library is works with the 'rtcomm-1.0' feature in WebSphere Liberty Profile server.


##Requirements

1.  An MQTT Server such as IBM MessageSite. For prototyping and development, it is possible to use `broker.mqttdashboard.com`.
2.  Chrome or Firefox web browsers that support WebRTC.
3.  A Liberty Profile server that runs with the  `rtcomm-1.0` feature enabled. 

##Download

 Download the latest 'rtcomm.zip' from this [link](https://github.com/WASdev/lib.rtcomm.clientjs/releases/latest)  This file contains the library, sample and documentation.
 
##Quickstart

###Using a WAR file 

Given the directory structure:
```
   WebContent/
      /WEB-INF/
      /META-INF/
```
Extract the 'rtcomm-<release>.zip' file into a temporary directory:
```
cd /tmp
unzip <path to rtcomm-<release>.zip> 
ls
rtcomm-<release>/
```

Move the contents of the rtcomm-<release>/ directory into the WebContent directory.  It should end up looking like:

```
    WebContent/
      /WEB-INF/
      /META-INF/
      /js/
      /sample/
      /docs
      index.html
``` 
Edit the file 'WebContent/sample/videoClient.html'.  Find the creation of the epConfig object:
```
     var epConfig = {
       server: 'messagesight.demos.ibm.com',
       port: 1883,
       userid : null,
       managementTopicName: "management",
       rtcommTopicPath: "/rtcomm/",
       createEndpoint: false
     };
```
The above are the defaults and need to be changed to match the rtcomm-1.0 feature configuration in the server.xml for the liberty profile server you are using.  This is documented [here](http://www-01.ibm.com/support/knowledgecenter/was_beta_liberty/com.ibm.websphere.wlp.nd.multiplatform.doc/ae/twlp_config_rtcomm.html)

Once the above configuration has been changed, you should be able to DEPLOY your WAR file to the Liberty Server.  You can either place the WAR file in the **dropins** directory for your server or configure it in the server.xml and place it in the **apps** directory.

Access your server url and the 'index.html' page should be displayed with links to the sample Client you have configured and the documentation for the library.

## Library Overview

The library exposes a single object called an 'EndpointProvider'.  The EndpointProvider utilizes MQTT over WebSockets to communicate with the rtcomm-1.0 feature on the Liberty Server.  The EndpointProvider object represents a single EndpointConnection(one instance of the MQTT Client) in the rtcomm infrastructure. The primary purpose of the EndpointProvider is to create Endpoints(RtcommEndpoint & MqttEndpoints).  Each RtcommEndpoint object provides the functionality to create Signaling Session between RtcommEndpoint Objects and enables that session to support chat and/or a RTCPeerConnection.  It also provides the necessary hooks to attach the UI components via events and media streams.  MqttEndpoints allow the user to attach a new subscriptions and add callbacks to receive messages.    

<p>
**NOTE:**  This library does not include any UI related components.  A simple html file demonstrating the use of the rtcomm.js library is included in the rtcomm.zip file.  It is discussed in the Sample section.

##Install

After you have downloaded 'rtcomm-<release>.zip', Copy and unzip this file to the application development directory where JavaScript libraries are stored.  

1. Unzip rtcomm-<release>.zip file and copy two files into your application($APPDIR):
```
    unzip rtcomm-<release>.zip
    cp rtcomm-<release>/ibm/rtcomm.js $APPDIR
    cp rtcomm-<release>/lib/mqtt31ws.js $APPDIR 
```
2. Embed in your application:

Include the mqtt library in your application:

`<script src="lib/mqttws31.js"></script>`

Then, include the rtcomm library in your application.  This can be done classically via a global or as an AMD Module via RequireJS or dojo:
<p>
**Classically, imported to the 'ibm.rtcomm' namespace:**

`<script src="js/ibm/rtcomm.js"></script>`

**Via AMD(assuming proper AMD configuration):**

    var endpointProvider = null; // We need to be global.
    require( ["ibm/rtcomm"],
    function(rtcomm) {
      endpointProvider = new rtcomm.EndpointProvider();
    });

## Using the EndpointProvider

The following shows how to configure and instantiate the EndpointProvider. You need to know the MQTT Server address and ensure you use a unique 'connectorTopicName':

     var endpointProvider = new ibm.rtcomm.EndpointProvider(); 
     var endpointProviderConfig = {
            server : "messagesight.demos.ibm.com", // mqtt server 
            userid : 'ibmAgent1@mysurance.org', // userid
            managementTopicName : 'management', // RTCOMM Management Topic name
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

The instantiation example above automatically registers with the 'rtcomm server' and creates a RtcommEndpoint which is assigned to the 'rtcommEndpoint' variable. However, the developer can choose to decouple this behavior and specifically init and getRtcommEndpoint.   The 'rtcommEndpoint' can now be used to create connections(calls) to other Endpoints.

Further information on the RtcommEndpoint API is located [here](https://github.com/WASdev/lib.rtcomm.clientjs/wiki/module-rtcomm.EndpointProvider.API) 

####Using the rtcommEndpoint object

The rtcommEndpoint object provides an interface for the UI Developer to attach Video and Audio input/output.  Essentially mapping a broadcast stream(a MediaStream that is intended to be sent) to a RTCPeerConnection output stream.   When an inbound stream is added to a RTCPeerConnection, then this also informs the RTCPeerConnection where to send that stream in the User Interface.  

Once the object has been created, in order to enable audio/video between Endpoints, mediaIn & mediaOut must be attached to DOM Nodes [The inbound `<video>` and outbound `<video>` elements for your application]. 

    endpointObject.webrtc.setLocalMedia(
       { mediaOut: document.querySelector('#selfView'),
         mediaIn: document.querySelector('#remoteView'),
         broadcast: {audio: true, video: true}
       });

To create an outbound real-time connection with a specific user, the developer would attach the action of a UI component (like a Button) to the connect method of the rtcommEndpoint and call it when clicked:

    // Setup a real-time connection with specified user.
    rtcommEndpoint.connect('userid');

To disconnect a real-time connection, the developer should call disconnect().

    // Disconnect this endpoint from all other attached users.
    rtcommEndpoint.disconnect();

To handle events, the developer should attach callback functions to the events generated by the on() handler:
	 
	 // Attach a handler to the 'connected' event
	 endpointObject.on('connected', function(event_object){
         console.log(event_object.message);
     });

The available events are:

<table>
<tr><th>event</th><th> description</th></tr>
<tr><td> connected </td><td>A connection to a peer has been established</td></tr>
<tr><td>disconnected</td><td> The connection to a peer has been closed</td></tr>
<tr><td> refer </td><td>A third party call has been initiated (similar to incoming)</td></tr>
<tr><td>ringing </td><td>A peer has been reached, but not connected (inbound/outound)</td></tr>
<tr><td>trying</td><td> A connection is being attempted (outbound only) </td></tr>
<tr><td> incoming </td><td> An inbound connection is being requested. </td></tr>
<tr><td>message</td><td> A message has arrived from a peer </td></tr>
</table>

Further information on the RtcommEndpoint API is located [here](https://github.com/WASdev/lib.rtcomm.clientjs/wiki/module-rtcomm.RtcommEndpoint.API) 

####Advanced Features of the EndpointProvider & RtcommEndpoint Objects

The above scenario is the simplest way to connect two endpoints using the rtcomm-1.0 feature infrastructure.  However, these objects support several additional features:

1.  Each EndpointProvider is tied specifically to the MQTT Server and Service Topic and userid.  To use multiple MQTT Servers/ServiceTopics, multiple EndpointProviders can be configured and intialized.

2.  The EndpointProvider can create many RtcommEndpoints.  Each RtcommEndpoint can have a single WebRTCConnection.

##Sample videoClient
'rtcomm.zip' contains a 'sample/videoClient.html' file that demonstrates how to use the rtcomm.js library.   This sample can be placed on a web server with the js/lib/mqttws31.js, js/ibm/rtcomm.js from the rtcomm.zip. This sample is also dependent on jQuery that is accessed with the jQuery CDN (http://code.jquery.com/jquery-2.1.1.js). You can obtain jQuery 2.1.1 from the Downloading jQuery site.

1.  Extract the Zip file into your Web Server Directory

2.  Change the configuration to match that used in the server.xml for the rtcomm-1.0 feature as described [here](http://www-01.ibm.com/support/knowledgecenter/was_beta_liberty/com.ibm.websphere.wlp.nd.multiplatform.doc/ae/twlp_config_rtcomm.html):

```
    var epConfig = {
      server: 'messagesight.demos.ibm.com',
      port: 1883,
      userid : null,
      rtcommTopicName : "management",
      topicPath: "/rtcomm/",
      createEndpoint: true
    };
```

3.  Access the index.html file via your web browser.  This will provide links to the documentation and Sample Client.

#Building the code

If you want to clone the repository and build this yourself, you will need:

1.  ant v 1.8.4 (Not tested with any other, but may work)
2.  ant-contrib from:  http://sourceforge.net/projects/ant-contrib/files/ant-contrib/1.0b3/ant-contrib-1.0b3-bin.zip/download

Then in order to build just run:
```
 ant
 ```
 This will create a build directory with the following contents:
 ```
   README.md
   index.html
   |-docs
   |---jsDoc
   |-----scripts
   |-------prettify
   |-----styles
   |-js
   |---ibm
   |---lib
   |---umd
   |-----ibm
   |-------rtcomm
   |-lib
   |-sample
   |---resources
   |-----css
```

