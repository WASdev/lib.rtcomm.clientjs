* Tests for the rtcomm clienjs project

As of 12/18/2014, these tests run using 'theintern.io'.

** Configure the tests

Access the file 'tests/support/testConfig.json':
```
{
   "mqttServers" : ["messagesight.demos.ibm.com:1883"],
   "managementTopicName" : "management",
   "rtcommTopicPath" : "/rtcomm/"
}
```

Change the contents of this file to match the configuration of your liberty server.

** Running the tests

1.  Setup the Prereqs:

``` 
# from the project directory lib.rtcomm.clientjs
# Install prereqs (one time only) via the package.json devDependencies
npm install -g grunt-cli
npm install 
```

These tests can be run in two ways:

1.  Via a Browser:  With an http server pointing at the project directory, access the link http://localhost:<port>/node_modules/intern/client.html?config=tests/intern  via a Browser.  This will run the tests and display the results in the browser.

If you have node.js installed, you can quickly launch a local browser to test:

```
# Launch the server
node tests/support/server.js .
```
Now you should be able to access http://localhost:3000/node_modules/intern/client.html?config=tests/intern

2.  Via ** grunt **: 

``` 
# Change to your project directory
cd lib.rtcomm.clientjs 
# run the tests [ run them all]
grunt test
```

