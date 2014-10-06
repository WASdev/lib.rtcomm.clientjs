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
          /*
           * Client1
           */
          console.log("*** Creating EndpointProvider1 ***", config1);
          this.np = new rtcomm.RtcommEndpointProvider();
          this.np.setLogLevel('DEBUG');
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
          this.np2.setLogLevel('DEBUG');
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
          this.endpointProvider.setAppContext('test');
        },
        runTest: runTest,
        tearDown: function() {
          console.log("******************TearDown***********************");
          if (this.endpointProvider) {
            console.log('np', this.endpointProvider);
            console.log('np current state', this.endpointProvider.currentState());
            this.endpointProvider.destroy();
            delete this.endpointProvider;
            console.log('Finished destroying 1');
          }
         },
        timeout: timeout
      };
    };

    var p2pFixture2 = function(name, /*boolean*/ direct, /*function*/ runTest, /*integer*/ timeout) {
      return {
        name : "RtcommEnpdointTests [using Server] " + name,
        setUp: function() {
          console.log('********** Setup **************');
          /*
           * Client1
           */
          console.log("*** Creating EndpointProvider1 ***", config1);
          this.endpointProvider1 = new rtcomm.RtcommEndpointProvider();
          this.endpointProvider1.setAppContext('test');
          this.endpointProvider1.setLogLevel('DEBUG');
          this.endpointProvider2 = new rtcomm.RtcommEndpointProvider();
          this.endpointProvider2.setAppContext('test');
          this.endpointProvider2.setLogLevel('DEBUG');
        },
        runTest: runTest,
        tearDown: function() {
          console.log("******************TearDown***********************");
          if (this.endpointProvider1) {
            console.log('np', this.endpointProvider1);
            this.endpointProvider1.destroy();
            delete this.endpointProvider1;
            console.log('Finished destroying 1');
          }
          if (this.endpointProvider2) {
            console.log('np', this.endpointProvider2);
            this.endpointProvider2.destroy();
            delete this.endpointProvider2;
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

    doh.register("FVT RtcommEndpoint", [
      function constructorTest() {
            var np = null;
            console.log('rtcomm: ', rtcomm);
            np = new rtcomm.RtcommEndpointProvider();
            console.log('Np', np);
            doh.assertTrue(np instanceof rtcomm.RtcommEndpointProvider);
            doh.assertTrue(!np.ready);
            np = null;
      },

      new endpointProviderFixture("Endpoint creation(anonymous)", /* direct */ false,
        function() {
          console.log('***************** RunTest ************');
          var deferred = new doh.Deferred();
          var ep = this.endpointProvider.createRtcommEndpoint();
          console.log('TEST endpoint: ', ep);
          var initObj = null;
          var success = false;
          this.endpointProvider.init(config1,
              function(obj) {
                initObj = obj;
                success = true;
              },
              function(error) {
                success = false;
              }
             );
           var self = this;
           // Wait for 'ready'
           setTimeout(deferred.getTestCallback(function() {
              // should be ready, should have a GUEST userid
              console.log('TEST -> userid: ' + ep.userid);
              doh.assertTrue(/^GUEST/.test(ep.userid));
              console.log("TEST => ready: "+ ep);
              doh.assertTrue(ep);
              console.log("TEST => success: "+ success);
              doh.t(success);
              }),
            T1);
            return deferred;
        },
        T2
      ),
     
     new p2pFixture2("in Browser A calls B", /*direct*/ false,
         function() {
            var self = this;
            this.endpointProvider1.setLogLevel('DEBUG');
            this.endpointProvider2.setLogLevel('DEBUG');
            var ep1 = this.endpointProvider1.createRtcommEndpoint({audio:false, video:false, data: false});
            var ep2 = this.endpointProvider2.createRtcommEndpoint({audio:false, video:false, data: false, autoAnswer:true});

            config1.userid='testuser1';
            config2.userid='testuser2';
            setTimeout(function() {
              self.endpointProvider1.init(config1,
                  function(obj) {
                    self.endpointProvider2.init(config2,
                        function(obj) {
                          console.log('calling EP2');
                          ep1.addEndpoint(config2.userid);
                        },
                        function(error) {
                          console.log('error in ep2 init:' + error);
                        }
                       );
                  },
                  function(error) {
                    console.log('error in ep1 init:' + error);
                  }
                 );
            }, T1);

            var deferred = new doh.Deferred();
            setTimeout(deferred.getTestCallback(function() {

               console.log("******************Asserting now...***********************");
               console.log("State of 1: " + ep1.getConnection().getState());
               console.log("State of 2: " + ep2.getConnection().getState());

               doh.assertTrue(ep1.getConnection().getState() === 'STARTED');
               doh.assertTrue(ep2.getConnection().getState() === 'STARTED');
               //  console.log("State of 1: " + self.node1.getConnection().getState());
                // console.log("State of 2: " + self.node2.getConnection().getState());

            }),
            T2+5000);
            return deferred;
         },
         T3+5000
     ),
     new p2pFixture2("in Browser A calls B, pass a Chat Message", /*direct*/ false,
         function() {
            var self = this;
            this.endpointProvider1.setLogLevel('DEBUG');
            this.endpointProvider2.setLogLevel('DEBUG');
            var ep1 = this.endpointProvider1.createRtcommEndpoint({audio:false, video:false, data: false});
            var ep2 = this.endpointProvider2.createRtcommEndpoint({audio:false, video:false, data: false, autoAnswer:true});

            var message1 = null;
            var message2 = null;

            ep1.on('message',  function(event){
              console.log( "******EVENT 1 *******", event);
              message1 = event.message.message;
            });

            ep2.on('message',  function(event){
              console.log( "******EVENT 2 *******", event);
              message1 = event.message.message;
            });

            config1.userid='testuser1';
            config2.userid='testuser2';
            setTimeout(function() {
              self.endpointProvider1.init(config1,
                  function(obj) {
                    self.endpointProvider2.init(config2,
                        function(obj) {
                          console.log('calling EP2');
                          ep1.addEndpoint(config2.userid);
                        },
                        function(error) {
                          console.log('error in ep2 init:' + error);
                        }
                       );
                  },
                  function(error) {
                    console.log('error in ep1 init:' + error);
                  }
                 );
            }, T1);
            
            console.log('Sending HELLO from 2 to 1 ');
            /* Wait 2 seconds to send   */
            setTimeout(function() {
              ep2.send("HELLO");
            },T2);

            var deferred = new doh.Deferred();

            setTimeout(deferred.getTestCallback(function() {

               console.log("******************Asserting now...***********************");
               console.log("State of 1: " + ep1.getConnection().getState());
               console.log("State of 2: " + ep2.getConnection().getState());

               doh.assertTrue(ep1.getConnection().getState() === 'STARTED');
               doh.assertTrue(ep2.getConnection().getState() === 'STARTED');
               doh.assertEqual("HELLO",message1);
               //  console.log("State of 1: " + self.node1.getConnection().getState());
                // console.log("State of 2: " + self.node2.getConnection().getState());

            }),
            T3);
            return deferred;
         },
        T3+5000 
     ),
     new p2pFixture2("Customer A calls Queue[Toys], pass a Chat Message", /*direct*/ false,
         function() {
            var self = this;
            this.endpointProvider1.setLogLevel('DEBUG');
            this.endpointProvider2.setLogLevel('DEBUG');
            var ep1 = this.endpointProvider1.createRtcommEndpoint({audio:false, video:false, data: false});
            var ep2 = this.endpointProvider2.createRtcommEndpoint({audio:false, video:false, data: false, autoAnswer:true});

            var message1 = null;
            var message2 = null;
            var queueid = null;

            ep1.on('message',  function(event){
              console.log( "******EVENT 1 *******", event);
              message1 = event.message.message;
            });

            ep2.on('started', function(event){
              console.log('TEST - Session STARTED, sending HELLO');
              ep2.send("HELLO");
            });

            ep2.on('message',  function(event){
              console.log( "******EVENT 2 *******", event);
              message1 = event.message.message;
            });

            this.endpointProvider2.on('queueupdate',function(queues) {
              console.log('queueupdate!', queues);
              console.log('queueupdate!', Object.keys(queues));
              console.log('queueupdate!', Object.keys(queues)[0]);
              if (queues) {
                queueid = Object.keys(queues)[0];
                self.endpointProvider2.joinQueue(queueid);
              } 
            });
            config2.userid='Agent';
            setTimeout(function() {
              self.endpointProvider1.init(config1,
                  function(obj) {
                    self.endpointProvider2.init(config2,
                        function(obj) {
                          console.log('init was successful');
                        },
                        function(error) {
                          console.log('error in ep2 init:' + error);
                        }
                       );
                  },
                  function(error) {
                    console.log('error in ep1 init:' + error);
                  }
                 );
            }, T1);
            
            console.log('Sending HELLO from 2 to 1 ');
            /* Wait 2 seconds to send   */
            setTimeout(function() {
              console.log('calling EP2');
              ep1.addEndpoint(queueid);
            },T2);

            var deferred = new doh.Deferred();

            setTimeout(deferred.getTestCallback(function() {

               console.log("******************Asserting now...***********************");
               console.log("State of 1: " + ep1.getConnection().getState());
               console.log("State of 2: " + ep2.getConnection().getState());

               doh.assertTrue(ep1.getConnection().getState() === 'STARTED');
               doh.assertTrue(ep2.getConnection().getState() === 'STARTED');
               doh.assertEqual("HELLO",message1);
               //  console.log("State of 1: " + self.node1.getConnection().getState());
                // console.log("State of 2: " + self.node2.getConnection().getState());

            }),
            T3);
            return deferred;
         },
        T3+5000 
     )
   ]);
});
