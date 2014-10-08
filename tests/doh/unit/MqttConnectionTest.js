/*
 * MqttConnection UNITTESTs
 */

define(["doh/runner", "tests/common/config", "ibm/rtcomm/connection"], function(doh, config,connection ){

  dojo.require("lib/mqttws31");
	
	  var badconfig = {
			   server: 1,
			   port: "a",
	};
    var validconfig = { server: "a",
			   port: 1,
			   topicPath: "/rtcomm/"};
    
    doh.register("MqttConnectionUnitTests", [
      { name: "Minimum MqttConnection Configuration Test",
        runTest: function(){
            try {
                var rtcsvc = new connection.MqttConnection();
            } catch(e) {
                doh.assertEqual('MqttConnection instantiation requires a minimum configuration: {"server":"string","port":"number","topicPath":"string"}', e.message);
            }
        }

       },
       { name: "Number as Server in config",
           runTest: function() {
               try {
                   var rtcsvc = new connection.MqttConnection(badconfig);
                   
               } catch(e) {
                   doh.assertEqual('Typeof server is incorrect. number  Should be a string', e.message);
               }
           }

          },
          { name: "String in port config",
              runTest: function(){
           	   // change each to be good as we go down...
            	  badconfig.server = "astring";
                  try {
                    var rtcsvc =new connection.MqttConnection(badconfig);
                  } catch(e) {
                      doh.assertEqual('Typeof port is incorrect. string  Should be a number', e.message);
                  }
              }

          },
         
             { name:"Pass invalid config parameter",
                 runTest: function(){
                 	   // change each to be good as we go down...
                  	  validconfig.junk = "astring";
                        try {
                          var rtcsvc = new connection.MqttConnection(validconfig);
                        } catch(e) {
                            doh.assertEqual('junk is an invalid property for {"server":"a","port":1,"topicPath":"/rtcomm/","credentials":null,"myTopic":null,"defaultTopic":null}', e.message);
                        }
                    },
                    tearDown: function() {
                    	delete validconfig.junk;
                    }

              },
              
              { name:"valid but incorrect config throws an error",
                 runTest: function(){
              	      try {
              	        var rtcsvc = new connection.MqttConnection(validconfig);
                     
                     } catch(e) {
                    	 doh.t(e);
                     }
                 }

             }
             
          

    ]); // End of Tests


});
