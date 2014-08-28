define(["doh/runner","dojo/require", "lib/mqttws31" , "tests/common/config","ibm/rtcomm"], function(doh,require,mqtt, config, rtcomm ){
    /*
     * EndpointProvider FVT -- This runs the following tests:
     * 
     */
    
    var config1 = config.clientConfig1();
    // client2 Config
    var config2 = config.clientConfig2();
    // Timings 
    var T1 = 5000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 3000; // How long we wait to check results
    var T3 = T2 +3000;  // How long we wait to timeout test.
    
    /*
     * p2pFixture -- Test Fixture some tests are based on.
     */
    var p2pFixture = function(name, /*boolean*/ direct, /*function*/ runTest, /*integer*/ timeout) {
      return {
        name : "P2P Server " + name,
        setUp: function() {
          /*
           * This creates TWO EndpointProvider objects that
           * we connect together by swapping their ServiceTopics
           * 
           * There is no liberty RTCOMM Signaling Endpoint on the back end expected.
           * 
           * if 'direct' = true, then we will create it to each other.
           * 
           */
          console.log('setup of p2pFixture called');
          this.direct = direct;
          
          if (!direct) {
            config1.register=false;
            config2.register=false;
            config1.createEndpoint=false;
            config2.createEndpoint=false;
            
          } 
      
          /*
           * Client1 
           */
          console.log("*** Creating EndpointProvider1 ***", config1);
          this.np = new rtcomm.RtcommEndpointProvider();
          this.np.setLogLevel('INFO');
          this.np.init(config1, /*onSuccess*/ function() {
            console.log("node provider 1 initialized", this);
            // If we get an rtcommEndpoint back, assign it.  
            if (this.direct) {
              try {
                this.np2._t.setServiceTopic(this.np.clientid);
              } catch(e){
                console.error(e);
              }
            }
           
          }.bind(this));
         
          /*
           * Client2
           * 
           */
          console.log("*** Creating EndpointProvider2 ***", config2);
          this.np2 = new rtcomm.RtcommEndpointProvider();
          this.np2.setLogLevel('INFO');
          this.np2.init(config2, 
           /* onSuccess */ function() {
            if (this.direct) {
              try {
                this.np._t.setServiceTopic(this.np2.clientid);
              } catch(e){
                console.error(e);
              }
            }
            console.log("node provider 2 initialized ", this);
         }.bind(this)
         );
          
         // Creating NODES this w/ no avd.
         this.node1 = this.np.createRtcommEndpoint({appContext: "audiovideo", audio:false, video:false,data:false});
         console.log("HUB1:", this.node1);
        
         this.node2 =  this.np2.createRtcommEndpoint({appContext: "audiovideo", audio:false, video:false,data:false, autoAnswer: true });
         console.log("HUB2:", this.node2); 
         
        },
        runTest: runTest,
        tearDown: function() {
          console.log("******************TearDown***********************");
          console.log('THIS in TearDown: ', this);
          console.log('np', this.np);
          if (this.np) {
            console.log('np', this.np);
            console.log('np current state', this.np.currentState());
            this.np.destroy();
            delete this.np;
            delete this.node1;
            console.log('Finished destroying 1');
          }
          console.log('np2', this.np2);
          if (this.np2) {
            console.log('np2', this.np2);
            console.log('np2', this.np2.currentState());
            this.np2.destroy();
            delete this.np2;
            delete this.node2;
            console.log('Finished destroying 2');
          }
          console.log('THIS after TearDown: ', this);
         },
        timeout: timeout
      };
    };
    
    
    
    // BadConfig (Server is not correct)
    var badConfig = new config._ServerConfig();
    badConfig.userid = "rtc2@ibm.com";
    badConfig.connectorTopicName = "/WebRTC";
    badConfig.server="9.4.8.23" ;

    
    /*
     *  Start of FVT for EndpointProvider
     */
    
    doh.register("FVT EndpointProvider ", [
      function constructorTest() {
            var np = null;
            console.log('rtcomm: ', rtcomm);
            np = new rtcomm.RtcommEndpointProvider();
            console.log('Np', np);
            doh.assertTrue(np instanceof rtcomm.RtcommEndpointProvider);
            doh.assertTrue(!np.ready);
            np = null;
      },
      /**
       *  This test creates a EndpointProvider and calls init() on it. 
       *  
       */
      { name: "simple init() of goodConfigTest",
        setUp: function() {
              console.log('*** Starting test: '+this.name);
                this.np = new rtcomm.RtcommEndpointProvider();
                console.log('Using np: ', this.np);
                this.np.setLogLevel('DEBUG');
                console.log('Using np: ', this.np);
                },
        runTest: function() {
            var deferred = new doh.Deferred();
            this.np.init(config1);
            var self = this;
            // Wait for 'ready' 
            setTimeout(deferred.getTestCallback(function() {
                  console.log("*** Asserting *** ", self.np.ready);
                  doh.assertTrue(self.np.ready);
               }),
            T1);
            return deferred;
        },
        tearDown: function() {
          console.log("Teardown Called!");
          try {
            this.np.destroy();
          } catch(e) {
            console.error("Destroy failed...", e)
          }
        	 delete this.np;
        },
        timeout: T2
      },
     { name: "init() of goodConfigTest with register()",
       setUp: function() {
               this.np = new rtcomm.RtcommEndpointProvider();
               this.np.setLogLevel('DEBUG');
               },
       runTest: function() {
           var deferred = new doh.Deferred();
           config1.register = true;
           var success = false;
           this.np.init(config1, 
               /*onSuccess*/ function(obj){
                 success = obj.registered;
               });
           
           var self = this;
           // Wait for 'ready' 
           setTimeout(deferred.getTestCallback(function() {
                 console.log("*** Asserting *** ready ", self.np.ready);
                 doh.assertTrue(self.np.ready);
                 console.log("*** Asserting *** registered ",success);
                 doh.assertTrue(success);
              }),
           T1);
           return deferred;
       },
       tearDown: function() {
         console.log("Teardown Called!");
         try {
           this.np.destroy();
         } catch(e) {
           console.error("Destroy failed...", e)
         }
          delete this.np;
       },
       timeout: T2
    },
     /**
      * This test uses an incorrect/unavailable MQTT Server 
      * 
      */
     { name: "MQTT Server Unavailable/Incorrect test",
       setUp: function() {
                this.np = new rtcomm.RtcommEndpointProvider();
                this.np.setLogLevel('DEBUG');
                },
          runTest: function() {
            var deferred = new doh.Deferred();
            this.np.init(badConfig);
            var self = this;
            setTimeout(deferred.getTestCallback(function() {
                 doh.assertTrue(!self.np.ready)
                 }),
            T1);
            return deferred;
         },

         tearDown: function() {
        	 this.np.destroy();
             delete this.np;
         },

         timeout: T2// 1 second timeout
     },
     // Should fail until we start testing with the actual Service.
     new p2pFixture("Register",  /*direct*/ false,  
         function() {
           console.log('********** Run Test ************');
            var self = this;
            var user1 = this.np.userid;
            var user2 = this.np2.userid;
            var SUCCESS= false;
            /* Wait 1 second to 'createConnection' */
            setTimeout(function() {
              try {
                self.np.register('audiovideo',
                    /*onSuccess*/ function(message) {
                      console.log('register onSuccess message:', message);
                      SUCCESS=true;
                    },
                    /*onFailure*/ function(error){
                      console.log('register Failed: ', error);
                      SUCCESS=false;
                    });
              } catch(e) {
                console.log(e);
                self.error = e;
              }
            },T1);
            var deferred = new doh.Deferred();
            setTimeout(deferred.getTestCallback(function() {
                 doh.t(SUCCESS);
                 }),
            T2);
            return deferred;
         },
         T3
     ),
     new p2pFixture("in Browser A calls B", /*direct*/ false,
         function() {
            var self = this;
            var user1 = this.np.userid;
            var user2 = this.np2.userid;
            console.log('userid1: ', user1);
            console.log('userid2: ', user2);
            this.np.setLogLevel('TRACE');
            this.np2.setLogLevel = ('TRACE');
            /* Wait 1 second to 'createConnection' */
            
            console.log('calling register... ');
           
            setTimeout(function() {
              console.log("************** REGISTERING 2 ***************");
              self.np2.register('audiovideo', function() {
                console.log('*** Register of 2 succeeded');
                console.log("************** Connecting 1 to 2 ***************");
                self.np.register(
                    'audiovideo',
                    function() {
                      console.log('*** Register of 1 succeeded');
                      try{
                        self.node1.addEndpoint(user2);
                      } catch(e) {
                        console.error('addEndpoint failed', e);
                        console.log(e);
                      }
                    });
              });
            },T1);
            var deferred = new doh.Deferred();
            setTimeout(deferred.getTestCallback(function() {
          
               console.log("******************Asserting now...***********************");
               console.log("State of 1: " + self.node1.getConnection().getState());
               console.log("State of 2: " + self.node2.getConnection().getState());
               
                 doh.assertTrue(self.node1.getConnection().getState() === 'STARTED');
                 doh.assertTrue(self.node2.getConnection().getState() === 'STARTED');
               //  console.log("State of 1: " + self.node1.getConnection().getState());
                // console.log("State of 2: " + self.node2.getConnection().getState());
       
            }),
            T2+5000);
            return deferred;
         },
         T3+5000
     ),
     new p2pFixture("Pass a Message over the Signaling Session",/*direct*/ false,
         function() {
            var self = this;
            var user1 = this.np.userid;
            var user2 = this.np2.userid;
            
            var message1 = null;
            var message2 = null;
            
            this.node1.on('message',  function(event){
              console.log( "******EVENT 1 *******", event);
              message1 = event.message.message;
            });
            
            setTimeout(function() {
              console.log("************** REGISTERING 2 ***************");
              self.np2.register('audiovideo', function() {
                console.log('*** Register of 2 succeeded');
                console.log("************** Connecting 1 to 2 ***************");
                self.np.register(
                    'audiovideo',
                    function() {
                  console.log('*** Register of 1 succeeded');
                  try{
                    self.node1.addEndpoint(user2);
                  } catch(e) {
                    console.error('addEndpoint failed', e);
                    console.log(e);
                  }
              });
            });
            },T1);
           
            this.node2.on('message', function(event){
              console.log( "******EVENT 2 *******", event);
               message2 = event.message.message;
            });
            console.log('Sending HELLO from 2 to 1 ')
            /* Wait 2 seconds to send   */
            setTimeout(function() {
              self.node2.conn.send("HELLO");
            },T2);
            
            var deferred = new doh.Deferred();
            setTimeout(deferred.getTestCallback(function() {
              
              doh.assertTrue(self.node1.getConnection().getState() === 'STARTED');
              doh.assertTrue(self.node2.getConnection().getState() === 'STARTED');
         
                  doh.assertEqual("HELLO",message1);
                 }),
           T3);
            return deferred;
         },
         T3+1000
     )
     
    
   ]);
});
