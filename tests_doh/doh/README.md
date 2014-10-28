* Tests for the rtcomm clienjs project

As of 08/26/2014, these tests run using the Dojo Objective Harness.  They will be migrated to a different framework down the road.

** Configure the tests

Access the file 'tests/doh/common/testConfig.json':
```
{
   "mqttServers" : ["messagesight.demos.ibm.com:1883"],
   "rtcommTopicName" : "management",
   "topicPath" : "/rtcomm/"

}
```

Change the contents of this file to match the configuration of your liberty server.

** Running the tests

These tests can be run in two ways:

1.  Via a Browser:  With an http server pointing at the project directory, access the file /tests/doh/localRunTests.html via a Browser.  This will run the tests and display the results in the browser.

If you have node.js installed, you can quickly launch a local browser to test:
``` 
# from the project directory lib.rtcomm.clientjs

# Install prereqs (one time only)
npm install connect
npm install http
npm install serve-static

# Launch the server
node tests/doh/resources/server.js .
```
Now you should be able to access http://localhost:3000/tests/doh/localRunTests.html

2.  Via node.js -- If node.js is installed, then install the following packages:

``` 
npm install websocket
npm install node-localstorage
```

Then launch the tests:

``` 
# Change to your project directory
cd lib.rtcomm.clientjs 
# run the tests [ run them all]
tests/doh/bin/doh.sh
```

