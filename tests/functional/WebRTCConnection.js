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
    'umd/rtcomm/EndpointProvider'
], function (intern, registerSuite, assert, Deferred,globals, config, adapter, EndpointProvider) {

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
    /*
     * create an Endpoint Provider and init it in a promise-like fashion
     * Passes endpoint provider into promise;
     */
    var createProvider = function createProvider(cfg,appContext) {
      var dfd = new Deferred();
      var EP = new EndpointProvider();
      DEBUG && EP.setLogLevel('DEBUG');
      EP.setAppContext(appContext);
      EP.init(cfg,
        function(message) { 
          dfd.resolve(EP);
        },
        function(message) { console.error('init failed', message); dfd.reject(message);}
      );
      return dfd.promise;
    };

    /*
     * create a PeerConnection between two endpoints in a promise-like way.. 
     * Resolve promise when the connection is established.
     *
     * pass object w/ two endnpoints { ep1: endpoint, ep2: endpoint} 
     */
    var createConnection = function createConnection(EP1, EP2) {
      var dfd = new Deferred();
      var readyToResolve = 0;
      var epEvents = {
        'session:alerting': function(eventObject) {
          // Auto-accept 
          eventObject && eventObject.endpoint && eventObject.endpoint.accept();
         }, 
         'session:started': function(eventObject) {
           if ( eventObject && eventObject.endpoint) {
              console.log('SESSION STARTED -- EndpointID '+eventObject.endpoint.getUserID());
           }
           resolve();
         },
         'session:failed': function(eventObject) {
           if ( eventObject && eventObject.endpoint) {
              console.log('SESSION FAILED -- EndpointID '+eventObject.endpoint.getUserID());
           }
           dfd.reject();
         },
         'session:stopped': function(eventObject) {
           if ( eventObject && eventObject.endpoint) {
              console.log('SESSION STOPPED -- EndpointID '+eventObject.endpoint.getUserID());
           }
         },
         'webrtc:connected': function(eventObject) {
           resolve();
         }
      };

      var resolve = function() {

        console.log('ep1.getState() === '+ep1.getState());
        console.log('ep2.getState() === '+ep2.getState());
        console.log('ep1.webrtc.getState() === '+ep1.webrtc.getState());
        console.log('ep2.webrtc.getState() === '+ep2.webrtc.getState());
        if (ep2.getState() === 'session:started' && 
            ep1.getState() === 'session:started' && 
            ep1.webrtc.getState() === 'connected' && 
            ep2.webrtc.getState() === 'connected' ) {
          console.log('createConnection resolving callback...');
          setTimeout(function() {
            console.log('st ep1:', ep1);
            console.log('st ep2:', ep2);
            dfd.resolve({ep1: ep1,ep2: ep2});
          }, 1000);
        }
      };
      
      EP1.setRtcommEndpointConfig(epEvents);
      EP2.setRtcommEndpointConfig(epEvents);
      var ep1 = EP1.createRtcommEndpoint({webrtc: true, chat:true});
      var ep2 = EP2.createRtcommEndpoint({webrtc: true, chat:true});
      ep2.webrtc.enable();
      ep1.webrtc.enable();
      ep1.connect(ep2.getUserID());
      return dfd.promise;
    };




    // Timings
    var T1 = 5000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 3000; // How long we wait to check results
    var T3 = T2 +3000;  // How long we wait to timeout test.

    registerSuite({
        name: 'FVT - WebRTC Connection (browser only launch Chrome with --use-fake-ui-for-media-stream to stop prompts)',
        setup: function() {
          console.log('*************setup!**************');
        },
        teardown: function() {
          destroy();
        },
        beforeEach: function() {
          destroy();
          console.log("***************************** NEW TEST ***************************");
        },
        /*
         * Create a peerConnection w/ Webrtc, confirm both sides are receiving audio and video
         */
        "Create a PeerConnection between two clients (browser only)": function() {
          console.log('***************** RunTest ************');
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var dfd = this.async(15000);

          var finishTest = dfd.callback(function(obj) {
            var ep1 = obj.ep1;
            var ep2 = obj.ep2;
            console.log('ep1:', ep1);
            console.log('ep2:', ep2);
            assert.ok(ep1.webrtc.isSendingAudio(), 'We are sending audio');
            assert.ok(ep1.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.ok(ep1.webrtc.isSendingVideo(), 'We are sending video');
            assert.ok(ep1.webrtc.isReceivingVideo(), 'We are receiving video ');
            assert.ok(ep2.webrtc.isSendingAudio(), 'We are sending audio');
            assert.ok(ep2.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.ok(ep2.webrtc.isSendingVideo(), 'We are sending video');
            assert.ok(ep2.webrtc.isReceivingVideo(), 'We are receiving video ');
          });

          var cfg = config.clientConfig();
          var cfg2= config.clientConfig();
          createProvider(cfg, 'test').then(
            function(ep) {
               g.EP1 = ep;
               createProvider(cfg2, 'test').then(function(EP2) {
                 g.EP2 = EP2;
                 createConnection(g.EP1,g.EP2).then(finishTest);
               });
            });
          console.log('global is:  ',g );
        },
        /*
         * Create a peerConnection w/ Webrtc, Pause A/V, confirm it on both sides 
         */
     "Pause A/V in a PeerConnection between two clients (browser only)": function() {
          console.log('***************** RunTest ************');
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var dfd = this.async(15000);

          var finishTest = dfd.callback(function(ep1, ep2) {
            /*
             * ep1 should not be sending AV
             * ep2 should not be receiving AV
             */
            assert.notOk(ep1.webrtc.isSendingAudio(), 'We are sending audio');
            assert.ok(ep1.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.notOk(ep1.webrtc.isSendingVideo(), 'We are sending video');
            assert.ok(ep1.webrtc.isReceivingVideo(), 'We are receiving video ');
            assert.ok(ep2.webrtc.isSendingAudio(), 'We are sending audio');
            assert.notOk(ep2.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.ok(ep2.webrtc.isSendingVideo(), 'We are sending video');
            assert.notOk(ep2.webrtc.isReceivingVideo(), 'We are receiving video ');
          });

          var cfg = config.clientConfig();
          var cfg2= config.clientConfig();
          createProvider(cfg, 'test').then(
            function(ep) {
               g.EP1 = ep;
               createProvider(cfg2, 'test').then(function(EP2) {
                 g.EP2 = EP2;
                 createConnection(g.EP1,g.EP2).then(function(obj) {
                  var ep1 = obj.ep1;
                  var ep2 = obj.ep2;
                  console.log('ep1:', ep1);
                  console.log('ep2:', ep2);
                  ep1.webrtc.mute();
                  setTimeout(function() {
                    finishTest(ep1, ep2);
                  },2000);
                 });
               });
            });
          console.log('global is:  ',g );
        },
     "Pause Audio in a PeerConnection between two clients (browser only)": function() {
          console.log('***************** RunTest ************');
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var dfd = this.async(15000);

          var finishTest = dfd.callback(function(ep1, ep2) {
            /*
             * ep1 should not be sending AV
             * ep2 should not be receiving AV
             */
            assert.notOk(ep1.webrtc.isSendingAudio(), 'We are sending audio');
            assert.ok(ep1.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.ok(ep1.webrtc.isSendingVideo(), 'We are sending video');
            assert.ok(ep1.webrtc.isReceivingVideo(), 'We are receiving video ');
            assert.ok(ep2.webrtc.isSendingAudio(), 'We are sending audio');
            assert.notOk(ep2.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.ok(ep2.webrtc.isSendingVideo(), 'We are sending video');
            assert.ok(ep2.webrtc.isReceivingVideo(), 'We are receiving video ');
          });

          var cfg = config.clientConfig();
          var cfg2= config.clientConfig();
          createProvider(cfg, 'test').then(
            function(ep) {
               g.EP1 = ep;
               createProvider(cfg2, 'test').then(function(EP2) {
                 g.EP2 = EP2;
                 createConnection(g.EP1,g.EP2).then(function(obj) {
                  var ep1 = obj.ep1;
                  var ep2 = obj.ep2;
                  console.log('ep1:', ep1);
                  console.log('ep2:', ep2);
                  ep1.webrtc.mute('audio');
                  setTimeout(function() {
                    finishTest(ep1, ep2);
                  },2000);
                 });
               });
            });
          console.log('global is:  ',g );
        },
     "Pause Video in a PeerConnection between two clients (browser only)": function() {
          console.log('***************** RunTest ************');
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var dfd = this.async(15000);

          var finishTest = dfd.callback(function(ep1, ep2) {
            /*
             * ep1 should not be sending AV
             * ep2 should not be receiving AV
             */
            assert.ok(ep1.webrtc.isSendingAudio(), 'We are sending audio');
            assert.ok(ep1.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.notOk(ep1.webrtc.isSendingVideo(), 'We are sending video');
            assert.ok(ep1.webrtc.isReceivingVideo(), 'We are receiving video ');
            assert.ok(ep2.webrtc.isSendingAudio(), 'We are sending audio');
            assert.ok(ep2.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.ok(ep2.webrtc.isSendingVideo(), 'We are sending video');
            assert.notOk(ep2.webrtc.isReceivingVideo(), 'We are receiving video ');
          });

          var cfg = config.clientConfig();
          var cfg2= config.clientConfig();
          createProvider(cfg, 'test').then(
            function(ep) {
               g.EP1 = ep;
               createProvider(cfg2, 'test').then(function(EP2) {
                 g.EP2 = EP2;
                 createConnection(g.EP1,g.EP2).then(function(obj) {
                  var ep1 = obj.ep1;
                  var ep2 = obj.ep2;
                  console.log('ep1:', ep1);
                  console.log('ep2:', ep2);
                  ep1.webrtc.mute('video');
                  setTimeout(function() {
                    finishTest(ep1, ep2);
                  },2000);
                 });
               });
            });
          console.log('global is:  ',g );
        },
     /*
     * Create a TWO peerConnections (4 Endpoints) w/ Webrtc, Pause A/V, confirm it does not affect 
     * other endpoint on same provider
     */
     "Pause A/V does not impact other endpoint on same provider": function() {
          console.log('***************** RunTest ************');
          if (typeof globals !== 'undefined' && typeof window === 'undefined') {
            this.skip();
          }
          var dfd = this.async(15000);
          var finishTest = dfd.callback(function(ep1, ep3) {
            /*
             * ep1 should not be sending AV
             * ep3 should be sending AV
             */
            assert.notOk(ep1.webrtc.isSendingAudio(), 'We are sending audio');
            assert.notOk(ep1.webrtc.isSendingVideo(), 'We are sending video');
            assert.ok(ep1.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.ok(ep1.webrtc.isReceivingVideo(), 'We are receiving video ');

            assert.ok(ep3.webrtc.isSendingAudio(), 'We are sending audio');
            assert.ok(ep3.webrtc.isReceivingAudio(), 'We are receiving audio');
            assert.ok(ep3.webrtc.isSendingVideo(), 'We are sending video');
            assert.ok(ep3.webrtc.isReceivingVideo(), 'We are receiving video ');
          });

          var cfg = config.clientConfig();
          var cfg2= config.clientConfig();
          createProvider(cfg, 'test').then(
            function(ep) {
               g.EP1 = ep;
               createProvider(cfg2, 'test').then(function(EP2) {
                 g.EP2 = EP2;
                 createConnection(g.EP1,g.EP2).then(function(obj) {
                   var ep1 = obj.ep1;
                   var ep2 = obj.ep2;
                   createConnection(g.EP1, g.EP2).then(function(obj) {
                     var ep3 = obj.ep1;
                     var ep4 = obj.ep2;
                     ep1.webrtc.mute();
                     setTimeout(function() {
                       finishTest(ep1, ep3);
                     },2000);
                   });
                 });
               });
            });
          console.log('global is:  ',g );
        },
    });
});
