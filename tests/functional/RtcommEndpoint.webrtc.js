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
], function (intern, registerSuite, assert, globals, cfg, adapter, EndpointProvider, Fat) {

    var DEBUG = (intern.args.DEBUG === 'true')? true: false;

    /* put stuff here to destroy it later */
    var g ={};
    var destroy = function() {
      Object.keys(g).forEach(function(key) {
        if (typeof g[key].destroy === 'function' ) {
          g[key].destroy();
          delete g[key];
        }
      });
    };
    // Timings
    var T1 = 5000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 3000; // How long we wait to check results
    var T3 = T2 +3000;  // How long we wait to timeout test.

    registerSuite({
        name: 'FVT - Connection Testing (browser only launch Chrome with --use-fake-ui-for-media-stream to stop prompts)',
        setup: function() {
          console.log('************* SETUP: '+this.name+' **************');
          var p = new Promise(
            function(resolve, reject) {
              Fat.createProvider(cfg.clientConfig(), 'test').then(
                function(ep) {
                   g.EP1 = ep;
                   DEBUG && g.EP1.setLogLevel('DEBUG');
                   Fat.createProvider(cfg.clientConfig(), 'test').then(function(EP2) {
                     g.EP2 = EP2;
                     DEBUG && g.EP2.setLogLevel('DEBUG');
                     Fat.createConnection(g.EP1,g.EP2).then(function(obj) {
                       // Assign these as global (to be destroyed later);
                       g.ep1 = obj.ep1;
                       g.ep2 = obj.ep2;
                       console.log('************* Setup Complete *****************');
                       resolve();
                     });
                   });
                });
          });
          return p;
        },
        teardown: function() {
          console.log('************* TEARDOWN: '+this.name+' **************');
          destroy();
        },
        /*
         * Create a peerConnection w/ Webrtc, confirm both sides are receiving audio and video
         */
        "Validate Connection between two clients (browser only)": function() {
          console.log('************* '+this.name+' **************');
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var caller = g.ep1;
          var callee = g.ep2;
          console.log('caller:', caller);
          console.log('callee:', callee);


          // the connection created should have webrtc enabled, but not chat!
          assert.isTrue(caller.webrtc.enabled(), 'Caller: WebRTC is enabled');
          assert.isFalse(caller.chat.enabled(), 'Callee: is enabled');
          assert.isTrue(callee.webrtc.enabled(), 'Caller: WebRTC is enabled');
          assert.isFalse(callee.chat.enabled(), 'Callee: Chat is enabled');
          // Make sure we are connected.
          assert.equal(caller.getState(),'session:started', 'Caller Session:started'); 
          assert.equal(callee.getState(),'session:started', 'Callee Session:started'); 
          assert.equal(caller.webrtc.getState(),'connected', 'Caller Session:started'); 
          assert.equal(callee.webrtc.getState(),'connected', 'Callee Session:started'); 

          // Verify audio /video is setup.
          assert.ok(caller.webrtc.isSendingAudio(), 'We are sending audio');
          assert.ok(caller.webrtc.isReceivingAudio(), 'We are receiving audio');
          assert.ok(caller.webrtc.isSendingVideo(), 'We are sending video');
          assert.ok(caller.webrtc.isReceivingVideo(), 'We are receiving video ');
          assert.ok(callee.webrtc.isSendingAudio(), 'We are sending audio');
          assert.ok(callee.webrtc.isReceivingAudio(), 'We are receiving audio');
          assert.ok(callee.webrtc.isSendingVideo(), 'We are sending video');
          assert.ok(callee.webrtc.isReceivingVideo(), 'We are receiving video ');
        },
        /*
         * Create a peerConnection w/ Webrtc, confirm both sides are receiving audio and video
         */
        "Disable webrtc Connection between two clients (browser only[Test is flakey])": function() {
          console.log('************* '+this.name+' **************');
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var dfd = this.async(12000);
          var caller = g.ep1;
          var callee = g.ep2;
          console.log('caller:', caller);
          console.log('callee:', callee);

          // the connection created should have webrtc enabled, but not chat!
          var finish = dfd.callback( function() {

            // Confirm everything is disabled.
            console.log('***** caller.webrtc.enabled()?:'+caller.webrtc.enabled());
            assert.isFalse(caller.webrtc.enabled(), 'Caller: WebRTC is DISABLED');
            assert.isFalse(caller.chat.enabled(), 'Caller: Chat is DISABLED');

            // Callee should still be enabled.
            assert.isTrue(callee.webrtc.enabled(), 'Callee: WebRTC is DISABLED');
            assert.isFalse(callee.chat.enabled(), 'Callee: Chat is DISABLED');

            // Session should still be started though
            assert.equal(caller.getState(),'session:started', 'Caller Session:started'); 
            assert.equal(callee.getState(),'session:started', 'Callee Session:started'); 

            // Webrtc should be 'disconnected'
            assert.equal(caller.webrtc.getState(),'disconnected', 'Caller webrtc:disconnected'); 
            assert.equal(callee.webrtc.getState(),'disconnected', 'Callee webrtc:disconnected'); 

            // There should NOT be a peerconnection:
            assert.notOk(caller.webrtc.pc, 'Caller PeerConnection removed successfully'); 
            assert.notOk(callee.webrtc.pc, 'Callee PeerConnection removed successfully'); 
          });

          callee.on('webrtc:disconnected', finish);
          caller.on('webrtc:disconnected', function(obj) {
            console.log('**** Caller received webrtc:disconnected event', obj);
            console.log('PeerConnection here still?' , caller.webrtc.pc);
          });

          caller.webrtc.disable();

        },
        /*
         * Disable webrtc on callee
         */
        "disable webrtc on Caller(browser only)": function() {
          console.log('************* '+this.name+' **************');
//          this.skip();
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var caller = g.ep1;
          var callee = g.ep2;
          console.log('caller:', caller);
          console.log('callee:', callee);

          // Should do nothing but change enabled state.
          callee.webrtc.disable();
            // Confirm everything is disabled.
            console.log('***** caller.webrtc.enabled()?:'+caller.webrtc.enabled());
            assert.isFalse(caller.webrtc.enabled(), 'Caller: WebRTC is DISABLED');
            assert.isFalse(caller.chat.enabled(), 'Caller: Chat is DISABLED');
            assert.isFalse(callee.webrtc.enabled(), 'Callee: WebRTC is DISABLED');
            assert.isFalse(callee.chat.enabled(), 'Callee: Chat is DISABLED');

            // Session should still be started though
            assert.equal(caller.getState(),'session:started', 'Caller Session:started'); 
            assert.equal(callee.getState(),'session:started', 'Callee Session:started'); 

            // Webrtc should be 'disconnected'
            assert.equal(caller.webrtc.getState(),'disconnected', 'Caller webrtc:disconnected'); 
            assert.equal(callee.webrtc.getState(),'disconnected', 'Callee webrtc:disconnected'); 

            // There should NOT be a peerconnection:
            assert.notOk(caller.webrtc.pc, 'Caller PeerConnection removed successfully'); 
            assert.notOk(callee.webrtc.pc, 'Callee PeerConnection removed successfully'); 
        },
        /*
         * Create a peerConnection w/ Webrtc, confirm both sides are receiving audio and video
         */
        "enable chat Connection between two clients (browser only)": function() {
          console.log('************* '+this.name+' **************');
 //         this.skip();
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var dfd = this.async(5000);
          var caller = g.ep1;
          var callee = g.ep2;
          console.log('caller:', caller);
          console.log('callee:', callee);
          var onEnableMessage = "This is my on enable message";

          caller.chat.enable("caller "+onEnableMessage);
          callee.chat.enable("callee "+onEnableMessage);

          var callerMsgReceived = null;
          var calleeMsgReceived = null;

          caller.on('chat:message', function(message) {
            console.log('**** CALLER Received message: ', message);
            callerMsgReceived = message.message.message;
            // FINISH HERE!
            finish();
          });
          callee.on('chat:message', function(message) {
            console.log('**** CALLEE Received message: ', message);
            calleeMsgReceived = message.message.message;
          });

          var finish = dfd.callback( function() {
            // Confirm everything is disabled.
            console.log('***** caller.webrtc.enabled()?:'+caller.webrtc.enabled());
            assert.isFalse(caller.webrtc.enabled(), 'Caller: WebRTC is DISABLED');
            assert.isTrue(caller.chat.enabled(), 'Caller: Chat is ENABLED');
            assert.isFalse(callee.webrtc.enabled(), 'Callee: WebRTC is DISABLED');
            assert.isTrue(callee.chat.enabled(), 'Callee: Chat is ENABLED');


            assert.equal(calleeMsgReceived, "caller "+onEnableMessage, "Callee Received correct message from caller");
            assert.equal(callerMsgReceived, "callee "+onEnableMessage, "Caller Received correct message from callee");


            // Session should still be started though
            assert.equal(caller.getState(),'session:started', 'Caller Session:started'); 
            assert.equal(callee.getState(),'session:started', 'Callee Session:started'); 

            // Webrtc should be 'disconnected'
            assert.equal(caller.webrtc.getState(),'disconnected', 'Caller webrtc:disconnected'); 
            assert.equal(callee.webrtc.getState(),'disconnected', 'Callee webrtc:disconnected'); 

            // There should NOT be a peerconnection:
            assert.notOk(caller.webrtc.pc, 'Caller PeerConnection removed successfully'); 
            assert.notOk(callee.webrtc.pc, 'Callee PeerConnection removed successfully'); 
          });
        },
        "enable webrtc Connection between two clients (browser only)": function() {
          console.log('************* '+this.name+' **************');
  //        this.skip();
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var dfd = this.async(5000);
          var caller = g.ep1;
          var callee = g.ep2;
          console.log('caller:', caller);
          console.log('callee:', callee);
          var onEnableMessage = "This is my on enable message";

          caller.webrtc.enable();


          var finish = dfd.callback( function() {
            // Confirm everything is disabled.
            console.log('***** caller.webrtc.enabled()?:'+caller.webrtc.enabled());
            assert.isTrue(caller.webrtc.enabled(), 'Caller: WebRTC is ENABLED');
            assert.isTrue(caller.chat.enabled(), 'Caller: Chat is ENABLED');
            assert.isTrue(callee.webrtc.enabled(), 'Callee: WebRTC is ENABLED');
            assert.isTrue(callee.chat.enabled(), 'Callee: Chat is ENABLED');

            // Session should still be started though
            assert.equal(caller.getState(),'session:started', 'Caller Session:started'); 
            assert.equal(callee.getState(),'session:started', 'Callee Session:started'); 

            // Webrtc should be 'disconnected'
            assert.equal(caller.webrtc.getState(),'connected', 'Caller webrtc:connected'); 
            assert.equal(callee.webrtc.getState(),'connected', 'Callee webrtc:connected'); 
          });

          callee.on('webrtc:connected', finish);
        },
    });
});
