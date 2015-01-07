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
    'intern!object',
    'intern/chai!assert',
    'intern/node_modules/dojo/Deferred',
    (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../support/mqttws31_shim':
        'lib/mqttws31',
    'support/config',
    'umd/rtcomm'
], function (registerSuite, assert, Deferred,globals, config, rtcomm) {

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

    var endpointProvider = null;

    registerSuite({
      name: 'FVT - EndpointProvider',

      setup: function() {
          console.log('********** Setup **************');
      },
      teardown: function() {
          console.log("******************TearDown***********************");
          if (endpointProvider) {
            console.log('np current state', endpointProvider.currentState());
            endpointProvider.destroy();
            endpointProvider = null;
            console.log('Finished destroying 1');
          }
      },
      beforeEach: function() {
        console.log("***************************** NEW TEST ***************************");
        if (endpointProvider) {
          endpointProvider.destroy();
          endpointProvider = null;
        }
        endpointProvider = new rtcomm();
        endpointProvider.setAppContext('test');
        endpointProvider.setLogLevel('DEBUG');
      },
      'constructorTest': function() {
            console.log('rtcomm: ', rtcomm);
            console.log('ep', endpointProvider);
            assert.ok(endpointProvider instanceof rtcomm);
            assert.notOk(endpointProvider.ready);
      },
      /**
       *  This test creates a EndpointProvider and calls init() on it.
       *
       */
     'init() no userid': function() {
           console.log('********** Run Test ************');
           var dfd = this.async(T1);
           var initObj = null;
           var failure = false;
           endpointProvider.setLogLevel('DEBUG');
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
           console.log('********** Run Test ************');
           var dfd = this.async(T1);
           var initObj = null;
           var failure = false;
           endpointProvider.setLogLevel('DEBUG');
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
           console.log('********** Run Test ************');
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

     "init() again w/ new userid": function() {
           console.log('********** Run Test ************');
           var dfd = this.async(T1);
           var initObj = null;
           var failure = false;
           var readyToFinish = false;
           config1.userid = 'testuser';
           config1.presence = {topic: 'interntest'};
           var presenceMonitor = endpointProvider.getPresenceMonitor();
           // Establish the second config.
           var c2 = config.clientConfig();
           c2.presence = {topic: 'interntest'};
           c2.userid = 'testuser2';

           var stepOne = function(object) {
             presenceMonitor.add('interntest');
             console.log('TEST -> userid: ' + endpointProvider.config.userid);
             console.log('TEST -> id: ' + endpointProvider._.id);
             assert.equal(endpointProvider.config.userid, 'testuser');
             console.log('TEST -> ready '+ endpointProvider.ready);
             assert.ok(endpointProvider.ready);
             endpointProvider.init(c2,stepTwo, stepTwo);
           };

           /*var finish = dfd.callback(function(object) {
              console.log('************ Finish called w/ OBJECT: ',object);
              console.log('************ Current Presence Data? : ',presenceMonitor.getPresenceData());
              assert.equal(presenceMonitor.getPresenceData(), object, 'PresenceData object was passed');
              assert.equal(1, presenceMonitor.getPresenceData().length,' PresenceData has 1 top level entry');
              assert.equal(1, presenceMonitor.getPresenceData()[0].nodes.length,' PresenceData[test] has 1 entry');
              assert.equal('test', presenceMonitor.getPresenceData()[0].name, 'Primary topic created...');
              assert.equal('testuser', presenceMonitor.getPresenceData()[0].nodes[0].name, 'User topic created...');
           });*/
           var stepTwo = function(object) {
             console.log('************ Finish called w/ OBJECT: ',object);
             console.log("*** Asserting *** ", endpointProvider.ready);
             // should be ready, should have a GUEST userid
             console.log('TEST -> userid: ' + endpointProvider.config.userid);
             console.log('TEST -> userid: ' + endpointProvider._.id);
             assert.equal(endpointProvider.config.userid, c2.userid);
             assert.ok(endpointProvider.ready);
             readyToFinish = true;
           };

           var finish = dfd.callback(function(object) {
             console.log('************ Finish called w/ OBJECT: ',object);
             console.log("*** Asserting *** ", endpointProvider.ready);
             // should be ready, should have a GUEST userid
             console.log('TEST -> userid: ' + endpointProvider.config.userid);
             console.log('TEST -> userid: ' + endpointProvider._.id);
             assert.equal(endpointProvider.config.userid, c2.userid);
             console.log('TEST -> ready '+ endpointProvider.ready);
             assert.ok(endpointProvider.ready);
             console.log('************ Current Presence Data? : ',presenceMonitor.getPresenceData());
             assert.equal(presenceMonitor.getPresenceData().length,1,' PresenceData has 1 top level entry');
             assert.equal(presenceMonitor.getPresenceData()[0].nodes.length,1,' PresenceData[test] has 1 entry');
             assert.equal(presenceMonitor.getPresenceData()[0].name,'interntest',' Primary topic created...');
             assert.equal(presenceMonitor.getPresenceData()[0].nodes[0].name,'testuser2',  'User topic created...');
           });

           endpointProvider.init(config1,stepOne, stepOne);

           presenceMonitor.on('updated', function(object){
             if (readyToFinish) {
               finish(object);
             }
           });
     },
     "init() with  userid and createEndpoint": function() {
           console.log('********** Run Test ************');
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
     "Got Queues from server": function() {
       this.skip();
           console.log('********** Run Test ************');
           var deferred = new doh.Deferred();
           var initObj = null;
           var failure = false;
           config1.userid = 'testuser';
           endpointProvider.on('queueupdate', dfd.callback(function(queues){
              console.log('TEST -> Queues: ' + endpointProvider.listQueues());
              assert.ok(endpointProvider.listQueues().length > 0);
           }));
           endpointProvider.init(config1,
                function(obj) {
                  initObj = obj;
                },
                function(error) {
                  failure = true;
                }
               );
     },

     "Presence": function() {
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
          assert.equal('test', presenceMonitor.getPresenceData()[0].name, 'Primary topic created...');
          assert.equal('testuser', presenceMonitor.getPresenceData()[0].nodes[0].name, 'User topic created...');
       });
       presenceMonitor.on('updated', finish);
       endpointProvider.init(testConfig, 
         function(obj){
           endpointProvider.publishPresence();
           presenceMonitor.add('test');
         },
         function(error){
         });

     }

    });
});
