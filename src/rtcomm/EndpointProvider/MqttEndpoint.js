/*
 * Copyright 2014,2015 IBM Corp.
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
 */
/**
 *  @memberof module:rtcomm
 *  @description
 *  This object should only be created with the {@link module:rtcomm.EndpointProvider#getMqttEndpoint|getRtcommEndpoint} function.
 *  <p>
 *  The MqttEndpoint object provides an interface to directly subscribe and publish MQTT messages.
 *
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
 */
var MqttEndpoint = function MqttEndpoint(config) {

  this.dependencies = { 
    connection: null,
  };
  /* Object storing subscriptions */ 
  this.subscriptions = {};
  this.dependencies.connection = config && config.connection;
  this.events = {'message': []};
};
/*global util:false*/
/*global: l:false*/
MqttEndpoint.prototype = util.RtcommBaseObject.extend(
  /** @lends module:rtcomm.MqttEndpoint.prototype */
  {
  /** 
   * subscribe to a topic
   * @param {string} topic - A string that represents an MQTT topic
   */
  subscribe: function(topic) {
               // Add it
               this.subscriptions[topic] = null;
               var mqttEP = this;
               mqttEP.dependencies.connection.subscribe(topic, function(message) {
                 l('DEBUG') && console.log('MqttEndpoint.subscribe() Received message['+message+'] on topic: '+topic);
                 mqttEP.emit('message', message);
               });
             },

  /** 
   * unsubscribe from  a topic
   * @param {string} topic - A string that represents an MQTT topic
   */
  unsubscribe: function(topic) {
               var mqttEP = this;
               if (this.subscriptions.hasOwnProperty(topic)) {
                 delete this.subscriptions[topic];
                 mqttEP.dependencies.connection.unsubscribe(topic);
               } else {
                 throw new Error("Topic not found:"+topic);
               }
             },
  /** 
   * publish a message to topic
   * @param {string} topic - A string that represents an MQTT topic
   * @param {string} message - a String that is a message to be published
   */
  publish: function(topic,message) {
             this.dependencies.connection.publish(topic, message);
  },
  /** 
   * Destroy the MqttEndpoint
   */
  destroy: function() {
     l('DEBUG') &&  console.log('Destroying mqtt(unsubscribing everything... ');
             var mqttEP = this;
             Object.keys(this.subscriptions).forEach( function(key) {
               mqttEP.unsubscribe(key);
             });
           }
});
