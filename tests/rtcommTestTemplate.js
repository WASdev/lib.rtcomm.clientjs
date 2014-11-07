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
], function (registerSuite, assert, Deferred,globals, config, rtcomm) {

    registerSuite({
      name: '[FVT || Unit Tests]  - <classname> ',
      setup: function() {
          console.log('****************** Setup ***********************');
      },
      teardown: function() {
          console.log("******************TearDown***********************");
      },
      beforeEach: function() {
        console.log("***************************** NEW TEST ***************************");
      },
      'test name ': function() {
      }
    });
});
