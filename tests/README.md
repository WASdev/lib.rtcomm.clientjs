* Tests for the rtcomm clienjs project

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

2.  Build the library
```
grunt lite
```

These tests can be run in several ways:

1.  Via a Browser:  With an http server pointing at the project directory, access the link http://localhost:<port>/node_modules/intern/client.html?config=tests/intern  via a Browser.  This will run the tests and display the results in the browser.

If you have node.js installed, you can quickly launch a local browser to test:

```
# Launch the server
grunt serve
```
Now you should be able to access http://localhost:9000/node_modules/intern/client.html?config=tests/intern

2.  Via ** grunt **: 

``` 
# Change to your project directory
cd lib.rtcomm.clientjs 
# run the tests [ run them all]
grunt test
```

* Additional Tests & options

    ** Run just the unit tests:
    ```
    grunt intern:unit
    ```
    ** Run just the functional tests:
    ``` 
    grunt intern:fat
    ```
    ** Run just the functional tests (with an rtcomm-1.0 server):
    ``` 
    grunt intern:fat_with_server
    ```
    ** Run the Stress Test:
    ```
    grunt intern:stress
    ```
    For the Stress test, you can also run it via the browser:

    http://localhost:9000/node_modules/intern/client.html?config=tests/intern&suites=tests/stress/stressTest
    
    At the end of the above, you can specify MAX_CONNS & duration as follows:

    http://localhost:9000/node_modules/intern/client.html?config=tests/intern&suites=tests/stress/stressTest&MAX_CONNS=50&duration=30000

    MAX_CONNS defaults to 50
    duration defaults to 20000 (20 Seconds)
    
    These can be configured by running intern as follows:

    ```
    $ node_modules/intern/bin/intern-client.js config=tests/intern suites=tests/stress/stressTest MAX_CONNS=1 duration=10000
    ```

* Turning on Debug
    You can turn on debug logging for rtcomm for all tests when run from the command line or from the browser:

    http://localhost:9000/node_modules/intern/client.html?config=tests/intern&DEBUG=true

    ```
    $ node_modules/intern/bin/intern-client.js config=tests/intern DEBUG=true 
    ```

    At the moment, I don't know how to do it via grunt


