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
    'intern!object',
    'intern/chai!assert',
    'intern/dojo/Deferred',
    (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../support/mqttws31_shim':
        'lib/mqttws31',
    'support/config',
    'ibm/rtcomm'
], function (registerSuite, assert, Deferred, globals,config, rtcomm) {

    var ep = null;
    var rtcommEP = null;
    var mqtt = null;
    var cfg = config.clientConfig1();

    var START_SESSION = {
        'rtcommVer': 'v0.1.0',
        'method': 'START_SESSION',
        'fromTopic': null,
        'sigSessID':'1111-fake-test-1111',
        'transID':'2222-fake-test-2222',
        'toEndpointID': 'queueid',
        'peerContent': { type: 'offer' },
        'appContext': 'rtcommTest' 
    };
    function getPublishTopic(sharedTopic) {
      console.log('**********'+sharedTopic);
      var match = /\$SharedSubscription\/.+\/(\/.+)\/#/.exec(sharedTopic);
      return  match[1];
    }
    
    registerSuite({
        name: 'FVT - EndpointProvider SessionQueue', 
        setup: function() {
          var dfd = new Deferred();
          ep = new rtcomm.EndpointProvider();
          ep.setLogLevel('DEBUG');
          cfg.userid = 'intern';
          cfg.appContext = 'rtcommTest';
          ep.init(cfg, 
                  function() {
                    console.log('***** Setup Complete *****');
                    dfd.resolve();
                  },
                  function(error){
                    console.log('**** Setup Failed *****', error);
                    dfd.reject(error);
                  });
          return dfd.promise;
        },
        beforeEach: function() {
          console.log('reset the rtcommEP');
          rtcommEP && rtcommEP.destroy();
          rtcommEP = ep.createRtcommEndpoint({chat:false, webrtc: false});
          console.log('reset the mqtt');
          mqtt && mqtt.destroy();
          mqtt = ep.getMqttEndpoint();
        },
        teardown: function() {
          ep.destroy();
          ep = null;
        },
        'Init of rtcommEP creates Queues' : function() {
          console.log(ep.listQueues());
          assert.ok(ep.listQueues().length > 0 , 'queues is defined');
//          this.skip();
        },

        'Join bad queue throws exception': function () {
 //         this.skip();
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

          var dfd = this.async(5000);
          var error;
          var queue = ep.getAllQueues()[ep.listQueues()[0]];
          console.log('>>>>>>> queue', queue.endpointID);
          ep.joinQueue(queue.endpointID);
          var publishTopic = getPublishTopic(queue.topic);
          console.log('publishTopic: ', publishTopic);
          var finish = dfd.callback( function(obj) {
            //obj should be a WebRTCConnection
            // and Source should match our topic we know...
            console.log('FINISH Called!', obj);
            assert.equal(obj.appContext, 'rtcommTest', 'appContext is right');
            assert.equal(obj._sigSession.source, publishTopic+'/intern', 'source topic is right');
          });   

          rtcommEP.on('session:alerting', finish);
          // Create a Message
          START_SESSION.fromTopic = '/scott';
          var msg = rtcommEP.endpointConnection.createMessage('START_SESSION');
          msg.fromTopic = '/scott';
          msg.sigSessID = '1111-fake-test-1111';
          msg.transID = '2222-fake-test-2222';
          msg.toEndpointID = 'queueid';
          //msg.peerContent=  { type: 'offer' };
          msg.appContext='rtcommTest' ;
          mqtt.publish(publishTopic+'/intern', msg);
        },


    });
});
