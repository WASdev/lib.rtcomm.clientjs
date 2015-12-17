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
    /* Use the Mock (in browser mqtt) */
   (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../../support/mqttws31_shim':
        'bower_components/bower-mqttws/mqttws31',
    'support/config',
    'bower_components/webrtc-adapter/adapter',
    'umd/rtcomm/EndpointProvider'
], function (intern, registerSuite, assert, globals,config, adapter, EndpointProvider) {
  var DEBUG = (intern.args.DEBUG === 'true')? true: false;
  var badconfig = {
      server: 1,
      port: "a",
      userid: 1,
      connectorTopicName: {}
  };
  var validconfig = { server: "a",
      port: 1883,
      userid: "someuser",
      connectorTopicName: "sometopic"};

  var endpointProvider = null;
  registerSuite({
    name: "Unit Tests - EndpointProvider",
    beforeEach: function() {
     console.log('******** Running Test *********');
     endpointProvider && endpointProvider.destroy();
     endpointProvider = new EndpointProvider();
    },
    "empty config for init()": function() {
        var error = null;
        try {
          console.log('INITIALIZING PROVIDER');
          endpointProvider.init();
        } catch(e) {
          error = e;
          console.log(error);
        }
        assert.equal('EndpointProvider initialization requires a minimum configuration: {}', error.message);
      },
      "valid but incorrect config throws an error": function(){
            var error = null;
            try {
              endpointProvider.init(validconfig);
            } catch(e) {
              error = e;
              console.log(error);
            }
            assert.ok(error);
       },
      "setRtcommEndpointConfig - set, change, compare": function(){
            var error = null;
            var cb = function(event) {
              console.log(event);
            };
            var configobj = {
              broadcast: {audio: true, video: false},
              'session:started':cb,
              'session:stopped':cb
            };
            endpointProvider.setRtcommEndpointConfig(configobj);
            console.log('>>>>> after set ', endpointProvider._.rtcommEndpointConfig);
            console.log('>>>>>> config ', configobj);
            assert.deepEqual(endpointProvider._.rtcommEndpointConfig,configobj, 'After setting config');
            endpointProvider.setRtcommEndpointConfig({broadcast: {audio:false, video:true}});
            assert.ok(endpointProvider._.rtcommEndpointConfig.broadcast.video, 'Video changed correctly');
            assert.notOk(endpointProvider._.rtcommEndpointConfig.broadcast.audio, 'Audio Changed correctly');
            console.log(endpointProvider._.rtcommEndpointConfig);
            assert.equal(endpointProvider._.rtcommEndpointConfig['session:started'],cb,'Callbacks stayed the same');
            assert.equal(endpointProvider._.rtcommEndpointConfig['session:stopped'],cb, 'callbacks stayed the same');

       },
       "getRtcommEndpoint() [no args, no appContext set] throws error": function(){
            var error = null;
            try {
              var rtc = endpointProvider.getRtcommEndpoint();
            }  catch(e) {
              console.log(e);
              error = e;
            }
            assert.ok(error);
            assert.ok(Object.keys(endpointProvider.endpoints()).length === 0);
            console.log(endpointProvider.currentState());
        },
        "getRtcommEndpoint() [no args]returns valid object": function(){
            var error = null;
            var endpoint = null;
            try {
              endpointProvider.setAppContext('test');
              endpoint = endpointProvider.getRtcommEndpoint();
            }  catch(e) {
              console.log(e);
              error = e;
            }
            console.log('TEST endpoint: ', endpoint);
            assert.ok(endpoint);
            console.log('TEST endpoint.appContext: '+ endpoint.getAppContext());
            assert.ok(endpoint.getAppContext() === 'test');
            console.log('TEST endpoint.userid: '+ endpoint.getUserID());
            console.log('TEST endpointProvider.userid: '+ endpointProvider.getUserID());
            assert.ok(endpoint.getUserID() === endpointProvider.getUserID());
            assert.notOk(error);
            assert.ok(Object.keys(endpointProvider.endpoints()).length === 1);
            console.log(endpointProvider.currentState());
        },
        "getRtcommEndpoint() [args]returns valid object": function(){
            var error = null;
            var endpoint = null;
            try {
              endpointProvider.setAppContext('test');
              endpoint = endpointProvider.getRtcommEndpoint({chat: true, webrtc: true});
            }  catch(e) {
              console.log(e);
              error = e;
            }
            console.log('TEST endpoint: ', endpoint);
            assert.ok(endpoint);
            console.log('TEST endpoint.appContext: '+ endpoint.getAppContext());
            assert.ok(endpoint.getAppContext() === 'test');
            console.log('TEST endpoint.userid: '+ endpoint.getUserID());
            console.log('TEST endpointProvider.userid: '+ endpointProvider.getUserID());
            assert.ok(endpoint.getUserID() === endpointProvider.getUserID());
            assert.ok(typeof endpoint.getUserID() === 'undefined');
            assert.notOk(error);
            assert.ok(Object.keys(endpointProvider.endpoints()).length === 1);
            console.log(endpointProvider.currentState());
        },
        "EndpointRegistry - add/remove endpoints works": function(){
            var error = null;
            var endpoint = null;
            var endpoint2 = null;
            var endpoint3 = null;
            var endpoint4 = null;
            var endpointProvider2 = new EndpointProvider();
            try {
              endpointProvider.setAppContext('test');
              endpointProvider2.setAppContext('test');

              endpoint = endpointProvider.getRtcommEndpoint();
              endpoint2 = endpointProvider.getRtcommEndpoint();
              endpoint3 = endpointProvider2.getRtcommEndpoint();
              endpoint4 = endpointProvider2.getRtcommEndpoint();
            }  catch(e) {
              console.log(e);
              error = e;
            }
            assert.ok(endpoint !== endpoint2);
            assert.equal(2, Object.keys(endpointProvider.endpoints()).length, 'Endpoints in Registry');
            assert.equal(2, Object.keys(endpointProvider2.endpoints()).length, 'ep2 Endpoints in Registry ');
            assert.notOk(error);
            endpoint.destroy();
            // Should just be 1 now... 
            assert.equal(Object.keys(endpointProvider.endpoints()).length,1, 'After destroy');
            endpoint2.destroy();
            // Should just be 0 now... 
            assert.equal(Object.keys(endpointProvider.endpoints()).length,0, 'After destroy');
            endpoint3.destroy();
            // Should just be 1 now... 
            assert.equal(Object.keys(endpointProvider2.endpoints()).length,1, 'After Destroy');
            endpoint4.destroy();
            // Should just be 0 now... 
            assert.equal(Object.keys(endpointProvider2.endpoints()).length,0, 'After Destroy');
            console.log(endpointProvider.currentState());
          },
        "getRtcommEndpoint() - Multiples w/ same config return different objects.": function(){
            var error = null;
            var endpoint = null;
            var endpoint2 = null;
            try {
              endpointProvider.setAppContext('test');
              endpoint = endpointProvider.getRtcommEndpoint();
              endpoint2 = endpointProvider.getRtcommEndpoint();
            }  catch(e) {
              console.log(e);
              error = e;
            }
            assert.ok(endpoint !== endpoint2);
            assert.notOk(error);
            assert.ok(Object.keys(endpointProvider.endpoints()).length === 2);
            console.log(endpointProvider.currentState());
          },
          "getRtcommEndpoint() - API Validation": function(){
            // This needs to be moved to an RtcomMEndpoint unit test rather than here I think.
            this.skip();
            var fakeBadSelfView = {};
            var fakeBadRemoteView = {};
            var fakeSelfView = {src: ""};
            var fakeRemoteView = {src: ""};
            var error = null;
            endpointProvider.setAppContext('test');
            var rtc = endpointProvider.getRtcommEndpoint({webrtc:true, chat: true});
            console.log('MediaIn throws a TypeError without .src');
            try {
              rtc.setMediaIn(fakeBadRemoteView);
            } catch(e) {
              error = e;
            }
            assert.ok(error instanceof TypeError);
            console.log('MediaOut throws a TypeError without .src');

            error = null;
            try {
              rtc.setMediaOut(fakeBadSelfView);
            } catch(e) {
             error = e;
            }
            assert.ok(error instanceof TypeError);

            error = null;
            console.log('MediaIn does not throw error w/ .src', error);
            try {
              rtc.setMediaIn(fakeRemoteView);
            } catch(e) {
              console.log('Threw an error, ', e, fakeRemoteView);
             error = e;
            }
            // error should be null;
            assert.notOk(error);
            error = null;

            console.log('MediaOut does not throw error w/ .src');
            try {
              rtc.setMediaOut(fakeSelfView);
            } catch(e) {
              error = e;
            }
            // error should be null;
            assert.notOk(error);
            assert.ok(rtc);
          },
        "getRtcommEndpoint() - call webrtc.enable on it... ": function(){
            var error = null;
            try {
              endpointProvider.setAppContext('test');
              var rtc = endpointProvider.getRtcommEndpoint({webrtc: true, chat: true});
              rtc.webrtc.enable();
            }  catch(e) {
              error = e;
            }
            assert.ok(rtc);

            if (typeof global !== 'undefined') {
              // Probably node.js... expect an error
              assert.ok(error);
            } else { 
            // browser
            assert.notOk(error);
            }
            
          },
        "getPresenceMonitor() ": function() {
          var pm = endpointProvider.getPresenceMonitor();
          assert.equal('PresenceMonitor',pm.objName, 'Created/returned correct object');
          var error = false;
          try {
            pm.add('topic/something');
          } catch(e){
            error = true;
          }
          // Should have an error.
          assert.ok(error);
        },
        "logLevel": function(){
            var error = null;
            try {
              endpointProvider.setLogLevel('thing');
            } catch (e)  {
              error = e;
            }
            assert.ok(error);

            var lvl = 'MESSAGE';
            console.log('MESSAGE', lvl);
            endpointProvider.setLogLevel(lvl);
            assert.equal(lvl, endpointProvider.getLogLevel());

            lvl = 'DEBUG';
            endpointProvider.setLogLevel(lvl);
            assert.equal(lvl, endpointProvider.getLogLevel());

            lvl = 'INFO';
            endpointProvider.setLogLevel(lvl);
            assert.equal(lvl, endpointProvider.getLogLevel());

            lvl = 'TRACE';
            endpointProvider.setLogLevel(lvl);
            assert.equal(lvl, endpointProvider.getLogLevel());

          }
  }); // End of Tests


});
