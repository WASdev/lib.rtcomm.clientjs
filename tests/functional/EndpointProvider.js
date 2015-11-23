/**
 * Copyright 2013 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
define([
    'intern', 
    'intern!object',
    'intern/chai!assert',
    (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../support/mqttws31_shim':
        'bower_components/bower-mqttws/mqttws31',
    'support/config',
    'bower_components/webrtc-adapter/adapter',
    'umd/rtcomm/EndpointProvider',
    'support/rtcommFatUtils'
], function (intern, registerSuite, assert, globals, config, adapter, EndpointProvider,Fat) {
    var suiteName = Fat.createSuiteName("FVT: EndpointProvider");
    var DEBUG = (intern.args.DEBUG === 'true')? true: false;
    console.log('DEBUG is: ', DEBUG);

    /*
     * EndpointProvider FVT -- This runs the following tests:
     *
     */
    var config1 = config.clientConfig1();
    // Save and remove the userid from the config.
    var userid1 = config1.userid;
    delete config1.userid;
    // client2 Config
    var config2 = config.clientConfig2();
    // Save and remove the userid from the config.
    var userid2 = config2.userid;
    delete config2.userid;
    // Timings
    var T1 = 5000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 3000; // How long we wait to check results
    var T3 = T2 +3000;  // How long we wait to timeout test.

    var tearDown = {};

    var endpointProvider = null;

    registerSuite({
      name: suiteName,

      setup: function() {
          console.log('********** Setup '+ this.name +' **************');
      },
      teardown: function() {
          console.log('****************** TearDown '+this.name+' ***********************');
          if (endpointProvider) {
            endpointProvider.destroy();
            endpointProvider = null;
          }
          Object.keys(tearDown).forEach(function(key) {
            tearDown[key].destroy();
            delete tearDown[key];
          });

      },
      beforeEach: function() {
        if (endpointProvider) {
          endpointProvider.destroy();
          endpointProvider = null;
        }
        endpointProvider = new EndpointProvider();
        endpointProvider.setAppContext('test');
        DEBUG && endpointProvider.setLogLevel('DEBUG');
      },
      'constructorTest': function() {
            console.log("***************************** "+this.name+" ***************************");
            console.log('ep', endpointProvider);
            assert.ok(endpointProvider instanceof EndpointProvider);
            assert.notOk(endpointProvider.ready);
      },
      /**
       *  This test creates a EndpointProvider and calls init() on it.
       *
       */
     'init() no userid': function() {
           console.log("***************************** "+this.name+" ***************************");
           var dfd = this.async(T1);
           var initObj = null;
           var failure = false;
           DEBUG && endpointProvider.setLogLevel('DEBUG');
           var finish = dfd.callback(function(object) {
             console.log('************ Finish called w/ OBJECT: ',object);
             console.log("*** Asserting *** ", endpointProvider.ready);
             // should be ready, should have a GUEST userid
             console.log('TEST -> userid: ' + endpointProvider.config.userid);
             assert.ok(/^GUEST/.test(endpointProvider.config.userid));
             console.log('TEST -> ready '+ endpointProvider.ready);
             assert.ok(endpointProvider.ready);
           });
           endpointProvider.init(config1,finish, finish);
     },
      /**
       *  This test creates a EndpointProvider and calls init() on it.
       *
       */
     'init() no userid, change after init.': function() {
           console.log("***************************** "+this.name+" ***************************");
           var dfd = this.async(T1);
           var initObj = null;
           var failure = false;
           DEBUG && endpointProvider.setLogLevel('DEBUG');
           var finish = dfd.callback(function(object) {
             console.log('************ Finish called w/ OBJECT: ',object);
             console.log("*** Asserting *** ", endpointProvider.ready);
             // should be ready, should have a GUEST userid
             console.log('TEST -> userid: ' + endpointProvider.config.userid);
             assert.ok(/^GUEST/.test(endpointProvider.config.userid), 'ID is a GUEST id.');
             console.log('TEST -> ready '+ endpointProvider.ready);
             assert.ok(endpointProvider.ready, 'Provider is ready');
             try {
              endpointProvider.setUserID('TestUser');
             } catch (e) {
               console.log("ERROR!", e);
               failure = true;
             }
             console.log('TEST -> userid: ' + endpointProvider.getUserID());
             assert.equal('TestUser', endpointProvider.getUserID(), 'Correctly set on endpointProvider');
             console.log('TEST -> endpointConnection: ', endpointProvider.getEndpointConnection());
             assert.equal('TestUser', endpointProvider.getEndpointConnection().getUserID(), 'Propogated to EndpointConnection');
             assert.notOk(failure, 'setUserID on anonymous call worked.');
           });
           endpointProvider.init(config1,finish, finish);
     },

     "init() with  userid": function() {
           console.log("***************************** "+this.name+" ***************************");
           var dfd = this.async(T1);
           var initObj = null;
           var failure = false;
           config1.userid = 'testuser';
           var finish = dfd.callback(function(object) {
             console.log('************ Finish called w/ OBJECT: ',object);
             console.log("*** Asserting *** ", endpointProvider.ready);
             // should be ready, should have a GUEST userid
             console.log('TEST -> userid: ' + endpointProvider.config.userid);
             console.log('TEST -> userid: ' + endpointProvider._.id);
             assert.equal(endpointProvider.config.userid, 'testuser');
             console.log('TEST -> ready '+ endpointProvider.ready);
             assert.ok(endpointProvider.ready);
           });
           endpointProvider.init(config1,finish, finish);
     },

     /*
      * This test registers an endpoint provider, then re-init's it with 
      * a different ID.  The ID should be applied, presence should be cleared for original
      * and only have the new ID.
      */

     "init() again w/ new userid": function() {
           console.log("***************************** "+this.name+" ***************************");
           var dfd = this.async(10000);
           // Establish the first config.
           var c1 = config.clientConfig();
           c1.userid = 'testuser';
           c1.presence = {topic: 'interntest'};

           // Establish the second config.
           var c2 = config.clientConfig();
           // Save the rtcomMTopic path, it may be random -- shoudl be the same for this system
           c2.rtcommTopicPath = c1.rtcommTopicPath;
           c2.presence = {topic: 'interntest'};
           c2.userid = 'testuser2';

           var presenceMonitor = endpointProvider.getPresenceMonitor();
           var presenceData = presenceMonitor.getPresenceData();

           // Step One is run when the provider is initialized the first time
           var stepOne = function(object) {
             console.log('----- StepOne ------');
             // Monitor presence
             console.log('Subscriptions? ',presenceMonitor._.monitoredTopics);
             presenceMonitor.add('interntest');
             console.log('Subscriptions? ',presenceMonitor._.monitoredTopics);
             console.log('StepOne -> userid: ' + endpointProvider.config.userid);
             assert.equal(endpointProvider.config.userid, 'testuser');
             console.log('StepOne -> ready '+ endpointProvider.ready);
             assert.ok(endpointProvider.ready);
             // We need a timeout here in the case where we don't have a server (its too fast to get presence updates.)
             setTimeout(function() {
               console.log('----- StepOne Re-init ------');
               endpointProvider.init(c2, 
                   function() {
                     console.log('----- StepTwo Success ------');
                     setTimeout(finish, 3000);
                   }, function() {
                      console.log('----- StepTwo Failure------');
                      setTimeout(finish, 3000);
                   });
             },1000);
           };

           // Our finish call
           var finish = dfd.callback(function(object) {
             console.log('************ Finish called w/ OBJECT: ',object);
             console.log("*** Asserting *** ");
             console.log('TEST -> userid: ' + endpointProvider.config.userid);
             assert.equal(endpointProvider.config.userid, c2.userid, "UserID is set correctly on the EndpointProvider");
             console.log('TEST -> ready '+ endpointProvider.ready);
             assert.ok(endpointProvider.ready, "EndpointProvider is Ready");
             console.log('************ Checking Presence Data : ',presenceMonitor.getPresenceData());
             assert.strictEqual(presenceData, presenceMonitor.getPresenceData(), "Presence data object is the same");
             assert.equal(presenceMonitor.getPresenceData().length,1,' PresenceData has 1 top level entry');
             assert.equal(presenceMonitor.getPresenceData()[0].nodes.length,1,' PresenceData[interntest] has 1 entry');
             assert.equal(presenceMonitor.getPresenceData()[0].nodes[0].name,'interntest',' Primary topic created...');
             assert.equal(presenceMonitor.getPresenceData()[0].nodes[0].nodes[0].name,'testuser2',  'User topic created...');
           });
           // Start the test
           endpointProvider.init(c1,stepOne, stepOne);
     },
     "init() with  userid and createEndpoint": function() {
           console.log("***************************** "+this.name+" ***************************");
           var dfd = this.async(T1);
           config1.userid = 'testuser';
           config1.createEndpoint= true;

           var finish = dfd.callback(function(object) {
             console.log('************ Finish called w/ OBJECT: ',object);
              console.log('TEST -> userid: ' + endpointProvider.config.userid);
              assert.equal('testuser', endpointProvider.config.userid);
              console.log("TEST => ready: "+ endpointProvider.ready);
              assert.ok(endpointProvider.ready);
              console.log("TEST => registered: "+ object.registered);
              assert.ok(object.registered);
              console.log("TEST => endpoint: "+ object.endpoint.id);
              console.log("TEST => endpoint: ", object.endpoint);
              assert.ok(object.endpoint);
              console.log("TEST => endpointlist: "+ endpointProvider.endpoints());
              assert.ok(endpointProvider.endpoints().length === 1);
           });
           endpointProvider.init(config1,finish, finish);
     },

     "Presence": function() {
       console.log("***************************** "+this.name+" ***************************");
       var dfd = this.async(5000);
       var testConfig = config.clientConfig();
       testConfig.presence = {topic: 'test'};
       testConfig.userid = 'testuser';
       var presenceMonitor = endpointProvider.getPresenceMonitor();
       var finish = dfd.callback(function(object) {
          console.log('************ Finish called w/ OBJECT: ',object);
          console.log('************ Current Presence Data? : ',presenceMonitor.getPresenceData());
          assert.equal(presenceMonitor.getPresenceData(), object, 'PresenceData object was passed');
          assert.equal(1, presenceMonitor.getPresenceData().length,' PresenceData has 1 top level entry');
          assert.equal(1, presenceMonitor.getPresenceData()[0].nodes.length,' PresenceData[test] has 1 entry');
          assert.equal('test', presenceMonitor.getPresenceData()[0].nodes[0].name, 'Primary topic created...');
          assert.equal('testuser', presenceMonitor.getPresenceData()[0].nodes[0].nodes[0].name, 'User topic created...');
       });
       presenceMonitor.on('updated', finish);
       endpointProvider.init(testConfig, 
         function(obj){
           endpointProvider.publishPresence();
           presenceMonitor.add('test');
         },
         function(error){
         });

     },
     "[No Server] generate reset on DOCUMENT_REPLACED": function() {
       console.log("***************************** "+this.name+" ***************************");
       var dfd = this.async(5000);
       var testConfig = config.clientConfig();
       testConfig.presence = {topic: 'test'};
       testConfig.userid = 'testuser';



       var finish = dfd.callback(function(object) {
          console.log('************ Finish called w/ OBJECT: ',object);
          assert.equal('document_replaced', object.reason, 'Reset because of document_replaced');
       });
       // This is our FINISH
       endpointProvider.on('reset', finish);

       endpointProvider.init(testConfig, 
         function(obj){
          // Create another EP
          var mq = endpointProvider.getMqttEndpoint();
           var msg = endpointProvider.dependencies.endpointConnection.createMessage('DOCUMENT_REPLACED');
           msg.fromEndpoint = 'SERVER';
           var toTopic = endpointProvider.dependencies.endpointConnection.getMyTopic();
           mq.publish(toTopic+"/SERVER", msg);
         },
         function(error){

         });
     },
     /* this test requires an rtcommserver to send the DOCUMENT_REPLACED message */
     "Second presence generates reset event": function() {
       console.log("***************************** "+this.name+" ***************************");
       if (!Fat.requireServer()) {
          this.skip('Rtcomm Server required for test');
       }
       var dfd = this.async(5000);
       var testConfig = config.clientConfig();
       testConfig.presence = {topic: 'test'};
       testConfig.userid = 'testuser';

       // Create another EP
       var EP2 = new EndpointProvider();
       EP2.setAppContext('test');
       tearDown.EP2 = EP2;

       var finish = dfd.callback(function(object) {
          console.log('************ Finish called w/ OBJECT: ',object);
          assert.notOk(ep2_reset, 'reset on 2nd endpointProvider not called');
          assert.notOk(endpointProvider.ready, 'First EndpointProvider correctly cleaned up.');
       });
       // Should not turn true.
       var ep2_reset = false;

       var ep1_reset = false;

       EP2.on('reset', function(event) {
          ep2_reset = true;
       });
       // This is our FINISH
       endpointProvider.on('reset', function(event){
          console.log('************ Reset Called: called w/ event: ',event);
         // We have to have a timeout here because we are waiting for the endpointprovider to cleanup.
         assert.equal('document_replaced', event.reason, 'Reset because of document_replaced');
         ep1_reset = true;
         setTimeout(finish,2000);
       });

       endpointProvider.init(testConfig, 
         function(obj){
           // Once we have successfully init'ed our first ep, init the second, which should reset the first one.
           // wait a bit because we need presence to be done (in case where server is not present)
            EP2.init(testConfig);
         },
         function(error){

         });
     },
     /*
      * In this test, mqtt is configured correctly, we REQUIRE a server, but path is bad
      * init should fail
      */
     "Init failure when bad topic path": function() {
       console.log("***************************** "+this.name+" ***************************");
       // This requires the server to be set...
       if (!Fat.requireServer()) {
          this.skip('Rtcomm Server required for test');
       }
       var dfd = this.async(10000);
       var testConfig = config.clientConfig();
       testConfig.rtcommTopicPath= "/Junk-12345-bad/";
       testConfig.userid = 'testuser';
       console.log('TESTCONFIG: ', testConfig);

       // Create another EP
       var EP = new EndpointProvider();
       EP.setAppContext('test');
       tearDown.EP = EP;

       // Finish the test.
       var finish = dfd.callback(function(object) {
         console.log('Require a Server?', EP.requireServer());
         console.log(' ----> object', object);
         assert.match(object.message, /^Transaction/, "Transaction timed out as expected");
         assert.equal(object.name, "SERVICE_QUERY_FAILED", "Service Query failed as expected");
       });

       EP.init(testConfig,
               finish,
               finish);
     },
     /*
      * In this test, mqtt is configured correctly, we do not REQUIRE a server
      * Init should succeed.
      */
     "[requireRtcommServer=false] ": function() {
       console.log("***************************** "+this.name+" ***************************");
       var dfd = this.async(10000);
       var testConfig = config.clientConfig();
       testConfig.rtcommTopicPath= "/Junk-12345-bad/";
       testConfig.requireRtcommServer= false;
       testConfig.userid = 'testuser';

       // Create another EP
       var EP = new EndpointProvider();
       EP.setAppContext('test');
       tearDown.EP = EP;

       // Finish the test.
       var finish = dfd.callback(function(object) {
         console.log(' ----> object', object);
         // Should succeed.
         assert.isTrue(object.ready, "Init succeeded");
         assert.isTrue(object.registered, "Registered");

       });

       EP.init(testConfig,
               finish,
               finish);
     },
    });
});
