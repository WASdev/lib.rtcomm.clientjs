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
], function (registerSuite, assert, Deferred, globals,config, rtcomm) {

    var createProvider = function createProvider(userid,appContext) {
      var dfd = new Deferred();
      var EP = new rtcomm.EndpointProvider();
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

        'connect 2 sessions':function() {
          var dfd = this.async(3000);
          console.log(EP1.currentState());
          console.log(EP1.currentState());
          EP1.setLogLevel('DEBUG');
          EP2.setLogLevel('DEBUG');
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
          chat1.connect(uid2);
        },
        'Initial Chat message on connect (if enabled)': function() {
          var dfd = this.async(8000);
          chat1.chat.enable();
          chat1.on('session:started', function(){

          });
          chat2.on('chat:message', dfd.callback(function(event_object){
            // message is event_object.message.message
            console.log('Received a Chat message...', event_object);
            assert.equal(event_object.message.message,'client1 has initiated a Chat with you', "Received chat from startup");
          }));
          chat1.connect(uid2);
        }
    });
});
