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

var config= {server: 'svt-msd1.rtp.raleigh.ibm.com', port: 1883, connectorTopicPath: '/rtcommfvt/' };
define([
    'intern!object',
    'intern/chai!assert',
//    './mock/mqttws31_shim.js',
//    'lib/mqttws31'
], function (registerSuite, assert) {
    if (typeof window === 'undefined' && global) {
      require(['intern/dojo/node!./tests_intern/mock/rtcomm_node'], function(globals) {
        console.log('globals returned: ', globals);
      });
    }
    var ep = null;
    registerSuite({
        name: 'hello',
        'Paho exists': function () {
          console.log('************ Paho **************', Paho);
          console.log(typeof Paho);
          assert.isObject(Paho);
        }
    });
});
