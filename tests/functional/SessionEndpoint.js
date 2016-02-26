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
    'intern/node_modules/dojo/Promise',
    (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../support/mqttws31_shim':
        'bower_components/bower-mqttws/mqttws31',
    'support/config',
    'bower_components/webrtc-adapter/adapter',
    'umd/rtcomm/EndpointProvider',
    'support/rtcommFatUtils'
], function (intern, registerSuite, assert, Deferred, globals, config, adapter, EndpointProvider,Fat) {
   var suiteName = Fat.createSuiteName("FVT: SessionEndpoint");
   var DEBUG = (intern.args.DEBUG === 'true')? true: false;
   var SKIP_ALL=false;
    // anything in here will get destroyed (but not recreated) in beforeEach;
    var g ={};
    var destroy = function() {
      Object.keys(g).forEach(function(key) {
        if (typeof g[key].destroy === 'function' ) {
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
    var T1 = 3000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 3000; // How long we wait to check results
    var T3 = T2 +3000;  // How long we wait to timeout test.

    var createAndInitTwoProviders = function createAndInitTwoProviders(cfg1, cfg2) {
      var p = new Promise(
        function(resolve, reject){ 
          Fat.createProvider(cfg1, DEBUG).then( function(EP) {
            Fat.createProvider(cfg2, DEBUG)
            .then( function(EP2) {
              // Wait 1 second to resolve 
              setTimeout(function() {
                resolve({provider1: EP, provider2: EP2});
              },T1);
            })
            .catch(function(message){
              reject(message);
            });
           }).catch(function(message){
             reject(message);
           });
      });
      return p;
    };

    registerSuite({
        name: suiteName,
        setup: function() {
          console.log('************* SETUP: '+this.name+' **************');
        },
        teardown: function() {
          console.log('************* TEARDOWN: '+this.name+' **************');
          destroy();
        },
        beforeEach: function() {
          destroy();
        },
     "SessionEndpoint(No protocols) A calls B": function() {
         console.log('************* '+this.name+' **************');
        // SKIP_ALL && this.skip(false);
         var dfd = this.async(T2);
         // Our endpoints
         var ep1;
         var ep2;
         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.ok(ep1_trying, 'Caller generated trying event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
            assert.ok(ep1.sessionStarted());
            assert.ok(ep2.sessionStarted());
         });

         var ep1_trying = false;
         var ep1_ringing= false;
         var ep2_alerting= false;
         //   receive PRANSWER --> ringing
         //   receive ANSWER --> started
         // ep2(callee)
         //   receive call --> alerting
         //   send ANSWER --> started
         var cfg1 = getConfig('testuser1');
         var cfg2 = getConfig('testuser2');
         createAndInitTwoProviders(cfg1,cfg2)
          .then(function(obj){
            var EP1 = g.EP1 = obj.provider1;
            var EP2 = g.EP2 = obj.provider2;
            DEBUG && EP1.setLogLevel('DEBUG');
            DEBUG && EP2.setLogLevel('DEBUG');
            console.log('>>>> EP1:', EP1.currentState());
            console.log('>>>> EP2:', EP2.currentState());
            ep1 = EP1.getSessionEndpoint();
            ep2 = EP2.getSessionEndpoint();
            ep1.on('session:ringing', function() { ep1_ringing = true});
            ep1.on('session:trying', function() { ep1_trying = true});
            ep1.on('session:started', finish);
            ep2.on('session:alerting', function(obj) {
              ep2_alerting = true;
              console.log('>>>>TEST  accepting call');
              setTimeout(function() {
               ep2.accept();
              },1000);
             });
            ep1.connect(cfg2.userid);
          });
         },
     "in Browser A calls B(disconnect while ringing)": function() {
         console.log('************* '+this.name+' **************');
//         SKIP_ALL && this.skip(false);
         var dfd = this.async(T2);
         // Our endpoints
         var ep1;
         var ep2;

         var finish = dfd.callback(function(object){
            console.log("******************Asserting now...***********************");
            console.log('endpoint1: ',ep1);
            console.log('endpoint2: ',ep2);
            assert.notOk(ep1_failed, 'Caller generated failed event');
            assert.notOk(ep2_failed, 'Callee generated failed event');
            assert.notOk(ep1_started, 'Caller generated started event');
            assert.notOk(ep2_started, 'Callee generated started event');
            assert.ok(ep1_ringing, 'Caller generated ringing event');
            assert.ok(ep2_alerting, 'Callee generated alerting event');
         });

         var ep1_trying = false;
         var ep1_ringing= false;
         var ep2_stopped= false;
         var ep1_stopped = false;
         var ep2_alerting= false;
         var ep1_failed= false;
         var ep2_failed= false;
         var ep1_started= false;
         var ep2_started= false;


         var cfg1 = getConfig('testuser1');
         var cfg2 = getConfig('testuser2');
         createAndInitTwoProviders(cfg1,cfg2)
          .then(function(obj){
            var EP1 = g.EP1 = obj.provider1;
            var EP2 = g.EP2 = obj.provider2;
            ep1 = EP1.getSessionEndpoint();
            ep2 = EP2.getSessionEndpoint();
             //   receive PRANSWER --> ringing //
             //   //   receive ANSWER --> started
             // ep2(callee)
             //   receive call --> alerting
             //   send ANSWER --> started
             //
             ep1.on('session:ringing', function() { 
               console.log('>>> ep1 session:ringing');
               ep1_ringing = true;});
             ep1.on('session:failed', function() { ep1_failed= true});
             ep2.on('session:failed', function() { ep2_failed= true});
             ep1.on('session:trying', function() { ep1_trying = true});
             ep1.on('session:started', function() { ep1_started = true});
             ep2.on('session:started', function() { ep2_started = true});
             ep1.on('session:stopped', function() {console.log('EP1 ***session:stopped'); ep1_stopped = true;});
             ep2.on('session:stopped', finish );
             ep2.on('session:alerting', function(obj) {
                 // At this state, cancel the call.
                 ep2_alerting = true;
                 setTimeout(function() {
                  console.log('********* Disconnecting call **************');
                  ep1.disconnect();
                 },1000);
               });
              ep1.connect(cfg2.userid);
          });
         },
    });
});


