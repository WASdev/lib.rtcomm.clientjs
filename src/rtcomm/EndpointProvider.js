/**
 * Copyright 2014 IBM Corp.
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
/** 
 * @class
 * @memberof module:rtcomm
 * @classdesc
 * Provides Services to register a user and create RtcommEndpoints
 * <p>
 * This programming interface lets a JavaScript client application use a {@link module:rtcomm.RtcommEndpoint|Real Time Communication Endpoint} 
 * to implement WebRTC simply. When {@link module:rtcomm.EndpointProvider|instantiated} & {@link module:rtcomm.RtcommEndpointProvider#init|initialized} the 
 * RtcommEndpointProvider connects to the defined MQTT Server and subscribes to a unique topic that is used to receive inbound communication.   
 * <p>
 * See the example in {@link module:rtcomm.EndpointProvider#init|EndpointProvider.init()}
 * <p>
 * 
 * @requires {@link mqttws31.js}
 *   
 */ 
var EndpointProvider =  function EndpointProvider() {

  var MISSING_DEPENDENCY = "RtcommEndpointProvider Missing Dependency: ";
  if (!util) { throw new Error(MISSING_DEPENDENCY+"rtcomm.util");}
  if (!connection) { throw new Error(MISSING_DEPENDENCY+"rtcomm.connection");}

  /** @lends module:rtcomm.EndpointProvider */

  /* configuration */
  var defaultConfig = {
      appContext: 'rtcomm',
      server:null,
      port: 1883,
      userid : null,
      connectorTopicName : "endpointConnector",
      connectorTopicPath: "/rtcomm/",
      credentials : { user: "", password: ""},
      register: false,
      createEndpoint: false
  };

  this.config = defaultConfig;
  // Internal objects
  this.ready = false;
  
  // Default rtcommEndpoint (First instance created)
  this.defaultRtcommEndpoint = null;
  
  this.events = { 
      /**
       * A new RtcommEndpoint was created from an inbound 
       * @event module:rtcomm.EndpointProvider#newendpoint
       * @property {module:rtcomm#RtcommEndpoint}
       */
      'newendpoint': []};
  
  /** services supported by the EndpointConnection, populated in init()*/
  this.services = null; 

  /** 
   * EndpointProvider Init config object
   * @typedef  {Object} module:rtcomm.EndpointProvider~InitOptions
   * @property {string} server MQTT Server
   * @property {string} [port=1883] MQTT Server Port 
   * @property {string} userid User ID or Identity
   * @property {string} [connectorTopicName=endpointConnection] connectorTopicName on rtcomm server
   * @property {string} [connectorTopicPath=/rtcomm/] MQTT Path to prefix connectorTopicName with and register under
   * @property {boolean} [register=false] Automatically register
   * @property {boolean} [createEndpoint=false] Automatically create a {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint}
   */

  /** init method
   *  This method is required to be called prior to doing anything else.
   * @param  {module:rtcomm.EndpointProvider~InitOptions} config - Configuration object for init
   * @param {function} [onSuccess] Callback function when init is complete successfully.
   * @param {function} [onFailure] Callback funtion if a failure occurs during init
   * @param {function} [status]  Callback function to monitor status of init
   * 
   * @example
   * var endpointProvider = new ibm.rtcomm.RtcommEndpointProvider(); 
   * var endpointProviderConfig = {
   *   server : 'broker.mqttdashboard.com',       
   *   userid : 'ibmAgent1@mysurance.org',
   *   connectorTopicName : 'endpointConnector',   
   *   connectorTopicPath : '/rtcomm/', 
   *   port : 8000,                          
   *   register: true,                     
   *   createEndpoint : true,                   
   *   credentials : null                  
   * };
   *
   * // Initialize the Service. [Using onSuccess/onFailure callbacks]
   * // This initializes the MQTT layer and enables inbound Communication.
   * var rtcommEndpoint = null;  
   * endpointProvider.init(endpointProviderConfig, 
   *    function(object) { //onSuccess
   *        console.log('init was successful, rtcommEndpoint: ', object);
   *        rtcommEndpoint = object;
   *    },
   *    function(error) { //onFailure
   *       console.error('init failed: ', error);
   *      }
   * );
   * 
   */
  this.init = function init(options, cbSuccess, cbFailure) {
    // You can only be init'd 1 time, without destroying reconnecting.
    if (this.ready) {
      l('INFO') && console.log('EndpointProvider.init() has been called and the object is READY');
      return true;
    }
    var requiredConfig = { server: 'string', port: 'number', userid: 'string'};
    var config = this.config;
    var endpointProvider = this;
    if (options) {
      // validates REQUIRED initOptions upon instantiation.
      /*global _validateConfig: false */
      validateConfig(options, requiredConfig);
      // handle logLevel passed in...
      if (options.logLevel) {
        setLogLevel(options.logLevel);
        delete options.logLevel;
      }
      applyConfig(options, config);

    } else {
      throw new Error("RtcommEndpointProvider initialization requires a minimum configuration: " + JSON.stringify(requiredConfig));
    }

    cbSuccess = cbSuccess || function(message) {
      console.log(endpointProvider+'.init() Default Success message, use callback to process:', message);
    };
    cbFailure = cbFailure || function(error) {
      console.log(endpointProvider+'.init() Default Failure message, use callback to process:', error);
    };
    this.userid = config.userid;

    this.endpointConnection = new connection.EndpointConnection({
      server: config.server,
      port: config.port,
      userid: config.userid,
      connectorTopicName: config.connectorTopicName,
      connectorTopicPath: config.connectorTopicPath
    });

    var endpointConnection = this.endpointConnection;
    endpointConnection.setLogLevel(getLogLevel());


    var onSuccess = function(message) {
      var returnObj = {
          'ready': true,
          'registered': false,
          'endpointObj': null
      };
      this.ready = true;
      
      endpointConnection.service_query(
          /* onSuccess */ function(services) {
            // Returned services
            l('DEBUG') && console.log('Supported services are: ', services);
            this.services = services || null;
            
          }.bind(this),
          /* onFailure */ function(error){
            console.error('Unable to lookup supported services');
          });
     
      if (config.register) {
        endpointConnection.register(config.appContext, 
            function(message) {
          returnObj.registered = true;
          if (config.createEndpoint) {
            returnObj.endpoint  = endpointProvider.createRtcommEndpoint();
            cbSuccess(returnObj);
          } else {
            cbSuccess(returnObj);
          }
        }, 
        function(error) {
          cbFailure(error);
        });
      } else {
        cbSuccess(returnObj);
      }
    };
    var onFailure = function(error) {
      this.ready = false;
      cbFailure(error);
    };

    endpointConnection.on('newsession', function(session) {
      /*
       * What to do on an inbound request.
       * 
       * Options:
       *  Do we have a default endpoint?  if so, just give the session to it. 
       *  
       *  if that endpoint is busy, create a new endpoint and emit it.
       *  
       *  If there isn't a endpoint, create a Endpoint and EMIT it.
       *
       */  
      if(session) {
        console.log("Handle a new incoming session: ", session);
        var endpoint = endpointProvider.defaultRtcommEndpoint;
        if (endpoint && endpoint.available) {
          console.log('using an existing endpoint...', endpoint);
          endpoint.newSession(session);
        } else {
          endpoint = endpointProvider.createRtcommEndpoint();
          endpoint.newSession(session);
          endpointProvider.emit('newendpoint', endpoint);
        }
      } else {
        console.error('newsession - expected a session object to be passed.');
      }
    });
    
    endpointConnection.on('message', function(message) {
      if(message) {
        console.log("TODO:  Handle an incoming message ", message);
      }
    });
  
    // Connect!
    endpointConnection.connect( onSuccess.bind(this), onFailure.bind(this));
  
    
  };  // End of RtcommEndpointProvider.init()


  /** 
   * @typedef {object} module:rtcomm.EndpointProvider~EndpointConfig 
   *  @property {boolean} [audio=true] Support audio in the PeerConnection - defaults to true
   *  @property {boolean} [video=true] Support video in the PeerConnection - defaults to true
   *  @property {boolean} [data=true]  Support data in the PeerConnectio - defaults to true
   *  @property {String}  [context='none'] Context for the Handler. Used in messages and with the server. defaults to 'none'
   */

  /**
   * createRtcommEndpoint - Factory method that returns a RtcommEndpoint object to be used
   * by a UI component.  
   * 
   *  The rtcommEndpoint object provides an interface for the UI Developer to attach Video and Audio input/output. 
   *  Essentially mapping a broadcast stream(a MediaStream that is intended to be sent) to a RTCPeerConnection output
   *  stream.   When an inbound stream is added to a RTCPeerConnection, then the RtcommEndpoint object also informs the 
   *  RTCPeerConnection where to send that stream in the User Interface.  
   *
   * @param {module:rtcomm.EndpointProvider~EndpointConfig} endpointConfig - Configuration to initialize endpoint with. 
   *  
   * @returns {module:rtcomm.RtcommEndpoint|RtcommEndpoint}  A RtcommEndpoint Object
   * 
   * @example 
   *  var endpointConfig = { 
   *    audio: true, 
   *    video: true, 
   *    data: false, 
   *    };
   *  rtcommEndpointProvider.createRtcommEndpoint(endpointConfig);
   *  
   *  @throws Error
   */
  this.createRtcommEndpoint = function createRtcommEndpoint(endpointConfig) {
    var defaultConfig = {
        autoAnswer: false,
        appContext: this.config.appContext,
        audio: true,
        video: true,
        data: true,
        parent:this,
        userid: this.userid
    };
    var objConfig = defaultConfig;
    applyConfig(endpointConfig, objConfig);

    // Reflect this into the RtcommEndpoint.
    l('DEBUG') && console.log(this+'.createRtcommEndpoint using config: ', objConfig);
    var endpoint = Object.create(RtcommEndpoint);
    endpoint.init(objConfig);
    // Register
    try {
      this.defaultRtcommEndpoint = this.defaultRtcommEndpoint || endpoint;
      return endpoint;
    } catch(e){
      throw new Error(e);
    }
  };
  
  this.destroy =    function() {
    //TODO:  Add EndpointRegistry... 
    // Unregister (be nice...)
    
    this.unregister();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointRegistry');
    this.endpointConnection.destroy();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointConnection');
    
  }; 
   
  // exposing module global functions for set/get loglevel
  this.setLogLevel = setLogLevel;
  this.getLogLevel = getLogLevel;
  /** 
   *  Register the 'userid' used in {@link module:rtcomm.RtcommEndpointProvider#init|init} with the
   *  rtcomm service so it can be looked up and receive
   *  inbound requests.
   *
   *  @param {function} [onSuccess] Called when lookup completes successfully with the returned message about the userid                          
   *  @param {function} [onFailure] Callback executed if lookup fails, argument contains reason.
   */
  this.register = function(appContext, success, failure) {
    var cbSuccess, cbFailure;
    if (typeof appContext === 'function') {
      cbFailure = success;
      cbSuccess = appContext;
      appContext = this.config.appContext;
     } else {
       this.config.appContext = appContext;
     }
    //console.log('appContext is:'+ appContext);
    //console.log('cbSuccess is:'+ cbSuccess);
    //console.log('cbFailure is:'+ cbFailure);
    
    if (!this.ready) {
      throw new Error('Not Ready! call init() first');
    }
    this.endpointConnection.register(appContext, cbSuccess, cbFailure);
  };
  /** 
   *  Unregister from the server
   */
  this.unregister = function() {
    this.endpointConnection.unregister();
  };
  
  /** 
   * Query registry for a user
   * 
   * @param userid
   * @param cbSuccess 
   * @param cbFailure
   * 
   */
  this.lookup = function(userid, cbSuccess, cbFailure) {
    l('DEBUG') && console.log(this+'.lookup() lookup of: '+userid);
    this.endpointConnection.register_query(userid, cbSuccess, cbFailure);
  };

  this.currentState = function() {
    return {
      states:  this._private,
      config : this.config,
      defaultRtcommEndpoint: this.defaultRtcommEndpoint
    };

  };

}; // end of constructor

EndpointProvider.prototype = util.RtcommBaseObject.extend({});


