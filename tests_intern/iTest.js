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
    'intern/dojo/node!./mock/rtcomm_node',
    'ibm/rtcomm'
], function (registerSuite, assert, globals, rtcomm) {
    var ep = null;

    registerSuite({
        name: 'EndpointProvider Tests',
        setup: function() {
          ep = new rtcomm.RtcommEndpointProvider();
          ep.setLogLevel('DEBUG');
        },
        teardown: function() {
          ep.destroy();
          ep = null;
        },
        'init': function () {
          var dfd = this.async(5000);
          config.userid = 'scott';
          config.register = true;
          var error;
          var finish = dfd.callback( function(obj) {
            assert.isTrue(obj.ready, "The endpointConnection is ready");
            assert.isTrue(obj.registered, "The endpoint is registered");
            assert.isTrue(obj.endpoint.registered, "The endpoint is registered");

            assert.equal(1, Object.keys(ep.endpoints()).length, 'There is only one endpoint');
            console.log('Callback called!');
          });   
          try {
            console.log('INITIALIZING PROVIDER');
            ep.init(config, 
              function(object) {
                console.log('SUCCESS!!!!!!!!!!!!!!!!!',object);
                finish(object);
              }, function(e) {
                error = e
              });
          } catch(e) {
            error=e;
            console.log(error);
          }

//          assert.equal(error.message, 'RtcommEndpointProvider initialization requires a minimum configuration: {"server":"string","port":"number","userid":"string"}');
        },
        'createRtcommEndpoint': function() {
            var endpoint=ep.createRtcommEndpoint();
          //  console.log(endpoint);
        }

    });
});
