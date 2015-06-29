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
    'umd/rtcomm/EndpointProvider'
], function (registerSuite, assert, Deferred,globals, config, EndpointProvider) {

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
          endpointProvider.setLogLevel('TRACE');
        },
        "Endpoint creation(anonymous)": function() {
          SKIP_ALL && this.skip(SKIP_ALL);
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
              ep = null;
          });
          endpointProvider.init(config1,finish, finish);
        },
      "Join/Leave queue": function() {
          SKIP_ALL && this.skip(SKIP_ALL);
          console.log('***************** RunTest ************');
          var dfd = this.async();
          var ep = endpointProvider.createRtcommEndpoint({webrtc: false, chat:true});
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
         SKIP_ALL && this.skip(false);
         var endpointProvider2 = new EndpointProvider();
         endpointProvider2.setAppContext('test');
         // mark for destroy;
         g.endpointProvider2 = endpointProvider2;
         var ep1 = endpointProvider.createRtcommEndpoint({webrtc:false, chat:true});
         var ep2 = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:true});
         config1.userid='testuser1';
         config2.userid='testuser2';
         var dfd = this.async(T1);

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.ok(ep1_trying, 'Caller generated trying event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
            assert.ok(ep1.sessionStarted());
            assert.ok(ep2.sessionStarted());
            endpointProvider2.destroy();
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
     "in Browser A calls B(disconnect while ringing)": function() {
         //SKIP_ALL && this.skip(false);
         var endpointProvider2 = new EndpointProvider();
         endpointProvider2.setAppContext('test');
         // mark for destroy;
         g.endpointProvider2 = endpointProvider2;
         var ep1 = endpointProvider.createRtcommEndpoint({webrtc:false, chat:true});
         var ep2 = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:true});
         config1.userid='testuser1';
         config2.userid='testuser2';
         var dfd = this.async(T1);

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
            endpointProvider2.destroy();
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

         //   receive PRANSWER --> ringing
         //   receive ANSWER --> started
         // ep2(callee)
         //   receive call --> alerting
         //   send ANSWER --> started
         ep1.on('session:ringing', function() { ep1_ringing = true})
         ep1.on('session:failed', function() { ep1_failed= true})
         ep2.on('session:failed', function() { ep2_failed= true})
         ep1.on('session:trying', function() { ep1_trying = true})
         ep1.on('session:started', function() { ep1_started = true});
         ep2.on('session:started', function() { ep2_started = true});
         ep1.on('session:stopped', function() { ep1_stopped = true;});
         ep2.on('session:stopped', finish );

         ep2.on('session:alerting', function(obj) {
           // At this state, cancel the call.
           ep2_alerting = true;
           setTimeout(function() {
            console.log('Disconnecting call');
            ep1.disconnect();
           },1000);
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
     "in Browser A calls B (sendOneTimeMessage)": function() {
          SKIP_ALL && this.skip(SKIP_ALL);
         var endpointProvider2 = new EndpointProvider();
         endpointProvider2.setAppContext('test');
         // mark for destroy;
         g.endpointProvider2 = endpointProvider2;
         var ep1 = endpointProvider.createRtcommEndpoint({webrtc:false, chat:true});
         var ep2 = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:true});
         config1.userid='testuser1';
         config2.userid='testuser2';
         var dfd = this.async(T2);
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
            endpointProvider2.destroy();
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
     "in Browser A calls B(nested presence)": function() {
          SKIP_ALL && this.skip(SKIP_ALL);
         var endpointProvider2 = new EndpointProvider();
         endpointProvider2.setAppContext('test');
         // mark for destroy;
         g.endpointProvider2 = endpointProvider2;
         var ep1 = endpointProvider.createRtcommEndpoint({webrtc:false, chat:true});
         var ep2 = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:true});
         var c1 = config.clientConfig();
         c1.userid='testuser1';
         c1.presence={'topic': 'defaultRoom'};

         var c2 = config.clientConfig();
         c2.userid='testuser2';
         c2.presence={'topic': 'defaultRoom'};

         var dfd = this.async(T1);

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.ok(ep1_trying, 'Caller generated trying event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
            assert.ok(ep1.sessionStarted());
            assert.ok(ep2.sessionStarted());
            endpointProvider2.destroy();
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
         endpointProvider.init(c1,
                  function(obj) {
                    endpointProvider2.init(c2,
                        function(obj) {
                          console.log('calling EP2');
                          ep1.connect(c2.userid);
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
     "in Browser A calls B, neither accept call from C": function() {
          SKIP_ALL && this.skip(SKIP_ALL);
         var endpointProvider2 = new EndpointProvider();
         endpointProvider2.setAppContext('test');
         var endpointProvider3 = new EndpointProvider();
         endpointProvider3.setAppContext('test');
         // mark for destroy;
         g.endpointProvider2 = endpointProvider2;
         g.endpointProvider3 = endpointProvider3;
         var ep1 = endpointProvider.createRtcommEndpoint({webrtc:false, chat:true});
         var ep2 = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:true});
         var ep3 = endpointProvider3.createRtcommEndpoint({webrtc:false, chat:true});
         config1.userid='testuser1';
         config2.userid='testuser2';
         var config3 = config.clientConfig();
         config3.userid='testuser3';

         var dfd = this.async(T1);

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
         var ep2_alerting= false;
         //   receive PRANSWER --> ringing
         //   receive ANSWER --> started
         // ep2(callee)
         //   receive call --> alerting
         //   send ANSWER --> started
         ep1.on('session:ringing', function() { ep1_ringing = true;});
         ep1.on('session:trying', function() { ep1_trying = true;});
         ep1.on('session:started', function() {
           // Connect 3rd enpdoint now... 
           ep3.connect(config2.userid);
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

         endpointProvider3.init(config3, function(obj) {
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
         function(error){
            console.log('error in ep3 init:' + error);
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
         },
     "Create many endpoints" : function() {
       // This test is in progress
         this.skip();
         // mark for destroy;
         var config1 = config.clientConfig();
         var endpointProvider2 = g.endpointProvider2 = new EndpointProvider();
         var config2 = config.clientConfig();
         var endpointProvider3 = g.endpointProvider3 = new EndpointProvider();
         var config3 = config.clientConfig();
         var endpointProvider4 = g.endpointProvider4 = new EndpointProvider();
         var config4 = config.clientConfig();

         endpointProvider2.setAppContext('test');
         endpointProvider3.setAppContext('test');
         endpointProvider4.setAppContext('test');

         // All enpdointProvider1 should be INBOUND... 
          
         var ep2 = endpointProvider2.createRtcommEndpoint({webrtc:false, chat:true});
         var ep3 = endpointProvider3.createRtcommEndpoint({webrtc:false, chat:true});
         var ep4 = endpointProvider3.createRtcommEndpoint({webrtc:false, chat:true});

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
