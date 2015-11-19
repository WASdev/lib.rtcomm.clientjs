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
   var suiteName = Fat.createSuiteName("FVT: SomeSuiteName");
   var DEBUG = (intern.args.DEBUG === 'true')? true: false;

    registerSuite({
      name: suiteName,
      setup: function() {
          console.log('****************** SETUP: '+this.name+' ***********************');
      },
      teardown: function() {
          console.log('****************** TearDown: '+this.name+'***********************');
      },
      beforeEach: function() {
      },
      'test name ': function() {
        console.log('***************************** '+this.name+' ***************************');
      }
    });
});
