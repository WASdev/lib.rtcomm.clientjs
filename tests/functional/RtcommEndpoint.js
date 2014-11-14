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
    'ibm/rtcomm'
], function (registerSuite, assert, Deferred,globals, config, rtcomm) {



    

    // anything in here will get destroyed (but not recreated) in beforeEach;
    var g ={};
    var destroy = function() {
      Object.keys(g).forEach(function(key) {
        if (typeof g[key].destroy === 'function' ) {
          g[key].destroy();
          delete g[key];
        }
      });
    };

    var endpointProvider = null;
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

    registerSuite({
        name: 'FVT - RtcommEndpoint',
        setup: function() {
          console.log('*************setup!**************');
        },
        teardown: function() {
          destroy();
          endpointProvider.destroy();
          endpointProvider = null;
        },
        beforeEach: function() {
          destroy();
          if (endpointProvider) {
            endpointProvider.destroy();
            endpointProvider = null;
          }
          console.log("***************************** NEW TEST ***************************");
          endpointProvider = new rtcomm.EndpointProvider();
          endpointProvider.setAppContext('test');
          endpointProvider.setLogLevel('DEBUG');
        },
        "Endpoint creation(anonymous)": function() {
          console.log('***************** RunTest ************');
          var dfd = this.async(T1);
          var ep= endpointProvider.createRtcommEndpoint();
          console.log('TEST endpoint: ', ep);
          var initObj = null;
          var success = false;
          var finish = dfd.callback(function(object) {
             console.log('************ Finish called w/ OBJECT: ',object);
              // should be ready, should have a GUEST userid
              console.log('TEST -> userid: ' + ep.userid);
              assert.ok(/^GUEST/.test(ep.userid));
              console.log("TEST => ready: "+ ep);
              assert.ok(ep);
              console.log("TEST => : "+ object.ready);
              assert.ok(object.ready);
              ep = null;
          });
          endpointProvider.init(config1,finish, finish);
        },
      "Join/Leave queue": function() {
          console.log('***************** RunTest ************');
          var dfd = this.async();
          var ep = endpointProvider.createRtcommEndpoint();
          console.log('TEST endpoint: ', ep);
          var initObj = null;
          var success = false;
          var self = this;
          config1.userid = 'Agent';

          var finish = dfd.callback(function(object) {
            console.log('************ Finish called w/ OBJECT: ',object);
            var e = false;
            try{
              if (endpointProvider.listQueues().length > 0) {
                endpointProvider.joinQueue(endpointProvider.listQueues()[0]);
              }
            } catch(error) {
              e= true;
            }
            endpointProvider.leaveQueue(endpointProvider.listQueues()[0]);
            console.log('TEST -> userid: ' + ep.userid);
            assert.ok(/^Agent/.test(ep.userid));
            console.log("TEST => ready: "+ ep);
            assert.ok(ep);
            console.log("JoinQueue was successful: "+ ep);
            assert.notOk(e);
          });
          endpointProvider.init(config1,finish, finish);
        },
     "in Browser A calls B": function() {
         var endpointProvider2 = new rtcomm.EndpointProvider();
         endpointProvider2.setAppContext('test');
         // mark for destroy;
         g.endpointProvider2 = endpointProvider2;
         var ep1 = endpointProvider.createRtcommEndpoint({webrtc:false, chat:false});
         var ep2 = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:false});
         config1.userid='testuser1';
         config2.userid='testuser2';
         var dfd = this.async(T1);

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.ok(ep1.sessionStarted());
            assert.ok(ep2.sessionStarted());
            endpointProvider2.destroy();
         });

         ep1.on('session:started', finish);
         ep2.on('session:alerting', function(obj) {
           console.log('>>>>TEST  accepting call');
           ep2.accept();
         });
         endpointProvider.init(config1,
                  function(obj) {
                    endpointProvider2.init(config2,
                        function(obj) {
                          console.log('calling EP2');
                          ep1.connect(config2.userid);
                        },
                        function(error) {
                          console.log('error in ep2 init:' + error);
                        }
                       );
                  },
                  function(error) {
                    console.log('error in ep1 init:' + error);
                  }
                 );
         },
     "Customer A calls Queue[Toys], establish session": function() {
           var endpointProvider2 = new rtcomm.EndpointProvider();
           endpointProvider2.setAppContext('test');
           // mark for destroy;
           g.endpointProvider2 = endpointProvider2;
           var customer = endpointProvider.createRtcommEndpoint({webrtc:false, chat:false});
           var agent = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:false});

           var message1 = null;
           var message2 = null;
           var queueid = null;

           var dfd = this.async(T1);

           var finish = dfd.callback(function() {
               console.log("******************Asserting now...***********************");
               assert.ok(customer.sessionStarted());
               assert.ok(agent.sessionStarted());
               endpointProvider2.destroy();
            });

            // Here is what we are waiting for.
            customer.on('session:started', finish);

            agent.on('session:alerting', function(obj) {
             console.log('>>>>TEST  accepting call');
             agent.accept();
            });

            endpointProvider2.on('queueupdate',function(queues) {
              console.log('queueupdate!', queues);
              console.log('queueupdate!', Object.keys(queues));
              console.log('queueupdate!', Object.keys(queues)[0]);
              if (queues) {
                queueid = Object.keys(queues)[0];
                endpointProvider2.joinQueue(queueid);
                console.log('TEST>>>> Agent Available? '+agent.available());
                // Connect to the queue now.
              } 
            });

            config1.userid='Customer';
            config2.userid='Agent';
            endpointProvider.init(config1,
                  function(obj) {
                    endpointProvider2.init(config2,
                        function(obj) {
                          console.log('init was successful');
                          console.log('TEST>>>> Agent Available? '+agent.available());
                          customer.connect(queueid);
                        },
                        function(error) {
                          console.log('error in agent init:' + error);
                        }
                     );
                  },
                  function(error) {
                    console.log('error in customer init:' + error);
                  }
                 );
         },
     "Create many endpoints" : function() {
       this.skip();
         // mark for destroy;
         var config1 = config.clientConfig();
         var endpointProvider2 = g.endpointProvider2 = new rtcomm.EndpointProvider();
         var config2 = config.clientConfig();
         var endpointProvider3 = g.endpointProvider3 = new rtcomm.EndpointProvider();
         var config3 = config.clientConfig();
         var endpointProvider4 = g.endpointProvider4 = new rtcomm.EndpointProvider();
         var config4 = config.clientConfig();

         endpointProvider2.setAppContext('test');
         endpointProvider3.setAppContext('test');
         endpointProvider4.setAppContext('test');

         // All enpdointProvider1 should be INBOUND... 
          
         var ep2 = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:false});
         var ep3 = endpointProvider3.createRtcommEndpoint({webrtc:false, chat:false});
         var ep4 = endpointProvider3.createRtcommEndpoint({webrtc:false, chat:false});

         var onNewEndpoint = function(event) {
           // you don't know the provider here.

         };

         var initAllEps = function() {
           var dfd = new Deferred();
           endpointProvider.init(config1);
           endpointProvider2.init(config2);
           endpointProvider3.init(config3);
           endpointProvider4.init(config4);
           setTimeout(function(){
            dfd.resolve();
           },3000);

           return dfd.promise;
         };

         var dfd = this.async(T1);

         initAllEps.then(

         );
         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.ok(ep1.sessionStarted());
            assert.ok(ep2.sessionStarted());
            endpointProvider2.destroy();
         });

         ep1.on('session:started', finish);
         ep2.on('session:alerting', function(obj) {
           console.log('>>>>TEST  accepting call');
           ep2.accept();
         });
         endpointProvider.init(config1,
                  function(obj) {
                    endpointProvider2.init(config2,
                        function(obj) {
                          console.log('calling EP2');
                          ep1.connect(config2.userid);
                        },
                        function(error) {
                          console.log('error in ep2 init:' + error);
                        }
                       );
                  },
                  function(error) {
                    console.log('error in ep1 init:' + error);
                  }
                 );
         },
    });
});
