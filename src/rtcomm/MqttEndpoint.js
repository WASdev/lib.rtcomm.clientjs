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
MqttEndpoint.prototype = util.RtcommBaseObject.extend({
  subscribe: function(topic) {
               // Add it
               this.subscriptions[topic] = null;
               var mqttEP = this;
               mqttEP.dependencies.connection.subscribe(topic, function(message) {
                 l('DEBUG') && console.log('MqttEndpoint.subscribe() Received message['+message+'] on topic: '+topic);
                 mqttEP.emit('message', message);
               });
             },

  unsubscribe: function(topic) {
               var mqttEP = this;
               if (this.subscriptions.hasOwnProperty(topic)) {
                 delete this.subscriptions[topic];
                 mqttEP.dependencies.connection.unsubscribe(topic);
               } else {
                 throw new Error("Topic not found:"+topic);
               }
             },
  publish: function(topic,message) {
             this.dependencies.connection.publish(topic, message);
  },
  destroy: function() {
      console.log('Destroying mqtt(unsubscribing everything... ');
             var mqttEP = this;
             Object.keys(this.subscriptions).forEach( function(key) {
               mqttEP.unsubscribe(key);
             });
           }
});
