define(["doh/runner","tests/common/config","ibm/rtcomm/connection"], function(doh,config, connection){

    dojo.require("lib/mqttws31");
  
    var config1 = config.clientConfig1();
   // config1.serviceTopic= "/WebRTC";

    // client2 Config
    var config2 = config.clientConfig2();
 //   config2.serviceTopic= "/WebRTC";

    var T1 = 5000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 2000; // How long we wait to check results
    var T3 = T2 +2000;  // How long we wait to timeout test.
    var T4 = T3 +2000;
    var T5 = T4 +2000;
    // serviceTopic Config
    var serviceTopic = new config._ServerConfig("servicetopic@ibm.com","/WebRTC");
    serviceTopic.myTopic = "/WebRTC";

    var p2pConnFixture = function(name, /*boolean*/ direct, /*function*/ runTest, /*integer*/ timeout) {
      return {
        name : "P2P " + name,
        setUp: function() {
          /*
           * This creates TWO EndpointConnection objects that
           * we connect together by swapping their ServiceTopics
           * 
           * There is no liberty RTCOMM Signaling Node on the back end expected.
           * 
           * if 'direct' = true, then we will create it to each other.
           * 
           */
          console.log('setup of p2pConnFixture called');
          var test = this;
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
          console.log("*** Creating EndpointConnection 1***", config1);
         
          this.conn1 = new connection.EndpointConnection(config1);
          this.conn1.connect(/*onSuccess*/ function(service) {
            console.log("Connection 1 initialized "+ service.id);
          }.bind(this),
          function(error) {
            console.log(error);
          }
          );
          console.log('1 logLevel:', this.conn1.getLogLevel());
          /*
           * Client2
           */
          console.log("*** Creating EndpointConnection2***", config2);
          this.conn2 =new connection.EndpointConnection(config2);
          this.conn2.connect( /*onSuccess*/ function(service) {
            console.log("Connection 2 initialized: "+ service.id);
          }.bind(this),
          function(error) {
            console.log(error);
          });
          console.log('2 logLevel:', this.conn2.getLogLevel());
        },
        runTest: runTest,
        tearDown: function() {
          this.conn1.disconnect();
          this.conn1=null;
          this.conn2.disconnect();
          this.conn2=null;
        },
        timeout: timeout
      };
    };

    doh.register("EndpointConnectionTest - using Server", [
      { name: "Connection Test",
        runTest: function() {
          var nc = new connection.EndpointConnection(config1);
          nc.setLogLevel('DEBUG');
          var success = false;
          nc.connect( function() {
            console.log('CONNECT SUCCESS!');
            success = true;
          }, 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
          })
          var def = new doh.Deferred();
          setTimeout(def.getTestCallback(function() {
            console.log('nc.ready', nc.ready);
            console.log(nc);
            doh.t(success);
            nc.disconnect();
          }),
          T2)
          return def;
        },
        timeout: T3
      },
      { name: "Service Query Test",
        runTest: function() {
          var nc = new connection.EndpointConnection(config1);
          var success = false;
          var register = false;
          nc.connect(function() {
            console.log('CONNECT SUCCESS!');
            nc.serviceQuery(function(info){
              console.log('Service_QuerySuccess: ',info);
              success = true;
            }, function(error){
              console.error(error);
            });
          }, 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
          })
          var def = new doh.Deferred();
          setTimeout(def.getTestCallback(function() {
            console.log('nc.ready', nc.ready);
            console.log(nc);
            doh.t(success);
            nc.disconnect();
          }),
          T1)
          return def;
        },
        timeout: T3
      },
      { name: "Service Query Test (no userid)",
        runTest: function() {

          var cfg = config.clientConfig1();
          delete cfg.userid;
          var nc = new connection.EndpointConnection(cfg);
          var success = false;
          var failure = false;
          var register = false;
          nc.connect(function() {
            console.log('CONNECT SUCCESS!');
            nc.serviceQuery(function(info){
              console.log('Service_QuerySuccess: ',info);
              success = true;
            }, function(error){
              console.error(error);
              failure=true;
            });
          }, 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
          })
          var def = new doh.Deferred();
          setTimeout(def.getTestCallback(function() {
            console.log('nc.ready', nc.ready);
            console.log(nc);
            doh.t(failure);
            nc.disconnect();
          }),
          T1)
          return def;
        },
        timeout: T3
      },
      { name: "register( no userid)",
        runTest: function() {
          var cfg = config.clientConfig1();
          delete cfg.userid;
          var nc = new connection.EndpointConnection(cfg);
          var success = false;
          var failure = false;
          var register = false;
          nc.connect(function() {
            console.log('CONNECT SUCCESS!');
            nc.register(function(info){
              console.log('Register success: ',info);
              success = true;
            }, function(error){
              console.error(error);
              failure=true;
            });
          }, 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
          })
          var def = new doh.Deferred();
          setTimeout(def.getTestCallback(function() {
            console.log('nc.ready', nc.ready);
            console.log(nc);
            doh.t(failure);
            nc.disconnect();
          }),
          T1)
          return def;
        },
        timeout: T3
      },
      { name: "register( with userid)",
        runTest: function() {
          var cfg = config.clientConfig1();
          var nc = new connection.EndpointConnection(cfg);
          var success = false;
          var failure = false;
          var register = false;
          nc.connect(function() {
            console.log('CONNECT SUCCESS!');
            nc.register(function(info){
              console.log('Register success: ',info);
              success = true;
            }, function(error){
              console.error(error);
              failure=true;
            });
          }, 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
          })
          var def = new doh.Deferred();
          setTimeout(def.getTestCallback(function() {
            console.log('nc.ready', nc.ready);
            console.log(nc);
            doh.t(success);
            nc.disconnect();
          }),
          T1)
          return def;
        },
        timeout: T3
      },
      new p2pConnFixture('Initiate Connections', true, 
          function() {
            var self = this;
          // kind of working... let's see what happens tonight.  
            this.conn1.setLogLevel('MESSAGE');
            var ll1 = this.conn1.getLogLevel();
            this.conn2.setLogLevel('DEBUG');
            var ll2 = this.conn2.getLogLevel();
            console.log('ll1: '+ll1+ ' ll2: '+ll2);
            var def = new doh.Deferred();
            setTimeout(def.getTestCallback(function(){
              console.log('conn1 ready? ', self.conn1.connected);
              console.log('conn2 ready? ', self.conn2.connected);
              doh.t(self.conn1.connected);
              doh.t(self.conn2.connected);
            }), T2);
            return def;
          },
          T3
      )

    ]);
});
