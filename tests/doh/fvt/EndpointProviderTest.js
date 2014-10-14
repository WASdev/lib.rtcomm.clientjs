define(["doh/runner","dojo/require", "lib/mqttws31" , "tests/common/config","ibm/rtcomm"], function(doh,require,mqtt, config, rtcomm ){
    /*
     * EndpointProvider FVT -- This runs the following tests:
     *
     */
    var config1 = config.clientConfig1();
    // Save and remove the userid from the config.
    var userid1 = config1.userid;
    delete config1.userid;
    // client2 Config
    var config2 = config.clientConfig2();
    // Save and remove the userid from the config.
    var userid2 = config2.userid;
    delete config2.userid;
    // Timings
    var T1 = 5000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 3000; // How long we wait to check results
    var T3 = T2 +3000;  // How long we wait to timeout test.
    /*
     * endpointProviderFixture -- Test Fixture some tests are based on.
     */

    var endpointProviderFixture = function(name, /*boolean*/ direct, /*function*/ runTest, /*integer*/ timeout) {
      return {
        name : "EndpointProvider[using Server] " + name,
        setUp: function() {
          console.log('********** Setup **************');
          /*
           * Client1
           */
          console.log("*** Creating EndpointProvider1 ***", config1);
          this.endpointProvider = new rtcomm.RtcommEndpointProvider();
          this.endpointProvider.setLogLevel('DEBUG');
        },
        runTest: runTest,
        tearDown: function() {
          console.log("******************TearDown***********************");
          if (this.endpointProvider) {
            console.log('np current state', this.endpointProvider.currentState());
            this.endpointProvider.destroy();
            this.endpointProvider = null;
            delete this.endpointProvider;
            console.log('Finished destroying 1');
          }
         },
        timeout: timeout
      };
    };
    // BadConfig (Server is not correct)
    var badConfig = new config._ServerConfig();
    badConfig.userid = "rtc2@ibm.com";
    badConfig.rtcommTopicName = "/WebRTC";
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
     new endpointProviderFixture("init() no userid",  /*direct*/ false,
         function() {
           console.log('********** Run Test ************');
           var deferred = new doh.Deferred();
           var initObj = null;
           var failure = false;
           this.endpointProvider.setLogLevel('DEBUG');
           this.endpointProvider.init(config1,
                function(obj) {
                  initObj = obj;
                },
                function(error) {
                  failure = true;
                }
               );
           var self = this;
           // Wait for 'ready'
           setTimeout(deferred.getTestCallback(function() {
              console.log("*** Asserting *** ", self.endpointProvider.ready);
              // should be ready, should have a GUEST userid
              console.log('TEST -> userid: ' + self.endpointProvider.config.userid);
              doh.assertTrue(/^GUEST/.test(self.endpointProvider.config.userid));
              console.log('TEST -> services: ', self.endpointProvider._private.services);
              doh.assertTrue(self.endpointProvider._private.services);
              console.log('TEST -> ready '+ self.endpointProvider.ready);
              doh.assertTrue(self.endpointProvider.ready);
              }),
            T1);
            return deferred;
        },
        T2
     ),

     new endpointProviderFixture("init() with  userid",  /*direct*/ false,
         function() {
           console.log('********** Run Test ************');
           var deferred = new doh.Deferred();
           var initObj = null;
           var failure = false;
           config1.userid = 'testuser';
           this.endpointProvider.init(config1,
                function(obj) {
                  initObj = obj;
                },
                function(error) {
                  failure = true;
                }
               );
           var self = this;
           // Wait for 'ready'
           setTimeout(deferred.getTestCallback(function() {
              console.log('TEST -> userid: ' + self.endpointProvider.config.userid);
              doh.assertEqual('testuser', self.endpointProvider.config.userid);
              console.log("TEST => ready: "+ self.endpointProvider.ready);
              doh.assertTrue(self.endpointProvider.ready);
              console.log("TEST => failure: "+ failure);
              doh.f(failure);
              console.log("TEST => registered: "+ initObj.registered);
              doh.t(initObj.registered);
              }),
            T1);
            return deferred;
        },
        T2
     ),
     new endpointProviderFixture("init() with  userid and createEndpoint",  /*direct*/ false,
         function() {
           console.log('********** Run Test ************');
           var deferred = new doh.Deferred();
           var initObj = null;
           var failure = false;
           config1.userid = 'testuser';
           config1.createEndpoint= true;
           this.endpointProvider.init(config1,
                function(obj) {
                  initObj = obj;
                },
                function(error) {
                  failure = true;
                }
               );
           var self = this;
           // Wait for 'ready'
           setTimeout(deferred.getTestCallback(function() {
              console.log('TEST -> userid: ' + self.endpointProvider.config.userid);
              doh.assertEqual('testuser', self.endpointProvider.config.userid);
              console.log("TEST => ready: "+ self.endpointProvider.ready);
              doh.assertTrue(self.endpointProvider.ready);
              console.log("TEST => failure: "+ failure);
              doh.f(failure);
              console.log("TEST => registered: "+ initObj.registered);
              doh.t(initObj.registered);
              console.log("TEST => endpoint: "+ initObj.endpoint.id);
              console.log("TEST => endpoint: ", initObj.endpoint);
              doh.t(initObj.endpoint);
              console.log("TEST => endpointlist: "+ self.endpointProvider.endpoints());
              doh.t(self.endpointProvider.endpoints().length === 1);
              }),
            T1);
            return deferred;
        },
        T2
     ),
     new endpointProviderFixture("Queues ",  /*direct*/ false,
         function() {
           console.log('********** Run Test ************');
           var deferred = new doh.Deferred();
           var initObj = null;
           var failure = false;
           config1.userid = 'testuser';
           this.endpointProvider.init(config1,
                function(obj) {
                  initObj = obj;
                },
                function(error) {
                  failure = true;
                }
               );
           var self = this;
           // Wait for 'ready'
           setTimeout(deferred.getTestCallback(function() {
              console.log('TEST -> Queues: ' + self.endpointProvider.listQueues());
              doh.t(self.endpointProvider.listQueues().length > 0);
              }),
            T1);
            return deferred;
        },
        T2
     ),
     /**
      * This test uses an incorrect/unavailable MQTT Server
      *  This is commented out as it leaves a Hung session due to 
      *  disconnect while connecting.  It is a bug in the mqtt client.
      */
//     { name: "MQTT Server Unavailable/Incorrect test",
//       setUp: function() {
//                this.endpointProvider = new rtcomm.RtcommEndpointProvider();
//                this.endpointProvider.setLogLevel('DEBUG');
//                },
//          runTest: function() {
//            var deferred = new doh.Deferred();
//            this.endpointProvider.init(badConfig);
//            var self = this;
//            setTimeout(deferred.getTestCallback(function() {
//                 doh.assertTrue(!self.endpointProvider.ready);
//                 }),
//            T1);
//            return deferred;
//         },
//         tearDown: function() {
//        	 this.endpointProvider.destroy();
//           this.endpoinProvider = null;
//           delete this.endpointProvider;
//         },
//
//         timeout: T2// 1 second timeout
//     }
   ]);
});
