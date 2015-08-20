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
    'intern/node_modules/dojo/Deferred',
    (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../support/mqttws31_shim':
        'bower_components/bower-mqttws/mqttws31',
    'support/config',
    'bower_components/webrtc-adapter/adapter',
    'umd/rtcomm/EndpointProvider',
    'support/rtcommFatUtils'
], function (intern, registerSuite, assert, Deferred,globals, config, adapter, EndpointProvider,Fat) {

    var DEBUG = (intern.args.DEBUG === 'true')? true: false;
    console.log('GLOBALS?', globals);
    console.log('Paho?', Paho);

    var SKIP_ALL=false;
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

    var createAndInitTwoProviders = function createAndInitTwoProviders(cfg1, cfg2) {
      var dfd = new Deferred();
      Fat.createProvider(cfg1).then( function(EP) {
        Fat.createProvider(cfg2).then( function(EP2) {
          dfd.resolve({provider1: EP, provider2: EP2});
        });
       });
      return dfd.promise;
    };

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
          endpointProvider = new EndpointProvider();
          endpointProvider.setAppContext('test');
          DEBUG && endpointProvider.setLogLevel('DEBUG');
        },
        "Endpoint creation(anonymous)": function() {
          SKIP_ALL && this.skip();
          console.log('***************** RunTest ************');
          var dfd = this.async(T1);
          var ep = endpointProvider.createRtcommEndpoint({webrtc: false, chat:true});
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
              ep.destroy();
              ep = null;
          });
          endpointProvider.init(config1,finish, finish);
        },

        "Endpoint creation(iceServers)": function() {
          if (typeof global !== 'undefined' || typeof window === 'undefined') {
            console.log('********* SKIPPING TEST ***************');
            this.skip("This test only runs in the Browser");
          }
          console.log('***************** RunTest iceServers ************');
          var dfd = this.async(T1);

          var endpoint;

          var ICE = ['stun:rtcomm.fat.com:19302','stun:rtcomm1.fat.com:19302'];
          var finish = dfd.callback(function(object) {
            console.log('************ Finish called w/ OBJECT: ',object);
            // should be ready, should have a GUEST userid
            console.log("Ice Servers", endpoint.webrtc.config.iceServers);
            assert.equal(endpoint.webrtc.config.iceServers, ICE, 'Ice Servers are set');
          });
          Fat.createProvider(config.clientConfig(), 'test').then(
            function(ep){
              endpoint = ep.createRtcommEndpoint({webrtc:true, chat:true});
              // mark for destroy.
              g.endpoint = endpoint;
              g.ep = ep;
              console.log('Endpoint?', endpoint);
              endpoint.webrtc.enable({iceServers: ICE});
              finish();
            });
        },
     "in Browser A calls B": function() {
         SKIP_ALL && this.skip(false);

         var dfd = this.async(T1);
         // Our endpoints
         var ep1;
         var ep2;

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.ok(ep1_trying, 'Caller generated trying event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
            assert.ok(ep1.sessionStarted());
            assert.ok(ep2.sessionStarted());
         });

         // States we should hit:
         // ep1(caller) 
         //   place call --> trying
         var ep1_trying = false;
         var ep1_ringing= false;
         var ep2_alerting= false;
         //   receive PRANSWER --> ringing
         //   receive ANSWER --> started
         // ep2(callee)
         //   receive call --> alerting
         //   send ANSWER --> started
         var cfg1 = config.clientConfig('testuser1');
         var cfg2 = config.clientConfig('testuser2');
         createAndInitTwoProviders(cfg1,cfg2)
          .then(function(obj){
            var EP1 = g.EP1 = obj.provider1;
            var EP2 = g.EP2 = obj.provider2;
            ep1 = EP1.getRtcommEndpoint({webrtc:false, chat:true});
            ep2 = EP2.getRtcommEndpoint({webrtc:false, chat:true});
            ep1.on('session:ringing', function() { ep1_ringing = true})
            ep1.on('session:trying', function() { ep1_trying = true})
            ep1.on('session:started', finish);
            ep2.on('session:alerting', function(obj) {
              ep2_alerting = true;
              console.log('>>>>TEST  accepting call');
              setTimeout(function() {
               ep2.accept();
              },1000);
             });
            ep1.connect(cfg2.userid);
          });
         },
     "in Browser A calls B(disconnect while ringing)": function() {
         SKIP_ALL && this.skip(false);
         var dfd = this.async(T1);
         // Our endpoints
         var ep1;
         var ep2;

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.notOk(ep1_failed, 'Caller generated failed event');
            assert.notOk(ep2_failed, 'Callee generated failed event');
            assert.notOk(ep1_started, 'Caller generated started event');
            assert.notOk(ep2_started, 'Callee generated started event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
         });

         var ep1_trying = false;
         var ep1_ringing= false;
         var ep2_stopped= false;
         var ep1_stopped = false;
         var ep2_alerting= false;
         var ep1_failed= false;
         var ep2_failed= false;
         var ep1_started= false;
         var ep2_started= false;


         var cfg1 = config.clientConfig('testuser1');
         var cfg2 = config.clientConfig('testuser2');
         createAndInitTwoProviders(cfg1,cfg2)
          .then(function(obj){
            var EP1 = g.EP1 = obj.provider1;
            var EP2 = g.EP2 = obj.provider2;
            ep1 = EP1.getRtcommEndpoint({webrtc:false, chat:true});
            ep2 = EP2.getRtcommEndpoint({webrtc:false, chat:true});
             //   receive PRANSWER --> ringing //
                //   //   receive ANSWER --> started
             // ep2(callee)
             //   receive call --> alerting
             //   send ANSWER --> started
             //
             ep1.on('session:ringing', function() { 
               console.log('>>> ep1 session:ringing');
               ep1_ringing = true;});
             ep1.on('session:failed', function() { ep1_failed= true});
             ep2.on('session:failed', function() { ep2_failed= true});
             ep1.on('session:trying', function() { ep1_trying = true});
             ep1.on('session:started', function() { ep1_started = true});
             ep2.on('session:started', function() { ep2_started = true});
             ep1.on('session:stopped', function() {console.log('EP1 ***session:stopped'); ep1_stopped = true;});
             ep2.on('session:stopped', finish );
             ep2.on('session:alerting', function(obj) {
                 // At this state, cancel the call.
                 ep2_alerting = true;
                 setTimeout(function() {
                  console.log('********* Disconnecting call **************');
                  ep1.disconnect();
                 },1000);
               });
              ep1.connect(cfg2.userid);
          });
         },

     "in Browser A calls B (sendOneTimeMessage)": function() {
         SKIP_ALL && this.skip(false);
         var dfd = this.async(T1);
         // Our endpoints
         var ep1;
         var ep2;

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            assert.ok(ep1_trying, 'Caller generated trying event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
            assert.ok(ep1.sessionStarted(),'Ep1 Session Started');
            assert.ok(ep2.sessionStarted(),'Ep2 Session Started');
            assert.ok(object.onetimemessage,'Received a onetimemessage');
            var message = object.onetimemessage;
            console.log("OneTimeMessage content: "+JSON.stringify(message));
            assert.equal('http://someurl.com', message.url, 'onetimemessage property matches');
         });

         // States we should hit:
         // ep1(caller) 
         //   place call --> trying
         var ep1_trying = false;
         var ep1_ringing= false;
         var ep2_alerting= false;

         var cfg1 = config.clientConfig('testuser1');
         var cfg2 = config.clientConfig('testuser2');
         createAndInitTwoProviders(cfg1,cfg2)
          .then(function(obj){
            var EP1 = g.EP1 = obj.provider1;
            var EP2 = g.EP2 = obj.provider2;
            ep1 = EP1.getRtcommEndpoint({webrtc:false, chat:true});
            ep2 = EP2.getRtcommEndpoint({webrtc:false, chat:true});
         //   receive PRANSWER --> ringing
         //   receive ANSWER --> started
         // ep2(callee)
         //   receive call --> alerting
         //   send ANSWER --> started
         ep1.on('session:ringing', function() { ep1_ringing = true})
         ep1.on('session:trying', function() { ep1_trying = true})
         ep1.on('session:started', function(){
           // Send a message 
           ep1.sendOneTimeMessage({url:'http://someurl.com'});
         });
         ep2.on('session:alerting', function(obj) {
           ep2_alerting = true;
           console.log('>>>>TEST  accepting call');
           setTimeout(function() {
            ep2.accept();
           },1000);
         });

         ep2.on('onetimemessage', finish);
              ep1.connect(cfg2.userid);
          });
         },
     "in Browser A calls B(nested presence)": function() {
         SKIP_ALL && this.skip(false);
         var dfd = this.async(T1);
         // Our endpoints
         var ep1;
         var ep2;

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.ok(ep1_trying, 'Caller generated trying event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
            assert.ok(ep1.sessionStarted());
            assert.ok(ep2.sessionStarted());
         });

         // States we should hit:
         // ep1(caller) 
         //   place call --> trying
         var ep1_trying = false;
         var ep1_ringing= false;
         var ep2_alerting= false;

         var cfg1 = config.clientConfig('testuser1');
         var cfg2 = config.clientConfig('testuser2');
         cfg1.presence={'topic': 'defaultRoom'};
         cfg2.presence={'topic': 'defaultRoom'};

         createAndInitTwoProviders(cfg1,cfg2)
          .then(function(obj){
            var EP1 = g.EP1 = obj.provider1;
            var EP2 = g.EP2 = obj.provider2;
            ep1 = EP1.getRtcommEndpoint({webrtc:false, chat:true});
            ep2 = EP2.getRtcommEndpoint({webrtc:false, chat:true});
             //   receive PRANSWER --> ringing
             //   receive ANSWER --> started
             // ep2(callee)
             //   receive call --> alerting
             //   send ANSWER --> started
             ep1.on('session:ringing', function() { ep1_ringing = true;});
             ep1.on('session:trying', function() { ep1_trying = true;});
             ep1.on('session:started', finish);
             ep2.on('session:alerting', function(obj) {
               ep2_alerting = true;
               console.log('>>>>TEST  accepting call');
               setTimeout(function() {
                ep2.accept();
               },1000);

             });
              ep1.connect(cfg2.userid);
          });
         },
     "in Browser A calls B, neither accept call from C": function() {
         SKIP_ALL && this.skip(false);
         var dfd = this.async(T1);
         // Our endpoints
         var ep1;
         var ep2;
         var ep3

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            console.log('endpoint3: ',ep2);
            assert.ok(ep1_trying, 'Caller generated trying event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
            assert.ok(ep1_started);
            assert.ok(ep2.sessionStarted());
            assert.equal('Busy', object.reason);
         });

         // States we should hit:
         // ep1(caller) 
         //   place call --> trying
         var ep1_trying = false;
         var ep1_ringing= false;
         var ep1_started= false;
         var ep2_alerting= false;

         var cfg1 = config.clientConfig('testuser1');
         var cfg2 = config.clientConfig('testuser2');
         var cfg3 = config.clientConfig('testuser3');
         cfg1.presence={'topic': 'defaultRoom'};
         cfg2.presence={'topic': 'defaultRoom'};
         cfg3.presence={'topic': 'defaultRoom'};

         createAndInitTwoProviders(cfg1,cfg2)
          .then(function(obj){
            var EP1 = g.EP1 = obj.provider1;
            var EP2 = g.EP2 = obj.provider2;
            ep1 = EP1.getRtcommEndpoint({webrtc:false, chat:true});
            ep2 = EP2.getRtcommEndpoint({webrtc:false, chat:true});
            // Create the 3rd Endpoint Provider
            Fat.createProvider(cfg3)
              .then(function(EP3) {
                g.EP3 = EP3;
                ep3 = EP3.createRtcommEndpoint({webrtc:false, chat:true});
               //   receive PRANSWER --> ringing
               //   receive ANSWER --> started
               // ep2(callee)
               //   receive call --> alerting
               //   send ANSWER --> started
               ep1.on('session:ringing', function() { ep1_ringing = true;});
               ep1.on('session:trying', function() { ep1_trying = true;});
               ep1.on('session:started', function() {
                 // Connect 3rd enpdoint now... 
                 ep3.connect(cfg2.userid);
                 ep1_started = true;
               });
               ep2.on('session:alerting', function(obj) {
                 ep2_alerting = true;
                 console.log('>>>>TEST  accepting call');
                 setTimeout(function() {
                  ep2.accept();
                 },1000);

               });
               ep3.on('session:failed', finish);
               ep1.connect(cfg2.userid);
           });
        });
     },
     "Customer A calls Queue[Toys], establish session": function() {
          SKIP_ALL && this.skip(SKIP_ALL);
           var endpointProvider2 = new EndpointProvider();
           endpointProvider2.setAppContext('test');
           // mark for destroy;
           g.endpointProvider2 = endpointProvider2;
           var customer = endpointProvider.createRtcommEndpoint({webrtc:false, chat:true});
           var agent = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:true});

           var message1 = null;
           var message2 = null;
           var queueid = null;

           var dfd = this.async(T2);

           var finish = dfd.callback(function() {
               console.log("******************Asserting now...***********************");
               assert.ok(customer.sessionStarted());
               assert.ok(agent.sessionStarted());
               assert.ok(queued, 'customer is queued.');
               endpointProvider2.destroy();
            });

            // Here is what we are waiting for.
            customer.on('session:started', finish);
            var queued = false;
            customer.on('session:queued', function(obj){
              assert.ok(typeof obj.queuePosition !== 'undefined', 'queuePosition appended to event');
              queued = true;
            });

            agent.on('session:alerting', function(obj) {
             console.log('>>>>TEST  accepting call');
             setTimeout(function() {
              agent.accept();
             },1000);
            });

            endpointProvider2.on('queueupdate',function(queues) {
              console.log('queueupdate!', queues);
              console.log('queueupdate!', Object.keys(queues));
              console.log('queueupdate!', Object.keys(queues)[0]);
              if (queues) {
                queueid = Object.keys(queues)[0];
                endpointProvider2.joinQueue(queueid);
                console.log('TEST>>>> Agent Available? '+agent.available());
                console.log('TEST>>>> Connecting to QUEUEID:  '+queueid);
                customer.connect(queueid);
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
         }
    });
});
