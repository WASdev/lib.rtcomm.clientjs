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
], function (registerSuite, assert, Deferred, globals,config, rtcomm) {

    var createProvider = function createProvider(userid,appContext) {
      var dfd = new Deferred();
      var EP = new rtcomm();
      EP.setLogLevel('DEBUG');
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

    var cfg= config.clientConfig1();
    delete cfg.userid;
    var uid1 = 'client1';
    var uid2 = 'client2';
    var appContext = 'internChatTest';
    var chat1, chat2;
    registerSuite({
        name: 'RtcommEndpoint - chat',
        setup: function() {
          console.log('*************setup!**************');
          var setupDfd = new Deferred();
          /* init the EndpointProvider */
          createProvider(uid1, appContext).then(
            function(EP){
              EP1 = EP;
              createProvider(uid2, appContext).then(
                function(EP){
                  EP2 = EP;
                  setupDfd.resolve();
                }
              );
            }
          );
          return setupDfd.promise;
        },
        teardown: function() {
          EP1.destroy();
          EP2.destroy();
          EP1 = null;
          EP2 = null;
        },
        beforeEach: function() {
          chat1 && chat1.destroy();
          chat2 && chat2.destroy();
          chat1 = EP1.createRtcommEndpoint();
          chat2 = EP2.createRtcommEndpoint();
        },
        'verify setup': function() {
          assert.equal(uid1, EP1.getUserID());
          assert.equal(uid2, EP2.getUserID());
          assert.equal(EP1.endpoints().length, 1);
          assert.equal(EP2.endpoints().length ,1);
        },
        'connect 2 sessions[No Liberty]':function() {
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
            assert.ok(chat2.sessionStarted(), 'Session Started!');
          });   
          chat1.on('session:started',finish);
          console.log('USING UID: ', uid2);
          chat1.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
        },
        'Issue 33:  Busy connect 2 sessions[No Liberty]':function() {
          /* chat1 calls chat2 which accepts.  
           * chat3 calls chat2 -- should get 'BUSY'
           */
          var dfd = this.async(10000);
          // We have a 3rd endpoint here...
          var chat3, EP3;
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
            EP3 = createProvider('client3','internChatTest').then(function(EP){
              chat3 = EP.createRtcommEndpoint();
              chat3.on('session:failed',finish);
              chat3.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
            });
          });
          chat1.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
        },
        'Initial Chat message on connect (if enabled) [No Liberty]': function() {
          console.log('************** START OF TEST ********************');
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
            setTimeout(function(){
              console.log(' TEST >>>>>> Chat1 DISCONNECTING ');
              chat1.disconnect();
            },2000);
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
        },

        'connect 2 chat clients via 3PCC':function() {
          var dfd = this.async(10000);
          var refer = false;
          var alerted = false;
          chat1.on('chat:message', function(message){
            console.log('****************************MESSAGE ***', message)
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
            'rtcommVer' : 'v0.0.1',
            'method': '3PCC_PLACE_CALL',
            'callerEndpoint': EP1.getUserID(),
            'calleeEndpoint': EP2.getUserID(),
            'appContext':appContext,
            'fromTopic': '/'+ThirdPCC,
            'transID': '1111-1111-1111-1111'};
          mq.subscribe("/"+ThirdPCC+ "/#");
          mq.on('message', finish);

          mq.publish("/rtcommscott/callControl", ThirdPCCMessage);
        //  chat1.connect({remoteEndpointID: uid2, toTopic: EP2.dependencies.endpointConnection.config.myTopic});
        },
    });
});
