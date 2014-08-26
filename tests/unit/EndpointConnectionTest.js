define(["doh/runner", "tests/common/config","ibm/rtcomm/connection"], function(doh, config, connection){
  
    /* if (config.IBMRTC_TEST_TYPE && config.IBMRTC_TEST_TYPE === 'build') {
        console.log(' Using Build...');
        dojo.require("ibmrtc/ibmrtc");
        console.log(ibmrtc);
        var rtcomm = ibmrtc.rtcomm;
      } else {
      
      }   
      */
  
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
      }
     
               // doh.assertEqual("RtcService", this.thingerToTest.toString());
        //  doh.assertFalse(this.thingerToTest.falseProp);
        // ...
    ]);
});
