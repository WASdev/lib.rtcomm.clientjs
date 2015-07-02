/**
 * Copyright 2013 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
define([
    'intern!object',
    'intern/chai!assert',
    'intern/node_modules/dojo/Deferred',
    (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../../support/mqttws31_shim':
        'lib/mqttws31',
    'support/config',
    'umd/rtcomm/connection'
], function (registerSuite, assert, Deferred,globals, config, connection) {
    var T1 = 10000;  // How long we wait to setup, before sending messages.
    var T2 = T1 + 2000; // How long we wait to check results
    var T3 = T2 +2000;  // How long we wait to timeout test.
    var T4 = T3 +2000;
    var T5 = T4 +2000;

  var config1 = config.clientConfig1();
  var config2 = config.clientConfig2();
  var epc1, epc2 = null;
    var getTime = function() {
      var d = new Date();
      return d.getTime();
    };

  registerSuite({
    name: 'FVT - connection/EndpointConnection',
    setup: function() {
      console.log('*********** Setup *********');
      var dfd = new Deferred();
      epc1 = new connection.EndpointConnection(config1);
      epc2 = new connection.EndpointConnection(config2);

      epc1.connect(
      /* onSuccess */ function(service) {
        epc2.connect(
          /* onSuccess */ function(service) {
            console.log('***** resolve setup *****');
            dfd.resolve();
          },
          /* onFailure */ function(error){
            dfd.reject(error);
          }
        );
      },
      /* onFailure */ function(error){
        dfd.reject(error);
      });
      return dfd.promise;
    },
    teardown: function() {
      epc1.destroy();
      epc1 = null;
      epc2.destroy();
      epc2 = null;
    },
    beforeEach: function() {
      console.log('******** New Test *********');
      epc1.clearEventListeners();
      epc2.clearEventListeners();
    },
    'Initiate Connections': function() {
       var self = this;
       epc1.setLogLevel('MESSAGE');
       var ll1 = epc1.getLogLevel();
       epc2.setLogLevel('DEBUG');
       var ll2 = epc2.getLogLevel();
       console.log('ll1: '+ll1+ ' ll2: '+ll2);
       console.log('conn1 connected? ', epc1.connected);
       console.log('conn2 connected? ', epc2.connected);
       assert.ok(epc1.connected);
       assert.ok(epc2.connected);
    },
    'Transaction pollution': function() {
      //this.skip();
       var test = this;
       // kind of working... let's see what happens tonight.
        epc1.createTransaction();
        console.log('1'+epc1.transactions.list());
        console.log('2'+ epc2.transactions.list());
        epc2.setLogLevel('DEBUG');
        console.log('conn1 connected? ', epc1.connected);
        console.log('conn2 connected? ', epc2.connected);
        assert.ok(epc1.connected);
        assert.ok(epc2.connected);
     },
     'Start Session - Initial Timeout[flakey, try again if fails]': function() {
      //this.skip();
           console.log('************* Running Test *********');
           var test = this;
           var sess1 = null;
           var d = new Date();
           var error = null;
           var initialTime = getTime();
           var errorTime = null;
           var timeout = 5000; // 5 seconds
           epc2.on('newsession', function(session) {
              // Do nothing here...
           });
           var dfd = this.async(timeout +2000);
           sess1 = epc1.createSession();
           sess1.on('failed', dfd.callback(function(message){
             errorTime = getTime();
             console.log('TEST: Failure message '+ message);
             console.log('Time for error was: ', errorTime-initialTime);
             assert.ok(message);
             assert.ok(errorTime-initialTime > timeout);
             sess1.stop();
             sess1 = null;
           }));
           sess1.toTopic = epc2.getMyTopic();
           sess1.start({remoteEndpointID: config2.userid});
           console.log('********* After Start of session **************');
      },
      'Start Session - final Timeout[flakey, try again if fails]': function() {
      //this.skip();
           console.log('************* Running Test *********');
           var test = this;
           var sess1 = null;
           var d = new Date();
           var error = null;
           var initialTime = getTime();
           var time = null;
           var errortime= null;
           var timeout = 10; // In seconds.
           epc2.on('newsession', function(session) {
             console.log('>>>>>>>> Start Session Callback Timeout <<<<<<<<<<<<<');
             session.start();
             session.pranswer(timeout);
             time = getTime();
           });
           var dfd = this.async(timeout*1000 + 2000); 

           sess1 = epc1.createSession();
           sess1.on('failed', dfd.callback(function(message){
                // OnFailed called...
                console.log('On Failed called...', message);
                errortime = getTime();
                error = message;
                console.log('time:'+ time);
                console.log('errortime:'+ errortime);
                console.log('Time for error was: ', errortime-time);
                console.log('Error is: '+ error);
                assert.ok(errortime-time > timeout*1000);
                assert.ok(error);
           }));

           sess1.finalTimeout=timeout*1000;
           sess1.toTopic = epc2.getMyTopic();
           sess1.start({remoteEndpointID: config2.userid});
           console.log('********* After Start of session **************');
      },
      'Start Session test...': function() {
      //this.skip();
        console.log('******* Running Test ***********');
        var test = this;
        var sess1 = null;
        var sess2 = null;
        epc2.on('newsession', function(session) {
          console.log('>>>>>>>> Start Session Callback<<<<<<<<<<<<<');
          // A new inbound session was created!  send a pranswer!
         console.log('P2P TEST: Inbound Session created -->', session);
         // get a pranswer -- we don't really use one, so doesn't matter.
         session.start();
         console.log('Connection 2 Transactions:', epc2.transactions.list());
         session.pranswer();
         // this would be a manual click...
         console.log('started session... ', session);
         sess2 = session;
         setTimeout(function(){
            console.log('********* Sending Answer **********');
             // Send an Answer...
            console.log('Conn1 Transactions:', epc1.transactions.list());
            console.log('Conn2 Transactions:', epc2.transactions.list());
            assert.ok(sess2);
            sess2.respond({type: 'answer', sdp:''});
            console.log('Conn1 Transactions:', epc1.transactions.list());
            console.log('Conn2 Transactions:', epc2.transactions.list());
         },T1);
        });
        var dfd = this.async(T3);
        //epc1.serviceQuery();
        //epc2.serviceQuery();
        sess1 = epc1.createSession();
        sess1.on('started', dfd.callback(function(message){
          console.log('********* TEST FINISHED **************');
          console.log('Session1', sess1);
          console.log('Session2', sess2);
          console.log('Conn1 Transactions:', epc1.transactions.list());
          console.log('Conn2 Transactions:', epc2.transactions.list());
          assert.equal('started', sess1.state);
          assert.equal('started', sess2.state);
        }));
        console.log('TOTOPIC is: '+sess1.toTopic);
          // Not ready unless Service Query passes, commenting out.
         // assert.ok(epc1.ready);
         // assert.ok(epc2.ready);
        console.log('********* Before Start of session **************');
        console.log('conn1', epc1);
        console.log('conn2', epc2);
        console.log('Changing toTopic from:['+sess1.toTopic+'] to ['+test.topic2);
        sess1.toTopic = epc2.getMyTopic();
        console.log('session' ,sess1);
        console.log('config2.userid', config2.userid);
        console.log('Starting session');
        sess1.start({remoteEndpointID: config2.userid});
        console.log('********* After Start of session **************');
        console.log('conn1', epc1);
        console.log('conn2', epc2);
      },

    "Connection Test - using Server": function() {
          //this.skip();
          var nc = new connection.EndpointConnection(config1);
          nc.setLogLevel('DEBUG');
          var success = false;
          var dfd = this.async(T1);
          nc.connect(dfd.callback(function() {
            console.log('CONNECT SUCCESS!');
            success = true;
            assert.ok(success);
            nc.disconnect();
          }), 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
            nc.disconnect();
          });
      },
      "Service Query Test": function() {
          var nc = new connection.EndpointConnection(config1);
          var success = false;
          var dfd = this.async(T1);
          nc.connect(function() {
            console.log('CONNECT SUCCESS!');
            nc.serviceQuery(
              dfd.callback(function(info){
                console.log('Service_QuerySuccess: ',info);
                assert.ok(nc.services.RTCOMM_CONNECTOR_SERVICE.topic, 'The Default service and topic is there');
                assert.ok(nc.services.RTCOMM_CONNECTOR_SERVICE.sphereTopic, 'The Default sphereTopic is there');
                success = true;
                console.log('nc.ready', nc.ready);
                console.log(nc);
                assert.ok(success, 'service Query success');
                nc.disconnect();
            }), dfd.callback(function(error){
              console.error(error);
              console.log('nc.ready', nc.ready);
              console.log('Connection?', nc);
              nc.disconnect();
              assert.ok(success, 'service Query success');
            }));
          }, 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
            nc.disconnect();
          });
      },
      "Service Query Test (no userid)" : function() {
          //this.skip();
          var cfg = config.clientConfig1();
          delete cfg.userid;
          var nc = new connection.EndpointConnection(cfg);
          var success = false;
          var failure = false;
          var dfd = this.async(T1);
          nc.connect(function() {
            console.log('CONNECT SUCCESS!');
            nc.serviceQuery(function(info){
              console.log('Service_QuerySuccess: ',info);
              success = true;
              nc.disconnect();
            }, dfd.callback(function(error){
              console.error(error);
              failure=true;
              console.log('nc.ready', nc.ready);
              console.log(nc);
              assert.ok(failure);
              nc.disconnect();
            }));
          }, 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
          });
      },
      "RTCOMM_SIP_CONNECTOR_SERVICE": function() {
          //this.skip();
          var nc = new connection.EndpointConnection(config1);
          nc.setLogLevel('TRACE');
          var success = false;
          var dfd = this.async(T1);
          var sess1 = null;
          var RTCOMM_SIP_CONNECTOR_SERVICE = {
            topic:"/rtcommscott/sip",
            schemes:['sip', 'sips', 'tel']
          };
          nc.connect(dfd.callback(function() {
            nc.services.RTCOMM_SIP_CONNECTOR_SERVICE  = RTCOMM_SIP_CONNECTOR_SERVICE;
            sess1 = nc.createSession({'remoteEndpointID': 'sip:scott'});
            console.log('sess1:',sess1);
            assert.equal(sess1.toTopic, nc.normalizeTopic("/rtcommscott/sip"));
            nc.disconnect();
          }), 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
            nc.disconnect();
          });
      },
      "RTCOMM_SIP_CONNECTOR_SERVICE(sip:alice@192.168.1.4:7777)": function() {
          //this.skip();
          var nc = new connection.EndpointConnection(config1);
          nc.setLogLevel('TRACE');
          var success = false;
          var dfd = this.async(T1);
          var sess1 = null;
          var RTCOMM_SIP_CONNECTOR_SERVICE = {
            topic:"/rtcommscott/sip",
            schemes:['sip', 'sips', 'tel']
          };
          nc.connect(dfd.callback(function() {
            nc.services.RTCOMM_SIP_CONNECTOR_SERVICE  = RTCOMM_SIP_CONNECTOR_SERVICE;
            sess1 = nc.createSession({'remoteEndpointID': 'sip:alice@192.168.1.4:7777'});
            console.log('sess1:',sess1);
            assert.equal(sess1.toTopic, nc.normalizeTopic("/rtcommscott/sip"));
            nc.disconnect();
          }), 
          function() {
            console.log('CONNECT FAILURE!');
            success = false;
            nc.disconnect();
          });
      }

  }); // end of suite

});
