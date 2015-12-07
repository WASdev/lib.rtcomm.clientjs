#lib.rtcomm.clientjs

The rtcomm.js library is a JavaScript Universal Module Description(UMD) formatted module that provides an API for client side web application developers to enable WebRTC functionality. This module handles signaling and creation of WebRTC PeerConnections between endpoints in a simple and flexible way. The only requirement for peer-to-peer calling is an MQTT Broker that supports MQTT protocol version 3.1 or higher. A nice open source MQTT broker solution if your a fan of Node.js is [Mosca](https://github.com/mcollina/mosca). 

If you need additional capabilities like SIP federation, a backend programming model for services (e.g media server integration for record/playback), a registry, third party call control and call queues, the Liberty profile of the WebSphere Application Server comes with the 'rtcomm-1.0' feature which can be configured to connect with the same broker used for peer-to-peer calling. This page provides additional details on how to setup Liberty to work with your MQTT broker:[Using Liberty and rtcomm](docs/rtcomm_and_liberty_setup.md)

##Requirements

1.  An MQTT Server such as [IBM MessageSite](https://developer.ibm.com/messaging/messagesight/) or [Mosca](https://github/mcollina/mosca). For prototyping and development, it is possible to use `messagesight.demos.ibm.com`. 
2.  A web browsers that support WebRTC (tested w/ Chrome and Firefox)

##Dependencies

The rtcomm.js library is dependent on the following libraries (which will be installed via bower).  If you do not use bower, then you can get the files in the links below:

1.  Paho MQTT JavaScript client [link](http://git.eclipse.org/c/paho/org.eclipse.paho.mqtt.javascript.git/tree/src/mqttws31.js)  
2.  WebRTC Adapter [link] (https://github.com/webrtc/adapter)

** Regarding SSL & WebRTC [BEHAVIOR CHANGE]**

As of Chrome 47([WebRTC Release Notes](https://developers.google.com/web/updates/2015/10/chrome-47-webrtc)) `getUserMedia` will fail with a permissions error unless the site is served over SSL. This has the side effect of requiring a secure connection to the MQTT Server as well.  By default, when served over `https` the client will attempt to connect to the `sslport` if configured or the `port` if not.  Make sure your MQTT Server supports SSL.

##Installation

###Bower 

*`rtcomm`* is a registered bower module and can be installed using bower.  
```
bower install rtcomm
```
This will handle installing the `mqttws31` and `webrtc-adapter` dependencies as well as the rtcomm library.  Once installed, the scripts still need to be loaded in the application html file based on where bower installed the libraries.

### Inclusion in Browser

Add the following you your html file:

```html
<script src="bower_components/bower-mqttws/mqttws31.js"></script>
<script src="bower_components/webrtc-adapter/adapter.js"></script>
<script src="bower_components/rtcomm/dist/rtcomm.js"></script>
```

### Write some HTML

```html
      <button onclick="doRegister()">Register</button><input id="myid"></input>
      <br>
      <video height="200" id="selfView" autoplay="true" muted="true" ></video>
      <video height="200" id="remoteView" autoplay="true"></video>
      <br>
      <input id="callee"></input>
      <button onclick="connect()">Connect</button><button onclick="hangup()">Hangup</button>
```
### Add some JavaScript

Define the configuration to connect to an MQTT Server. 

```javascript
      <script>
      /* 
       * Define the configuration for the EndpointProvider.  THis is REQUIRED and generally must be changed.
       */
      var providerConfig = {
        server : 'messagesight.demos.ibm.com',
        port : 1883,
        rtcommTopicPath: "/rtcommVideoSample/",
        createEndpoint: true,
      };
```

Create an EndpointProvider and set the default RtcommEndpoint Config

```javascript
      // Define the EndpointProvider global variable
      var ibmep = new rtcomm.EndpointProvider();
      // Define the Endpoint global variable we will be using.
      // The endpoint is what handles the webrtc functionality (connect/disconnect/etc.)
      var rtcommEndpoint = null;
      // Configure the endpoint (associate the video Components)
      ibmep.setRtcommEndpointConfig({
          // This means we will handle the enable on 'connect' 
          autoEnable: true,     
          webrtcConfig: {       
            mediaOut: document.getElementById('selfView'),
            mediaIn: document.getElementById('remoteView')
          },
          // This is an event.  There are more you can attach callbacks to
        'session:alerting': function(event_object) {
          // Automatically answer
          rtcommEndpoint.accept();
        },
      });
```
Create a function to register/init the EndpointProvider (You need to establish 
```javascript
      var doRegister = function() {
        var id = document.getElementById("myid").value;
        console.log('Clicked? id is: '+id);
        providerConfig.userid=id;
        ibmep.init(providerConfig, function(obj) {
            console.log('Registered!');
            rtcommEndpoint = obj.endpoint;
        });
      };
```
Create a functions to connect to another person  and hangup 
```javascript
      var connect = function() {
        var id = document.getElementById("callee").value;
        providerConfig.userid=id;
        rtcommEndpoint.connect(id);
      }
      var hangup = function() {
        rtcommEndpoint.disconnect();
      }
      </script>
```

## More information
To get started with a sample, checkout the [Getting Started with the Sample](docs/sample.md).

For more detailed information on the API, see an [extended explanation](docs/extended_explanation.md).

Further information on the RtcommEndpoint API is located in the *jsdoc* which is available in the sample zip file or when you clone and build the project using `grunt`.

#Building the code

If you want to clone the repository and build this yourself, you will need to:

1.  Clone the repository:  
```
git clone https://github.com/WASdev/lib.rtcomm.clientjs.git
```
2.  Install node.js and npm (http://nodejs.org/download/)
3.  Install necessary dependencies via npm from the repository directory (assuming lib.rtcomm.clientjs)
```
lib.rtcomm.clientjs/ #  npm install
```
4.  Install the grunt-cli (globally if not installed)
``` 
npm install -g grunt-cli
```
5.  Build the library:
```
grunt
```
This will create a **dist** directory with the following contents:
 ```
   |-jsdoc
   |--rtcomm.js
   |--rtcomm.min.js
   |-umd
   |--rtcomm.js
   |--rtcomm
   |---connection.js
   |---util.js
```

6.  Download the Bower dependencies(necessary for tests)
```
bower install
```
# Running the tests

Reference the [README.md](tests/README.md) file in the tests/ directory.

