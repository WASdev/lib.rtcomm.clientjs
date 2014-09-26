define(["doh/runner", "lib/mqttws31", "tests/common/config", "ibm/rtcomm/connection"], function(doh, mqtt, config,connection){

  // MQTT ServerConfig
  // client1 Config
    var config1 = config.clientConfig1();
    delete config1.rtcommTopicName;
    // client2 Config
    var config2 = config.clientConfig2();
    delete config2.rtcommTopicName;
    
    console.log('CONFIG 1', config1);
    console.log('CONFIG 2', config2);
    
    var T1 = 5000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 2000; // How long we wait to check results
    var T3 = T2 +2000;  // How long we wait to timeout test.

    doh.register("MqttConnection", [
       { name: "Send and Receive a Simple Message via the RtcService [without rtcomm]",
         setUp: function() {
             var self = this;
            // this.client1 = Object.create(connection.MqttConnection);
            // this.client1.init(config1);
             this.client1 = new connection.MqttConnection(config1);
             this.client1.on('message', function(message) {
                console.log('Client1 received message: ', message);
                 self.message1 = message;
             });
             this.client1.connect();
             //this.client2 = Object.create(connection.MqttConnection);
             // this.client2.init(config2);
             this.client2 = new connection.MqttConnection(config2);
             this.client2.on('message', function(message){
               console.log('Client2 received message: ', message);
                 self.message2 = message;
             });
             this.client2.connect();
         },
         runTest: function() {
             this.msg1 = "Hello from client1";
             this.msg2 = "Hello from client2";
             var deferred = new doh.Deferred();
             var self = this;

             // Wait 2 seconds to ensure client is appropriately created, send the message

             setTimeout( function() {
              // 2 sends message to 1
              self.client2.send({message: self.msg2, toTopic: self.client1.id}, 1000);
              // 1 sends message to 2
              self.client1.send({message: self.msg1, toTopic: self.client2.id},1000);
             }, T1);

             // Wait 6 seconds to confirm message is there, this is a bit of overkill I think.
             setTimeout(deferred.getTestCallback(function() {
               console.log('self.msg1', self.msg1);
               console.log('self.msg2', self.msg2);
               console.log('self.message1', self.message1);
               console.log('self.message2', self.message2);
               // Ensure fromEndpointID is correct:
               doh.assertEqual(self.client2.config.userid, self.message1.fromEndpointID);
               doh.assertEqual(self.client1.config.userid, self.message2.fromEndpointID);
               doh.assertEqual(null, self.message1.topic);
               doh.assertEqual(null, self.message2.topic);
               doh.assertEqual(self.msg2.toString(), self.message1.content.toString());
               doh.assertEqual(self.msg1.toString(), self.message2.content.toString());
             }),T2);
             return deferred;
         },

         tearDown: function() {
             delete this.msg1;
             delete this.msg2;
             delete this.message1;
             delete this.message2;
             this.client1.destroy();
             delete this.client1;
             this.client2.destroy();
             delete this.client2;
         },
        
         timeout: T3
       }
    ]); // End of Tests
  console.log('End of Tests');
});
