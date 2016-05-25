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
  'intern/node_modules/dojo/Promise', (typeof window === 'undefined' && global) ? 'intern/dojo/node!../support/mqttws31_shim' :
  'bower_components/bower-mqttws/mqttws31',
  'support/config',
  'bower_components/webrtc-adapter/adapter',
  'umd/rtcomm/EndpointProvider',
  'support/rtcommFatUtils'
], function(intern, registerSuite, assert, Deferred, globals, config, adapter, EndpointProvider, Fat) {
  var suiteName = Fat.createSuiteName("FVT: SessionEndpoint");
  var DEBUG = (intern.args.DEBUG === 'true') ? true : false;
  var SKIP_ALL = false;
  // anything in here will get destroyed (but not recreated) in beforeEach;
  var g = {};
  var destroy = function() {
    Object.keys(g).forEach(function(key) {
      if (typeof g[key].destroy === 'function') {
        g[key].destroy();
        delete g[key];
      }
    });
  };
  // used to run this Suite 2 times (one w/ rtcomm server & 1 w/out)
  var getConfig = function getConfig(id) {
      var c = config.clientConfig(id);
      return c;
    }
    // Timings
  var T1 = 3000; // How long we wait to setup, before sending messages.
  var T2 = T1 + 3000; // How long we wait to check results
  var T3 = T2 + 3000; // How long we wait to timeout test.

  var createAndInitTwoProviders = function createAndInitTwoProviders(cfg1, cfg2) {
    var p = new Promise(
      function(resolve, reject) {
        Fat.createProvider(cfg1).then(function(EP) {
          Fat.createProvider(cfg2).then(function(EP2) {
            // Wait 1 second to resolve
            setTimeout(function() {
              resolve({
                provider1: EP,
                provider2: EP2
              });
            }, T1);
          });
        });
      });
    return p;
  };

  registerSuite({
    name: suiteName,
    setup: function() {
      console.log('************* SETUP: ' + this.name + ' **************');
    },
    teardown: function() {
      console.log('************* TEARDOWN: ' + this.name + ' **************');
      destroy();
    },
    beforeEach: function() {
      destroy();
    },
    "GenericMessagEndpoint() A calls B": function() {
      console.log('************* ' + this.name + ' **************');
      // SKIP_ALL && this.skip(false);
      var dfd = this.async(T2);
      // Our endpoints
      var ep1;
      var ep2;
      var finish = dfd.callback(function(object) {
        console.log("******************Asserting now...***********************");
        console.log('endpoint1: ', ep1);
        console.log('endpoint2: ', ep2);
        assert.ok(ep1_trying, 'Caller generated trying event');
        assert.ok(ep1_ringing, 'Caller generated ringing event');
        assert.ok(ep2_alerting, 'Callee generated alerting event');
        assert.ok(ep1.sessionStarted());
        assert.ok(ep2.sessionStarted());
      });

      var ep1_trying = false;
      var ep1_ringing = false;
      var ep2_alerting = false;

      var cfg1 = getConfig('testuser1');
      var cfg2 = getConfig('testuser2');

      createAndInitTwoProviders(cfg1, cfg2)
        .then(function(obj) {
          var EP1 = g.EP1 = obj.provider1;
          var EP2 = g.EP2 = obj.provider2;
          ep1 = EP1.getMessageEndpoint();
          ep2 = EP2.getMessageEndpoint();
          ep1.on('session:ringing', function() {
            ep1_ringing = true
          })
          ep1.on('session:trying', function() {
            ep1_trying = true
          })
          ep1.on('session:started', finish);
          ep2.on('session:alerting', function(obj) {
            ep2_alerting = true;
            console.log('>>>>TEST  accepting call');
            setTimeout(function() {
              ep2.accept();
            }, 1000);
          });
          ep1.connect(cfg2.userid);
        });
    },
    "GenericMessagEndpoint() A calls B - sends messages": function() {
      console.log('************* ' + this.name + ' **************');
      // SKIP_ALL && this.skip(false);
      var dfd = this.async(T2);

      // Our endpoints
      var ep1;
      var ep2;

      var finish = dfd.callback(function(object) {
        console.log("******************Asserting now...***********************");
        console.log(object);
        // Object should be an event_object
        assert.ok(ep1.sessionStarted(), "Endpoint 1 is Session Started");
        assert.ok(ep2.sessionStarted(), "Endpoint2 is session Started");
        assert.equal(object.message, "Hello!", "Received the message");
      });

      var cfg1 = getConfig('testuser1');
      var cfg2 = getConfig('testuser2');

      createAndInitTwoProviders(cfg1, cfg2)
        .then(function(obj) {
          // Save the providers 
          var EP1 = g.EP1 = obj.provider1;
          var EP2 = g.EP2 = obj.provider2;
          // create Endpoints
          ep1 = EP1.getMessageEndpoint();
          ep2 = EP2.getMessageEndpoint();

          ep1.on('session:ringing', function() {
            ep1_ringing = true
          })
          ep1.on('session:trying', function() {
            ep1_trying = true
          })
          ep1.on('session:started', function() {
            ep1.generic_message.send("Hello!");
          });

          // We will finish when we receive a generic_message
          ep2.on('generic_message:message', finish);

          ep2.on('session:alerting', function(obj) {
            ep2_alerting = true;
            console.log('>>>>TEST  accepting call');
            setTimeout(function() {
              ep2.accept();
            }, 1000);
          });
          ep1.connect(cfg2.userid);
        });
    }
  })
})
