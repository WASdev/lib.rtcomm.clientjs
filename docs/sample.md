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

##Sample videoClient
'lib.rtcomm.clientjs-<release>.zip' contains a 'sample/videoClient.html' file that demonstrates how to use the rtcomm.js library.   This sample can be placed on a web server with the lib/mqttws31.js, js/rtcomm.js from the lib.rtcomm.clientjs-<release>.zip. This sample is also dependent on jQuery that is accessed with the jQuery CDN (http://code.jquery.com/jquery-2.1.1.js). You can obtain jQuery 2.1.1 from the Downloading jQuery site if you prefer..

1.  Extract the Zip file into your Web Server Directoru

2.  Change the configuration to match that used in the server.xml for the rtcomm-1.0 feature as described [here](http://www-01.ibm.com/support/knowledgecenter/was_beta_liberty/com.ibm.websphere.wlp.nd.multiplatform.doc/ae/twlp_config_rtcomm.html):

```javascript
    var providerConfig = {
      server: 'messagesight.demos.ibm.com',
      port: 1883,
      rtcommTopicPath: "/rtcommVideoSample/",
      createEndpoint: true
    };
```

3.  Access the index.html file via your web browser.  This will provide links to the documentation and Sample Client.
