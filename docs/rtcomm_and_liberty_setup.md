#lib.rtcomm.clientjs and Liberty

The rtcomm.js library is a JavaScript Universal Module Description(UMD) formatted module that provides an API for client side web application developers to enable WebRTC functionality.  This module handles signaling and creation of WebRTC PeerConnections between endpoints in a simple and flexible way. This library can utilize the 'rtcomm-1.0' feature in WebSphere Liberty Profile server for advanced funtionality.

##Requirements

1.  An MQTT Server such as [IBM MessageSite](https://developer.ibm.com/messaging/messagesight/) or [Mosca](https://github/mcollina/mosca). For prototyping and development, it is possible to use `messagesight.demos.ibm.com`. 
2.  A web browsers that support WebRTC (tested w/ Chrome and Firefox)
3.  A Liberty Profile server that runs with the `rtcomm-1.0` feature enabled. 
    1. Grab Liberty https://developer.ibm.com/wasdev/downloads/liberty-profile-using-non-eclipse-environments/
    2. Make sure you install rtcomm-1.0:
    ```
     bin/installUtility install rtcomm-1.0
    ```

##Dependencies

The rtcomm.js library is dependent on the following libraries (which will be installed via bower).  If you do not use bower, then you can get the files in the links below:

1.  Paho MQTT JavaScript client [link](http://git.eclipse.org/c/paho/org.eclipse.paho.mqtt.javascript.git/tree/src/mqttws31.js)  
2.  WebRTC Adapter [link] (https://github.com/webrtc/adapter)


##Installation

###Bower 

'rtcomm' is now a registered bower module and can be installed using bower.  
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

##Quickstart with the Sample 

This references the simple sample which shows how to create a basic Video client.  An Advanced client is also included `videoClient-adv.html` which shows how to use Chat and Presence.

###Using a WAR file sample videoClient and Bower

Given the directory structure:
```
   WebContent/
      /WEB-INF/
      /META-INF/
```

Download the latest 'lib.rtcomm.clientjs-sample-<release>.zip' from this [link](https://github.com/WASdev/lib.rtcomm.clientjs/releases/latest)  This library contains the sample and API documentation.

Unzip the file into your WebContent directory:

```
cd WebContent 
unzip <path to lib.rtcomm.clientjs-sample-<release>.zip> 
```

The WebContent directory should look like:

```
    WebContent/
      /WEB-INF/
      /META-INF/
      /jsdocs/
      /dist/
      /sample/
      bower.json 
      index.html
``` 

Install the dependencies with Bower (from the WebContent directory):

```
$ bower install
```

Edit the file 'WebContent/sample/videoClient.html'.  Find the creation of the `providerConfig` object:
```javascript
     var providerConfig = {
       server: 'messagesight.demos.ibm.com',
       port: 1883,
       appContext: "videosample",
       rtcommTopicPath: "/rtcommVideoSample/",
       createEndpoint: true 
     };
```
The above are the defaults and need to be changed to match the rtcomm-1.0 feature configuration in the server.xml for the liberty profile server you are using.  This is documented [here](http://www-01.ibm.com/support/knowledgecenter/was_beta_liberty/com.ibm.websphere.wlp.nd.multiplatform.doc/ae/twlp_config_rtcomm.html)

Once the above configuration has been changed, you should be able to DEPLOY your WAR file to the Liberty Server.  You can either place the WAR file in the **dropins** directory for your server or configure it in the server.xml and place it in the **apps** directory.

Access your server url and the 'index.html' page should be displayed with links to the sample Client you have configured and the documentation for the library.
