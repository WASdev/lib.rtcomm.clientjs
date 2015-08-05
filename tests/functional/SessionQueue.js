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

var cfg= {server: 'svt-msd4.rtp.raleigh.ibm.com', port: 1883, topicPath: '/rtcommscott/' };

define([
    'intern', 
    'intern!object',
    'intern/chai!assert',
    'intern/node_modules/dojo/Deferred',
    (typeof window === 'undefined' && global) ?'intern/dojo/node!../support/mqttws31_shim': 'lib/mqttws31',
    'support/config',
    'umd/rtcomm/EndpointProvider'
], function (intern, registerSuite, assert, Deferred, globals,config, EndpointProvider) {

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
        name: 'FVT - EndpointProvider SessionQueue', 
        setup: function() {
          var dfd = new Deferred();
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
                    dfd.reject(error);
                  });
          ep.on('queueupdate', function(queues) {
            noQueuesConfigured = false;
            console.log('*******QUEUES!', queues);
            clearTimeout(timer);
            dfd.resolve();
          });

          var timer = setTimeout(function(){
            console.log('******* Resolving -- no Queues Configured');
            dfd.resolve();
          },5000);
          return dfd.promise;
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
          ep.destroy();
          ep = null;
        },

        'Init of EndpointProvider creates Queues' : function() {
          noQueuesConfigured && this.skip();
          console.log('queues: ', ep.listQueues());
          assert.ok(ep.listQueues().length > 0 , 'queues is defined');
        },

        'Join bad queue throws exception': function () {
          var error;
          try { 
            ep.joinQueue('/TestTopic/#');
          } catch(e) {
            error = e;
            console.log(e);
          }
          assert.isDefined(error, 'An error was thrown correctly');
        },
        'Send a start session to a queue': function () {
          noQueuesConfigured && this.skip();
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
