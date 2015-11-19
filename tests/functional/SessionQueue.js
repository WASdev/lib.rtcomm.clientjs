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
    (typeof window === 'undefined' && global) ? 
      'intern/dojo/node!../support/mqttws31_shim': 
        'bower_components/bower-mqttws/mqttws31',
    'support/config',
    'bower_components/webrtc-adapter/adapter',
    'umd/rtcomm/EndpointProvider',
    'support/rtcommFatUtils'
], function (intern, registerSuite, assert, globals, config, adapter, EndpointProvider,Fat) {
   var suiteName = Fat.createSuiteName("FVT: EndpointProvider");

    var DEBUG = (intern.args.DEBUG === 'true')? true: false;
    // endpointProvider
    var ep = null;
    // Endpoint
    var rtcommEP = null;
    var mqtt = null;
    var cfg = config.clientConfig1();

    var noQueuesConfigured = true;
    var START_SESSION = {
        'rtcommVer': 'v1.0.0',
        'method': 'START_SESSION',
        'fromTopic': null,
        'protocols': ['chat'],
        'sigSessID':'1111-fake-test-1111',
        'transID':'2222-fake-test-2222',
        'toEndpointID': 'queueid',
        'payload': { type: 'offer' },
        'appContext': 'rtcommTest' 
    };
    function getPublishTopic(sharedTopic) {
      console.log('**********'+sharedTopic);
      return sharedTopic.replace(/^\$SharedSubscription.+\/\//,'\/')
        .replace(/\/#$/g,'\/');
    }
    registerSuite({
        name: suiteName,
        setup: function() {
          console.log('************* SETUP: '+this.name+' **************');
          var p = new Promise(
            function(resolve, reject) { 
              ep = new EndpointProvider();
              DEBUG && ep.setLogLevel('DEBUG');
              cfg.userid = 'intern';
              cfg.appContext = 'rtcommTest';
              ep.init(cfg, 
                      function() {
                        console.log('***** Setup Complete *****');
                      },
                      function(error){
                        console.log('**** Setup Failed *****', error);
                        reject(error);
                      });
              ep.on('queueupdate', function(queues) {
                noQueuesConfigured = false;
                console.log('*******QUEUES!', queues);
                clearTimeout(timer);
                resolve();
              });

              var timer = setTimeout(function(){
                console.log('******* Resolving -- no Queues Configured');
                resolve();
              },5000);
          });
          return p;
        },
        beforeEach: function() {
          // Destroy the endpoint.
          console.log('>>>>>>>>>>>> Reset the rtcommEP[New Test] <<<<<<<<<<<<<<<');
          rtcommEP && rtcommEP.destroy();
          rtcommEP = ep.createRtcommEndpoint({chat:true, webrtc: false});
          console.log('reset the mqtt');
          mqtt && mqtt.destroy();
          mqtt = ep.getMqttEndpoint();
        },
        teardown: function() {
          console.log('************* TEARDOWN: '+this.name+' **************');
          ep.destroy();
          ep = null;
        },

        'Init of EndpointProvider creates Queues' : function() {
          console.log('************* '+this.name+' **************');
          noQueuesConfigured && this.skip("There are no Queues configured on the server");
          console.log('queues: ', ep.listQueues());
          assert.ok(ep.listQueues().length > 0 , 'queues is defined');
        },

        'Join bad queue throws exception': function () {
          console.log('************* '+this.name+' **************');
          var error;
          try { 
            ep.joinQueue('/TestTopic/#');
          } catch(e) {
            error = e;
            console.log(e);
          }
          assert.isDefined(error, 'An error was thrown correctly');
        },
        "Join/Leave queue": function() {
          console.log('************* '+this.name+' **************');
          noQueuesConfigured && this.skip("There are no Queues configured on the server");
          var dfd = this.async();
          var endpoint = ep.createRtcommEndpoint({webrtc: false, chat:true});
          var initObj = null;
          var success = false;
          var self = this;
          var testConfig = config.clientConfig();
          testConfig.userid = 'Agent';
          var finish = dfd.callback(function(object) {
            console.log('************ Finish called w/ OBJECT: ',object);
            var e = false;
            try{
              if (ep.listQueues().length > 0) {
                ep.joinQueue(ep.listQueues()[0]);
              }
            } catch(error) {
              e= true;
            }
            ep.leaveQueue(ep.listQueues()[0]);
            console.log('TEST -> userid: ' + endpoint.userid);
            assert.ok(/^Agent/.test(endpoint.userid));
            console.log("TEST => ready: "+ endpoint);
            assert.ok(endpoint);
            console.log("JoinQueue was successful: "+ endpoint);
            assert.notOk(e);
          });
          ep.init(testConfig,finish, finish);
        },

        'Send a start session to a queue': function () {
          console.log('************* '+this.name+' **************');
          noQueuesConfigured && this.skip("There are no Queues configured on the server");
          var dfd = this.async(5000);
          var error;
          var queue = ep.getAllQueues()[ep.listQueues()[0]];
          console.log('>>>>>>> queue', queue.endpointID);
          ep.joinQueue(queue.endpointID);
          var publishTopic = getPublishTopic(queue.topic);
          console.log('publishTopic: ', publishTopic);
          var finish = dfd.callback( function(obj) {
            var endpoint = obj.endpoint;
            //obj should be a WebRTCConnection
            // and Source should match our topic we know...
            console.log('FINISH Called!', obj);
            assert.equal(endpoint._.activeSession.source, publishTopic+'/intern', 'source topic is right');
          });
          rtcommEP.on('session:alerting', finish);
          // Create a Message
          var msg = ep.dependencies.endpointConnection.createMessage('START_SESSION');
          msg.protocols = ['chat'];
          msg.fromTopic = '/scott';
          msg.sigSessID = '1111-fake-test-1111';
          msg.transID = '2222-fake-test-2222';
          msg.toEndpointID = 'queueid';
          msg.appContext='rtcommTest' ;
          mqtt.publish(publishTopic+'/intern', msg);
        },
    });
});
