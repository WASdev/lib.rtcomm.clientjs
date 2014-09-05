define(["doh/runner", "lib/mqttws31", "tests/common/config", "ibm/rtcomm"], function(doh,mqtt,config,rtcomm ){

  var badconfig = {
      server: 1,
      port: "a",
      userid: 1,
      connectorTopicName: {}
  };
  var validconfig = { server: "a",
      port: 1,
      userid: "someuser",
      connectorTopicName: "sometopic"};
  // define a subclass of the Fixture class
  
  console.log('Test Loaded');

  var TestFixture = function(name, runTest) {
    return {
      name : name,
      setUp: function() {
        console.log('******** Running Test '+this.name+' *********');
        this.endpointProvider = new rtcomm.RtcommEndpointProvider();
      },
      runTest: runTest,
      tearDown: function() {
        delete this.endpointProvider;
      }
    };
  };

  doh.register("rtcomm.RtcommEndpointProviderUnitTests", 
      [ new TestFixture("empty config for init()", function() {
        var error = null;
        try {
          console.log('INITIALIZING PROVIDER');
          this.endpointProvider.init();
        } catch(e) {
          error = e;
          console.log(error);
        }
        doh.assertEqual('RtcommEndpointProvider initialization requires a minimum configuration: {"server":"string","port":"number","userid":"string"}', error.message);
      }),
      new TestFixture(
          "valid but incorrect config throws an error",
          function(){
            var error = null;
            try {
              this.endpointProvider.init(validconfig);
            } catch(e) {
              error = e;
              console.log(error);
            }
            doh.t(error);
          }
      ),
      new TestFixture(
          "createRtcommEndpoint() returns valid object",
          function(){
            var error = null;
            try {
              var rtc = this.endpointProvider.createRtcommEndpoint();
            }  catch(e) {
              console.log(e);
              error = e;
            }
            doh.f(error);
            doh.t(this.endpointProvider.defaultRtcommEndpoint);
            doh.t(rtc);
            console.log(this.endpointProvider.currentState());
        }
      ),    
      new TestFixture(
          "createRtcommEndpoint() - create multiple objects sets default.",
          function(){
            var error = null;
            try {
              var rtc = this.endpointProvider.createRtcommEndpoint();
              var rtc2 = this.endpointProvider.createRtcommEndpoint();
            }  catch(e) {
              console.log(e);
              error = e;
            }

            doh.t(rtc);
            doh.t(rtc2);

            doh.f(error);
            doh.assertEqual(rtc,  this.endpointProvider.defaultRtcommEndpoint);
            console.log(this.endpointProvider.currentState());
          }
      ),    
      new TestFixture(
          "createRtcommEndpoint() - create w/ same audio/video/data and different context works",
          function(){
            var error = null;
            this.endpointProvider.setLogLevel('DEBUG');
            try {
              var rtc = this.endpointProvider.createRtcommEndpoint();
              var rtc2 = this.endpointProvider.createRtcommEndpoint({appContext: 'test'});
            }  catch(e) {
              console.log(e);
              error = e;
            }
            console.log(rtc);
            console.log(rtc2);
            doh.t(rtc);
            doh.t(rtc2);

            doh.f(error);
            console.log(this.endpointProvider.currentState());

          }
      ),
      new TestFixture(
          "createRtcommEndpoint() - create w/ different audio/video/data and same context works",
          function(){
            var error = null;
            try {
              var rtc = this.endpointProvider.createRtcommEndpoint({audio: true, video: false, data: false});
              var rtc2 = this.endpointProvider.createRtcommEndpoint({audio: true, video: true, data: true});
            }  catch(e) {
              console.log(e);
              error = e;
            }

            doh.t(rtc);
            doh.t(rtc2);

            doh.f(error);
            console.log(this.endpointProvider.currentState());
          }
      ),    
    
      new TestFixture(
          "createRtcommEndpoint() - API Validation",
          function(){
            var fakeBadSelfView = {};
            var fakeBadRemoteView = {};
            var fakeSelfView = {src: ""};
            var fakeRemoteView = {src: ""};
            var error = null;
            
            var rtc = this.endpointProvider.createRtcommEndpoint({audio: true, video: true, data: true});
            
            console.log('MediaIn throws a TypeError without .src');
            var error = null;
            try {
              rtc.setMediaIn(fakeBadRemoteView);
            } catch(e) {
              error = e;
            }
            doh.t(error instanceof TypeError);
            console.log('MediaOut throws a TypeError without .src');
            
            error = null;
            try {
              rtc.setMediaOut(fakeBadSelfView);
            } catch(e) {
             error = e;
            }
            doh.t(error instanceof TypeError);
            
            error = null;
            console.log('MediaIn does not throw error w/ .src', error);
            try {
              rtc.setMediaIn(fakeRemoteView);
            } catch(e) {
              console.log('Threw an error, ', e, fakeRemoteView);
             error = e;
            }
            // error should be null;
            doh.f(error);
            error = null;
            
            console.log('MediaOut does not throw error w/ .src');
            try {
              rtc.setMediaOut(fakeSelfView);
            } catch(e) {
              error = e;
            }
            // error should be null;
            doh.f(error);
            
            doh.t(rtc);
          }
      ),      
      
      new TestFixture(
          "createRtcommEndpoint() - call createConnection on it... ",
          function(){
            var error = null;
            try {
              var rtc = this.endpointProvider.createRtcommEndpoint({audio: true, video: true, data: true});
              rtc.createConnection();

            }  catch(e) {
              error = e;
            }
            doh.t(rtc);
            doh.f(error);
          }
      ),      
      new TestFixture(
          "register() w/o init() throws error",
          function(){
            var error = null;
            try {
              this.endpointProvider.register();
            }  catch(e) {
              error = e;
            }
            doh.assertEqual('Not Ready! call init() first', error.message);
          }
      ),
      new TestFixture(
          "logLevel",
          function(){
            var error = null;
            try {
              this.endpointProvider.setLogLevel('thing');  
            } catch (e)  {
              error = e;
            }
            doh.t(error);
            
            var lvl = 'MESSAGE';
            console.log('MESSAGE', lvl);
            this.endpointProvider.setLogLevel(lvl);
            doh.assertEqual(lvl, this.endpointProvider.getLogLevel());
          
            lvl = 'DEBUG';
            this.endpointProvider.setLogLevel(lvl);
            doh.assertEqual(lvl, this.endpointProvider.getLogLevel());
          
            lvl = 'INFO';
            this.endpointProvider.setLogLevel(lvl);
            doh.assertEqual(lvl, this.endpointProvider.getLogLevel());
          
            lvl = 'TRACE';
            this.endpointProvider.setLogLevel(lvl);
            doh.assertEqual(lvl, this.endpointProvider.getLogLevel());
            
          }
      )

      ]); // End of Tests


});
