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

var config= {server: 'svt-msd4.rtp.raleigh.ibm.com', port: 1883, topicPath: '/rtcommscott/' };

define([
    'intern!object',
    'intern/chai!assert',
    'intern/node_modules/dojo/Deferred',
    'intern/dojo/node!./mock/rtcomm_node',
    'ibm/rtcomm'
], function (registerSuite, assert, Deferred, globals, rtcomm) {
    var ep = null;
    var mq1 = null;
    var mq2 = null;
    var globals = null;

    var mqttPublish = function(topic, message, ms) {
      // publish 'message' from mq1 to mq2 on topic
      // pass means we expect it to work or not.
      ms = ms || 1000;
      var dfd = new Deferred();
      var msgrecv1 = null;
      var msgrecv2 = null;
      // Wait to publish 
      setTimeout(function() {
        mq1.on('message', function(msg) {
          console.log('MQ1 Received Message: '+msg.content);
          // Should not receive message;
          dfd.resolve(false);
        });
        mq2.on('message', function(msg) {
          console.log('MQ2 Received Message: '+msg.content);
          if (msg.content === message) { 
            // Should not receive message;
            dfd.resolve(true);
          } else {
            console.log('Received Weird Message:' + msg.content);
            dfd.resolve(false);
          }
        });
        mq1.publish(topic, message);
      }, ms);

      setTimeout(function() {
        dfd.resolve(false);
      },ms+1000);
      return dfd.promise;
    };

    registerSuite({
        name: 'MqttEndpoint Tests',
        setup: function() {
          var dfd=new Deferred();
          console.log('*************setup!**************');
          config.userid = 'scott';
          /* init the EndpointProvider */
          ep = new rtcomm.RtcommEndpointProvider();
          ep.init(config, function(obj) {
            console.log('*** Creating MqttEndpoints ***');
            mq1 = ep.createMqttEndpoint();
            mq2 = ep.createMqttEndpoint();
            mq1.subscribe('/test1');
            mq2.subscribe('/test2/#');
            console.log('*** mq1 ***', mq1);
            dfd.resolve();
          }, function(error){
            dfd.reject(error);
          });
          ep.setLogLevel('DEBUG');
          /* Create the Mqtt Endpoints */
          return dfd.promise;
        },
        teardown: function() {
          ep.destroy();
          ep = null;
        },
        'mqtt /test2 topic':function() {
          var dfd = this.async(3000);
          mqttPublish('/test2', '1 - Hello from 1').then(
             dfd.callback(function(pass) {
                assert.isTrue(pass,'messsage was received');
              })
           );
        },
        'mqtt /test3 topic':function() {
          this.skip();
          var dfd = this.async(3000);
          mqttPublish('/test3', '2 - Hello from 1').then(
             dfd.callback(function(pass) {
                assert.isFalse(pass,'Message should not be received');
              })
           );
        },
        'mqtt /test2/something topic':function() {
          this.skip();
          var dfd = this.async(3000);
          mqttPublish('/test2/something', '3 - Hello from 1').then(
             dfd.callback(function(pass) {
                assert.isTrue(pass,'Message should be received');
              })
           );
        },
        'mqtt /test2something topic':function() {
          this.skip();
          var dfd = this.async(3000);
          mqttPublish('/test2something', '4 - Hello from 1').then(
             dfd.callback(function(pass) {
                assert.isFalse(pass,'Message should not be received');
              })
           );
        },
        'mqtt /test2something -> /test2 topic':function() {
          this.skip();
          var dfd = this.async(3000);
          // Overwrite the mq2 stuff (clean out, start over);
          mq2 = null;
          mq2 = ep.createMqttEndpoint();
          mq2.subscribe('/test2');
          mqttPublish('/test2something', '5 - Hello from 1').then(
             dfd.callback(function(pass) {
                assert.isFalse(pass,'Message should not be received');
              })
           );
        },
        
        'mqtt /test2/something -> /test2 topic':function() {
          this.skip();
          var dfd = this.async(3000);
          // Overwrite the mq2 stuff (clean out, start over);
          mq2 = null;
          mq2 = ep.createMqttEndpoint();
          mq2.subscribe('/test2');
          mqttPublish('/test2/something', '6 - Hello from 1').then(
             dfd.callback(function(pass) {
                assert.isFalse(pass,'Message should not be received');
              })
           );
        },
        'mqtt Test 1': function () {
          this.skip();
          var self = this;
          var dfd= this.async(5000);
          var error;
          var start = function(ms) {
            console.log('Starting!');
            var startDfd = self.async();
            setTimeout(function() {
              mq1.publish('/test3', msgtosend1);
              startDfd.resolve();
            }, ms || 1000);
            return startDfd.promise;
          };

          // call when complete.
          var finish = dfd.callback(function(obj){
                console.log('Asserting...');
                assert.equal(msgrecv2.content, msgtosend1, '/test2 received correctly');
          });
          start(2000).then(finish);
        }
    });
});
