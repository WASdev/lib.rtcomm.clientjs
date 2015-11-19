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
/*
    var createProviderOld = function createProvider(userid,appContext) {
      var dfd = new Deferred();
      var EP = new EndpointProvider();
      DEBUG && EP.setLogLevel('DEBUG');
      EP.setUserID(userid);
      EP.setAppContext(appContext);
      EP.init(cfg,
        function(message) { 
          console.log('************init was successful*****************', message);
          dfd.resolve(EP);
        },
        function(message) { console.error('init failed', message); dfd.reject(message);}
      );
      return dfd.promise;
    };
*/
    var createAutoConnectEP = function createAutoConnectEP(provider) {
      var ep = provider.createRtcommEndpoint();
    //  ep.on('session:started', function() {});
     // ep.on('session:trying', function() {});
      //ep.on('session:ringing', function() {});
      ep.on('session:alerting', function() {
        ep.accept();
      });
      //ep.on('session:failed', function() {});
      //ep.on('chat:connected', function() {});
      //ep.on('chat:disconnected', function() {});
      //ep.on('chat:message', function() {});
    };

    var EP1 = null;
    var EP2 = null;
    var EP3 = null;

    var uid1 = 'client1';
    var uid2 = 'client2';
    var cfg1 = config.clientConfig(uid1);
    var cfg2 = config.clientConfig(uid2);
    var appContext = 'internChatTest';
    var chat1, chat2, chat3;
    registerSuite({
        name: suiteName,
        setup: function() {
          console.log('************* SETUP: '+this.name+' **************');

          var p = new Promise(
            function(resolve, reject) {
              Fat.createProvider(cfg1, appContext).then(
                function(EP){
                  EP1 = EP;
                  Fat.createProvider(cfg2, appContext).then(
                    function(EP){
                      EP2 = EP;
                      resolve();
                    }
                  );
                });
            });
          return p;
        },
        teardown: function() {
          console.log('************* TEARDOWN: '+this.name+' **************');
          chat1 && chat1.destroy();
          chat2 && chat2.destroy();
          chat3 && chat3.destroy();
          EP1 && EP1.destroy();
          EP2 && EP2.destroy();
          EP3 && EP3.destroy();
          EP1 = null;
          EP2 = null;
          EP3 = null;
          chat1 = null;
          chat2 = null;
          chat3 = null;
        },
        beforeEach: function() {
          var p = new Promise(
            function(resolve, reject) {
              chat1 && chat1.destroy();
              chat2 && chat2.destroy();
              chat1 = EP1.createRtcommEndpoint();
              chat2 = EP2.createRtcommEndpoint();
              setTimeout(function(){
                console.log('BeforeEach -- waiting 1 second for cleanup/restart to complete');
                resolve();
              },1000);
            });
          return p;
        },
        'verify setup': function() {
          console.log('***************** '+this.name+' ******************');
          assert.equal(EP1.getUserID(), cfg1.userid, "UserID matches");
          assert.equal(EP2.getUserID(), cfg2.userid, "UserID matches");
          assert.equal(EP1.endpoints().length, 1);
          assert.equal(EP2.endpoints().length ,1);
        },
        'connect 2 sessions[No Liberty]':function() {
          console.log('***************** '+this.name+' ******************');
          var dfd = this.async(10000);
          chat1.on('chat:message', function(message){
            console.log('****************************MESSAGE ***', message)
          });
          chat2.on('session:alerting', function(){
            chat2.accept();
          });
          var finish = dfd.callback( function(obj) {
            //obj should be a WebRTCConnection
            // and Source should match our topic we know...
            console.log('FINISH Called!', obj);
            assert.ok(chat1.sessionStarted(), 'chat1 --Session Started!');
            assert.ok(chat2.sessionStarted(), 'chat2 --Session Started!');
            assert.equal(chat1.chat.getState(),'connected','Chat1--Chat Connected!');
            assert.equal(chat2.chat.getState(),'connected','Chat2--Chat Connected!');

            console.log('chat1.webrtc.getState():'+chat1.webrtc.getState());
            console.log('chat2.webrtc.getState():'+chat2.webrtc.getState());
            //assert.equal(chat1.chat.getState(),'connected','Chat1--Chat Connected!');
            //assert.equal(chat2.chat.getState(),'connected','Chat2--Chat Connected!');
          });   
          chat1.on('session:started',finish);
          console.log('USING UID: ', uid2);
          chat1.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
        //  chat1.connect(uid2);
        },
        'Issue 33:  Busy connect 2 sessions[No Liberty]':function() {
          console.log('***************** '+this.name+' ******************');
          //this.skip()
          /* chat1 calls chat2 which accepts.  
           * chat3 calls chat2 -- should get 'BUSY'
           */
          var dfd = this.async(10000);
          // We have a 3rd endpoint here...
          chat1.on('chat:message', function(message){
            console.log('****************************MESSAGE ***', message)
          });
          chat2.on('session:alerting', function(){
            chat2.accept();
          });

          /** FINISH **/
          var finish = dfd.callback( function(obj) {
            //obj should be a WebRTCConnection
            // and Source should match our topic we know...
            console.log('FINISH Called!', obj);
            assert.equal('Busy', obj.reason, 'Session Failed correctly!');
            assert.isNull(chat3._.activeSession, 'No ActiveSession (GOOD)!');
          });   
          
          chat1.on('session:started',function() {
            // Now create a 3rd endpoint
            Fat.createProvider(config.clientConfig('client3'),appContext).then(
              function(EP){
                EP3 = EP;
                chat3 = EP.createRtcommEndpoint();
                chat3.on('session:failed',finish);
                chat3.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
                //chat3.connect(uid2);
            });
          });
          chat1.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
          //chat1.connect(uid2);
        },
        'Initial Chat message on connect (if enabled) [No Liberty]': function() {
          console.log('***************** '+this.name+' ******************');
          console.log('chat1: ', chat1);
          console.log('chat2: ', chat2);
          /*
           * Enable chat prior to connect.  We should get a message
           * then connect.
           */
          var dfd = this.async(8000);
          var bad_alert = false;
          var c1_started = false;
          var c2_started = false;
          var c1_rcv_message = null;
          var c2_rcv_message = null;
          var alert_message = false;

          var c1Toc2Msg = "Hello from c1";
          var c2Toc1Msg = "Hello from c2";

          chat1.chat.enable();

          var finish = dfd.callback(function(event){
            /*
             * This is where we assert the test passed
             */
            console.log(' TEST >>>>>> Session Started Event --> '+event.endpoint.getLocalEndpointID());
            assert.notOk(bad_alert, 'Chat1 alert should not be called');
            assert.ok(c1_started, 'Chat1 should be started');
            assert.ok(c2_started, 'Chat2 should be started');
            assert.equal(c2_rcv_message,c1Toc2Msg,  'Chat2 received message from chat1');
            assert.equal(c1_rcv_message,c2Toc1Msg,  'Chat1 received message from chat2');
            assert.equal(alert_message,'client1 has initiated a Chat with you', "Received chat from startup");
            console.log('TEST >>>>> Finished asserting');
          });

          chat1.on('session:alerting', function(event) {
            // Should not get here.
            bad_alert = true;
          });
          chat1.on('session:started', dfd.callback(function(event){
            c1_started = true;
            console.log(' TEST >>>>>> Chat 1Session Started Event --> Sending messages');
            chat1.chat.send(c1Toc2Msg);
            chat2.chat.send(c2Toc1Msg);
          }));
          chat1.on('chat:message', function(event){
            console.log('Received a Chat message...', event);
            c1_rcv_message = event.message;;
            // message is event_object.message.message
          });
          chat2.on('session:started', function(event){
            c2_started = true;
            console.log(' TEST >>>>>> Session Started Event --> '+event.endpoint.getLocalEndpointID());
            // Send messages here?
          });
          chat2.on('session:alerting', function(event) {
           // assert.equal(event.protocols, 'chat', 'Correct protocol');
            console.log('Received a Chat message...', event);
            chat2.accept();
            alert_message = event.message;
          });
          chat2.on('chat:message', function(event){
            console.log('Received a Chat message...', event);
            c2_rcv_message = event.message;
            // message is event_object.message.message
          });
          chat2.on('session:stopped', finish)
          chat1.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
          //chat1.connect(uid2);
        },

        'connect 2 chat clients via 3PCC':function() {
          console.log('***************** '+this.name+' ******************');
          if (typeof REQUIRE_RTCOMM_SERVER !== 'undefined' && !REQUIRE_RTCOMM_SERVER) {
            this.skip('Rtcomm Server required for test');
          }
          var ccTopic = null;
          if (EP1.getServices().RTCOMM_CALL_CONTROL_SERVICE) {
            ccTopic = EP1.getServices().RTCOMM_CALL_CONTROL_SERVICE.topic;
          } else {
            this.skip('Call Control is not configured on the server');
          }

          var dfd = this.async(10000);
          var refer = false;
          var alerted = false;
          chat1.on('chat:message', function(message){
            console.log('****************************MESSAGE ***', message);
          });
          chat1.on('session:refer', function(){
            // If we get a refer, connect!
            refer = true;
            console.log('*** REFER RECEIVED ***');
            chat1.connect();
          });
          chat2.on('session:alerting', function(){
            console.log('*** ALERTING RECEIVED ***');
            alerted = true;
            chat2.accept();
          });
          var finish = dfd.callback( function(obj) {
            //obj should be a WebRTCConnection
            // and Source should match our topic we know...
            console.log('FINISH Called!', obj);
            assert.ok(chat2.sessionStarted(), 'Session Started!');
          });   
          //chat1.on('session:started',finish);
          console.log('USING UID: ', uid2);
          var mq = EP1.getMqttEndpoint();
          var ThirdPCC = "3PCCTestNode";
          var ThirdPCCMessage = { 
            'rtcommVer' : 'v1.0.0',
            'method': '3PCC_PLACE_CALL',
            'callerEndpoint': EP1.getUserID(),
            'calleeEndpoint': EP2.getUserID(),
            'appContext':appContext,
            'fromTopic': '/'+ThirdPCC,
            'transID': '1111-1111-1111-1111'};
          mq.subscribe("/"+ThirdPCC+ "/#");
          mq.on('message', finish);

          mq.publish(ccTopic, ThirdPCCMessage);
          chat1.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
        },
    });
});
