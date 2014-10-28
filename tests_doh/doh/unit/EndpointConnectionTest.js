define(["doh/runner", "tests/common/config","ibm/rtcomm/connection"], function(doh, config, connection){
  
    /* if (config.IBMRTC_TEST_TYPE && config.IBMRTC_TEST_TYPE === 'build') {
        console.log(' Using Build...');
        dojo.require("ibmrtc/ibmrtc");
        console.log(ibmrtc);
        var rtcomm = ibmrtc.rtcomm;
      } else {
      
      }   
      */

   dojo.require("lib/mqttws31");
   var config1 = config.clientConfig1();
    
  
    var messageTestFixture = function(name, /*function*/ runTest ) {
      return {
        name : "MessageFactory " + name,
        setUp: function() {
          this.mf = connection.MessageFactory;
        },
        runTest: runTest,
        tearDown: function() {
          this.mf = null;
        }
        };
      };
      
      doh.register("NodeConnectionUnitTests", [
    
      function assertTrueTest(){
        doh.assertTrue(true);
        doh.assertTrue(1);
        doh.assertTrue(!false);
      }, 

      function logLevelTest() {
        var conn = new connection.EndpointConnection(config1);
        console.log(conn);
        var d1 = conn.getLogLevel();
        conn.setLogLevel('DEBUG');
        doh.t(conn._l('DEBUG'));
      },

      function lwtConfigTest() {
        var conn = new connection.EndpointConnection(config1);
        console.log(conn);
        console.log(config1);
        var expectedLwtTopic = config1.topicPath+'lwt/'+config1.userid;
        var lwtTopic = conn.getLwtTopic();
        var lwtMessage = conn.getLwtMessage();
        console.log('TEST --> lwtTopic '+lwtTopic);
        doh.assertEqual(expectedLwtTopic, lwtTopic);
        console.log('TEST --> lwtMessage: ',lwtMessage);
        doh.assertEqual('LAST_WILL', lwtMessage.method);
        doh.assertEqual('v0.2.0', lwtMessage.rtcommVer);

        //doh.t(lwtMessage);
      }
               // doh.assertEqual("RtcService", this.thingerToTest.toString());
        //  doh.assertFalse(this.thingerToTest.falseProp);
        // ...
    ]);
});
