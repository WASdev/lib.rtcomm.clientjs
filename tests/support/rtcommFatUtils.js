define([
  'intern/node_modules/dojo/Deferred',
  (typeof window === 'undefined' && global) ?'intern/dojo/node!../support/mqttws31_shim': 'bower_components/bower-mqttws/mqttws31',
    'support/config',
    'bower_components/webrtc-adapter/adapter',
    'umd/rtcomm/EndpointProvider'
], function (Deferred, globals, config, adapter, EndpointProvider) {
    /*
     * create an Endpoint Provider and init it in a promise-like fashion
     * Passes endpoint provider into promise;
     */
    var createProvider = function createProvider(cfg,appContext) {
      var dfd = new Deferred();
      var EP = new EndpointProvider();
      EP.setAppContext(appContext);
      EP.init(cfg,
        function(message) { 
          dfd.resolve(EP);
        },
        function(message) { console.error('init failed', message); dfd.reject(message);}
      );
      return dfd.promise;
    };

    /*
     * create a PeerConnection between two endpoints in a promise-like way.. 
     * Resolve promise when the connection is established.
     *
     * pass object w/ two endnpoints { ep1: endpoint, ep2: endpoint} 
     */
    var createConnection = function createConnection(EP1, EP2) {
      var dfd = new Deferred();
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
           resolve();
         },
         'session:failed': function(eventObject) {
           if ( eventObject && eventObject.endpoint) {
              console.log('SESSION FAILED -- EndpointID '+eventObject.endpoint.getUserID());
           }
           dfd.reject();
         },
         'session:stopped': function(eventObject) {
           if ( eventObject && eventObject.endpoint) {
              console.log('SESSION STOPPED -- EndpointID '+eventObject.endpoint.getUserID());
           }
         },
         'webrtc:connected': function(eventObject) {
           resolve();
         }
      };

      var resolve = function() {
        console.log('ep1.getState() === '+ep1.getState());
        console.log('ep2.getState() === '+ep2.getState());
        console.log('ep1.webrtc.getState() === '+ep1.webrtc.getState());
        console.log('ep2.webrtc.getState() === '+ep2.webrtc.getState());
        if (ep2.getState() === 'session:started' && 
            ep1.getState() === 'session:started' && 
            ep1.webrtc.getState() === 'connected' && 
            ep2.webrtc.getState() === 'connected' ) {
          console.log('createConnection resolving callback...');
          setTimeout(function() {
            console.log('st ep1:', ep1);
            console.log('st ep2:', ep2);
            dfd.resolve({ep1: ep1,ep2: ep2});
          }, 1000);
        }
      };
      
      EP1.setRtcommEndpointConfig(epEvents);
      EP2.setRtcommEndpointConfig(epEvents);
      var ep1 = EP1.createRtcommEndpoint({webrtc: true, chat:true});
      var ep2 = EP2.createRtcommEndpoint({webrtc: true, chat:true});
      ep2.webrtc.enable();
      ep1.webrtc.enable();
      ep1.connect(ep2.getUserID());
      return dfd.promise;
    };

    return {
      createProvider: createProvider,
      createConnection: createConnection
    };
});


