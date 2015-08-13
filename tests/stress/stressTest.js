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
        'lib/mqttws31',
    'support/config',
    'umd/rtcomm/EndpointProvider'
], function (intern, registerSuite, assert, Deferred, globals,config, EndpointProvider) {

    var DEBUG = (intern.args.DEBUG === 'true')? true: false;

    var MAX_CONNS = parseInt(intern.args.MAX_CONNS) || 50;
    var duration = parseInt(intern.args.duration) || 20000;

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

    var createAutoConnectEP = function createAutoConnectEP(provider) {
      var ep = provider.createRtcommEndpoint();
      //ep.on('session:started', function() {});
     // ep.on('session:trying', function() {});
      //ep.on('session:ringing', function() {});
      ep.on('session:alerting', function() {
        ep.accept();
      });
      //ep.on('chat:connected', function() {});
      //ep.on('chat:disconnected', function() {});
      //ep.on('chat:message', function() {});
      return ep;
    };

    var createConnection= function createConnection(EP1,EP2,duration) {
      var dfd = new Deferred();
      var ep1 = createAutoConnectEP(EP1);
      var ep2 = createAutoConnectEP(EP2);

      function failure(message) {
        console.log('>>>> createConnection FAILURE '+message);
        dfd.reject(false);
      }

      ep1.on('session:started', function() {
        // set a timer and wait...
        setTimeout(function(){
          ep1.disconnect();
          dfd.resolve(true);
        },duration);
      });

      ep1.on('session:failed', failure);
      ep2.on('session:failed', failure);

      ep1.connect(EP2.getUserID());
      return dfd.promise;
    };

    var cfg= config.clientConfig1();
    var appContext = 'internChatTest';
    var callers= {};
    var callees= {};
    registerSuite({
        name: 'Stress Test - '+MAX_CONNS,
        setup: function() {
          console.log('*************setup!**************');
          var setupDfd = new Deferred();
          /* init the EndpointProvider */
          var resolved = 0;

          function resolve() {
            if (resolved === 2*MAX_CONNS) {
              console.log('******** Finished Setup '+resolved);
              if (Object.keys(callers).length === MAX_CONNS &&
                  Object.keys(callees).length === MAX_CONNS ) {
                  // Wait 5 seconds to ensure everything is completed.
                  setTimeout(function() {
                    setupDfd.resolve()
                  },5000);;
              } else {
                console.log('CALLERS? '+Object.keys(callers).length);
                console.log('CALLEES? '+Object.keys(callees).length);
                setupDfd.reject("All Callers & Clients not actually created");
              }
            }
          }

          for(var i=0; i<MAX_CONNS; i++) {
            var cfgCaller = config.clientConfig("xxxx-caller-"+i);
            var cfgCallee = config.clientConfig("xxxx-callee-"+i);
            createProvider(cfgCaller, appContext).then(
              function(EP){
                callers[EP.getUserID()] = EP;
                resolved++;
                resolve();
              }, 
              function(error){
                setupDfd.reject(error);
              }
            );
            createProvider(cfgCallee, appContext).then(
              function(EP){
                callees[EP.getUserID()] = EP;
                resolved++;
                resolve();
              },
              function(error){
                setupDfd.reject(error);
              });
          }
          return setupDfd.promise;
        },
        teardown: function() {
          for(var id in callers) {
            callers[id].destroy();
            delete callers[id];
          }
          for(var id in callees) {
            callees[id].destroy();
            delete callees[id];
          }
        },
        beforeEach: function() {
        },
        'stress Test ': function() {
          var callee_ids = Object.keys(callees);
          var i = 0;
          var dfd= this.async(duration+5000);
          var resolved = 0;

          function resolve(success){
            if (success) {
              resolved++;
            } else {
              assert.fail(success, false, "A call failed, failing the test");
              dfd.reject();
            }
            // We are done.
            if (resolved === MAX_CONNS) {
              assert.ok('Passed', 'Everything resolved correctly');
              dfd.resolve();
            } 
          }

          console.log('**** Starting Stress Test (waiting '+duration+') ***********');
          for (var id in callers) {
            createConnection(callers[id],callees[callee_ids[i]], duration).then(resolve, resolve);
            i++;
          };
          return dfd.promise;
        },
    });
});
