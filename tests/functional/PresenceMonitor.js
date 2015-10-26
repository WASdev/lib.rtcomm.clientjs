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
    /* Use the Mock (in browser mqtt) */
   (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../../support/mqttws31_shim':
        'bower_components/bower-mqttws/mqttws31',
    'support/config',
    'bower_components/webrtc-adapter/adapter',
    'umd/rtcomm/EndpointProvider'
], function (intern, registerSuite, assert, Deferred, globals,config, adapter, EndpointProvider) {
  var DEBUG = (intern.args.DEBUG === 'true')? true: false;


  /*
   * Create a Mock message, needs to look like:
   * {topic: where the message was received,
   *  content: a DOCUMENT message
   *  fromEndpointID: ....
   * 
   */
  var createPresenceMessage = function(id) {
    /*
     * rtcommVer: "v1.0.0", 
     * method: "DOCUMENT", fromTopic: null, 
     * type: "ENDPOINT", 
     * addressTopic: "/rtcomm-scottgraham/QOU0S5O0QKA7X3ENVHKXAK"
     * alias: null
     * appContext: "default"
     * fromEndpointID: "scott123"
     * fromTopic: null
     * method: "DOCUMENT"
     * rtcommVer: "v1.0.0"state: "available"type: "ENDPOINT"userDefines: Array[0]__proto__: Object
    */

    var DOCUMENT = {
      'rtcommVer': 'v1.0.0',
      'method': 'DOCUMENT',
      'type': 'ENDPOINT',
      'addressTopic':null,
      'appContext':null,
      'state': 'available',
      'alias': null,
      'userDefines':[]
    };
    var rootTopic = config.clientConfig().rtcommTopicPath; 
    DOCUMENT.appContext = 'interntest';
    DOCUMENT.addressTopic = rootTopic + 'clients/'+ id;

    return {
      topic: rootTopic + "sphere/default/" +  id,
      content: DOCUMENT,
     }
  };

  var endpointProvider = null;
  var mockLength = 10;
  var presenceMonitor = null;

  registerSuite({
    name: "Unit Tests - PresenceMonitor",
    beforeEach: function() {
     console.log('******** Running Test *********');
    },
    setup: function() {
      var dfd = new Deferred();
      endpointProvider = new EndpointProvider()
      endpointProvider.setLogLevel('TRACE');
      var cfg = config.clientConfig();
      cfg.requireRtcommServer = false;
      endpointProvider.init(cfg, function(obj) {
        console.log('****** Setup complete? **********', obj);
        dfd.resolve();
      }, function(error) {
        console.log('INIT FAILED');
        dfd.reject(error);
      });
      return dfd.promise;
    },
    teardown: function() {
      endpointProvider.destroy();
    },
    "Load and validate PresenceMonitor data": function() {
        presenceMonitor = endpointProvider.getPresenceMonitor();
        var mockData = [];
        for (var i=0;i<mockLength; i++) {
          var m = createPresenceMessage('mockid-'+i);
          mockData.push(m);
        };
        console.log('loading mockdata');
        presenceMonitor._loadMockData(mockData);
        console.log("-------> PresenceMonitor", presenceMonitor);
        // Always use the 0 data...
        var data = presenceMonitor.getPresenceData()[0];
        var f = data.flatten();
        assert.equal(f.length, mockLength, 'loaded data correctly');
    },
    "findNodeByName": function() {
        var data=presenceMonitor.getPresenceData()[0];
        console.log('data is?', data);

        var node = data.findNodeByName('mockid-1');
        assert.isObject(node, 'Found a PresenceNode Object');
        assert.equal(node.name, 'mockid-1', 'Found CORRECT PresenceNode Object');
    }
  });
});
