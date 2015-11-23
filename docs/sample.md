##Quickstart with the Sample 

This references the simple sample which shows how to create a basic Video client.  An Advanced client is also included `videoClient-adv.html` which shows how to use Chat and Presence.

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
6. Install the Bower dependencies
``` 
bower install
```
7. Install an MQTT Server (or use `messagesight.demos.ibm.com`)
We are using 'Mosca' here -- you can also download an IBM MessageSight virtual appliance.
```
npm install mosca banyan -g
```
8. Edit the file 'WebContent/sample/videoClient.html'.  Find the creation of the `providerConfig` object:

```javascript
     var providerConfig = {
       server: 'messagesight.demos.ibm.com',
       port: 1883,
       appContext: "videosample",
       rtcommTopicPath: "/rtcommVideoSample/",
       createEndpoint: true 
     };
```
Change this to match your MQTT Broker.  If you are using the `messagesight.demos.ibm.com` server, *make sure your rtcommTopicPath is unique!* 
If you are using Mosca on a local machine, the configuration will look like:

```javascript
     var providerConfig = {
       server: 'localhost',
       port: 8080,
       appContext: "videosample",
       rtcommTopicPath: "/rtcommVideoSample/",
       createEndpoint: true 
     };
```
9.  Start Mosca (if using it) (from project lib.rtcomm.clientjs root)

```
mosca -v --http-port 8080 --http-static ./ | bunyan
```

10.  Access your page:  http://localhost:8080/samples/videoClient.html


