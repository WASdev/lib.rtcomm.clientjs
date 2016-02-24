define([
  (typeof window === 'undefined' && global) ?'intern/dojo/node!../support/mqttws31_shim': 'bower_components/bower-mqttws/mqttws31',
    'support/config',
    'bower_components/webrtc-adapter/adapter',
    'umd/rtcomm/EndpointProvider'
], function ( globals, config, adapter, EndpointProvider) {
    /*
     * create an Endpoint Provider and init it in a promise-like fashion
     * Passes endpoint provider into promise;
     */
    var createProvider = function createProvider(cfg,appContext) {
      var p = new Promise(
        function(resolve,reject) {
          var EP = new EndpointProvider();
          if(typeof appContext !== 'undefined') {
            if (typeof appContext === 'boolean') {
              // It is DEBUG level
              if (appContext) { 
                EP.setLogLevel('DEBUG');
              }
            } else {
              EP.setAppContext(appContext);
            }
          };
          EP.init(cfg,
            function(message) { 
              console.log('Fat Utils Created and init Provider: ', EP);
              resolve(EP);
            },
            function(message) { console.error('init failed', message); reject(message);}
          );
      });
      return p;
    };

    /*
     * create a PeerConnection between two endpoints in a promise-like way.. 
     * Resolve promise when the connection is established.
     *
     * pass object w/ two endnpoints { ep1: endpoint, ep2: endpoint} 
     */
    var createConnection = function createConnection(EP1, EP2) {

      var p = new Promise(
        function(resolve, reject) {
          var readyToResolve = 0;
          var epEvents = {
            'session:alerting': function(eventObject) {
              // Auto-accept 
              eventObject && eventObject.endpoint && eventObject.endpoint.accept();
             }, 
             'session:started': function(eventObject) {
               if ( eventObject && eventObject.endpoint) {
                  console.log('SESSION STARTED -- EndpointID '+eventObject.endpoint.getUserID());
               }
               resolvePromise();
             },
             'session:failed': function(eventObject) {
               if ( eventObject && eventObject.endpoint) {
                  console.log('SESSION FAILED -- EndpointID '+eventObject.endpoint.getUserID());
               }
               reject();
             },
             'session:stopped': function(eventObject) {
               if ( eventObject && eventObject.endpoint) {
                  console.log('SESSION STOPPED -- EndpointID '+eventObject.endpoint.getUserID());
               }
             },
             'webrtc:connected': function(eventObject) {
               resolvePromise();
             }
          };

        var resolvePromise = function() {
          var timer = null;
          console.log('ep1.getState() === '+ep1.getState());
          console.log('ep2.getState() === '+ep2.getState());
          console.log('ep1.webrtc.getState() === '+ep1.webrtc.getState());
          console.log('ep2.webrtc.getState() === '+ep2.webrtc.getState());
          if (ep2.getState() === 'session:started' && 
              ep1.getState() === 'session:started' && 
              ep1.webrtc.getState() === 'connected' && 
              ep2.webrtc.getState() === 'connected' ) {
            console.log('createConnection resolving callback...in 5 seconds...');
            timer = timer || setTimeout(function() {
              console.log('st ep1:', ep1);
              console.log('st ep2:', ep2);
              resolve({ep1: ep1,ep2: ep2});
            }, 5000);
          }
        };
        
        EP1.setRtcommEndpointConfig(epEvents);
        EP2.setRtcommEndpointConfig(epEvents);
        var ep1 = EP1.createRtcommEndpoint({webrtc: true, chat:true});
        var ep2 = EP2.createRtcommEndpoint({webrtc: true, chat:true});
        ep2.webrtc.enable();
        ep1.webrtc.enable();
        ep1.connect(ep2.getUserID());
      });
      return p ;
    };
    // Require RTCOMM Server is set globally.
    requireServer: function requireServer() {
      // Default to false.
      return (typeof REQUIRE_RTCOMM_SERVER !== 'undefined') ? REQUIRE_RTCOMM_SERVER : false;
    };

    createSuiteName: function createSuiteName(name) {
      return (requireServer()) ? name : name + '[no_rtcomm_server]';
    };

    return {
      createProvider: createProvider,
      createConnection: createConnection,
      requireServer: requireServer,
      createSuiteName: createSuiteName
    };
});


