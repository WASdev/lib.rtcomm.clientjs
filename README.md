rtcomm client library quickstart:
========

The rtcomm.js library is a JavaScript Universal Module Description(UMD) formatted module that provides an API for client side web application developers to enable WebRTC functionality.  This module handles signaling and creation of WebRTC PeerConnections between endpoints in a simple and flexible way.  This library is included in the install of a  WebSphere Liberty Profile server in the 'clients/rtcomm/rtcomm.zip' file.  

###1. Using a WAR file 

Given the directory structure:

   WebContent/
      /WEB-INF/
      /META-INF/

Extract rtcomm.zip into the WebContent directory.  It should end up looking like:

    WebContent/
      /WEB-INF/
      /META-INF/
      /js/
      /sample/
      /docs
      index.html
 
Edit the file 'WebContent/sample/videoClient.html' or 'WebContent/sample/videoClientBS.html'.  Find the creation of the npConfig object:

     var npConfig = {
       server: 'broker.mqttdashboard.com',
       port: 8000,
       userid : null,
       serviceTopic : "nodeConnector",
       topicPath: "/rtcomm/",
       register: false,
       createNode: false
     };
     
The above are the defaults and need to be changed to match the rtcomm-1.0 feature configuration in the server.xml for the liberty profile server you are using.  This is documented in the infocenter.

Once the above configuration has been changed, you should be able to DEPLOY your WAR file to the Liberty Server.  You can either place the WAR file in the dropins directory for your server or configure it in the server.xml and place it in the apps directory.

Access your server url and the 'index.html' page should be displayed with links to the sample Client you have configured and the documentation for the library.





