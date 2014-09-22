/*
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
 */ 


/*
 * This is a private EndpointRegistry object that 
 * can be used to manage endpoints.
 */
var EndpointRegistry = function EndpointRegistry() {
  var registry = {};

  /* get an endpoint based on a key
   *  If key is NULL and there is only 1 object in the registry, return it
   */
  function get(key) {
    if (key) { 
      if (registry.hasOwnProperty(key)) {
        return registry[key];
      } else {
        return null;
      }
   } else {
     if (this.length() === 1) {
       return registry[Object.keys(registry)[0]];
     } else {
       return null;
     }
   }
  }

  /* add an endpoint, if a key for that 
   * endpoint already exists, return it.
   * Otherwise, return null if nothing passed
   */
  function add(object) {
    var key =  null;
    if (object) {
      key = object.userid + '|'+object.appContext;
      console.log("Adding key to registry: " + key);
      if (registry.hasOwnProperty(key) ) {
        console.log('Returning existing object');
        return registry[key];
      } else {
        registry[key] = object;
        return registry[key]
      }
    } else {
      return null;
    }
  }

  /*
   * Remove an object from the registry
   */
  function remove(object) {
    var key = null;
    if (object) {
      key = object.userid + '|'+object.appContext;
      if (registry.hasOwnProperty(key) ) {
        delete registry[key];
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  /*
   * Destroy the registry and all objects in it
   *  calls .destroy() on contained objects if
   *  they have that method
   */
  function destroy() {
    // call destroy on all objects, remove them.
    Object.keys(registry).forEach(function(obj) {
      console.log('destroying... ', obj);
      if (typeof obj.destroy === 'function') {
        obj.destroy();
      }
      remove(obj);
    });
  }
  /*
   * return the registry object for perusal.
   */

  function length() {
    return Object.keys(registry).length;
  }

  function list() {
    return registry;
  }

  return {
    add: add,
    get: get,
    remove: remove,
    destroy: destroy,
    length: length,
    list: list
  };

};

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

  /** @lends module:rtcomm.EndpointProvider */

  var MISSING_DEPENDENCY = "RtcommEndpointProvider Missing Dependency: ";
  /*global util:false*/
  if (!util) { throw new Error(MISSING_DEPENDENCY+"rtcomm.util");}
  /*global connection:false*/
  if (!connection) { throw new Error(MISSING_DEPENDENCY+"rtcomm.connection");}

  /* Instantiate the endpoint Registry */
  var endpointRegistry = new EndpointRegistry();

  /* configuration */
  var defaultConfig = {
      appContext: 'rtcomm',
      server:null,
      port: 1883,
      userid : null,
      serviceTopicName : "nodeConnector",
      topicPath: "/rtcomm/",
      credentials : { user: "", password: ""},
      register: false,
      createEndpoint: false
  };

  this.config = defaultConfig;
  // Internal objects
  this.ready = false;
  
  
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
   * @property {string} [serviceTopicName=endpointConnection] serviceTopicName on rtcomm server
   * @property {string} [topicPath=/rtcomm/] MQTT Path to prefix serviceTopicName with and register under
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
   *   serviceTopicName : 'endpointConnector',   
   *   topicPath : '/rtcomm/', 
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
      /*global validateConfig: false */
      /*global setLogLevel: false */
      /*global getLogLevel: false */
      /*global applyConfig: false */
      /*global l: false */
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
      serviceTopicName: config.serviceTopicName,
      topicPath: config.topicPath
    });

    var endpointConnection = this.endpointConnection;

    // If we already have some enpdoints, their connection will be null, fix it
    if (endpointRegistry.length() > 0 ) {
      Object.keys(endpointRegistry.list()).forEach(function(endpoint) {
        endpointRegistry.get(endpoint).setEndpointConnection(endpointConnection);
      });
    }

    endpointConnection.setLogLevel(getLogLevel());
    var onSuccess = function(message) {
      var returnObj = {
          'ready': true,
          'registered': false,
          'endpoint': null
      };
      
      this.ready = true;

      /*
       * Depending on the configuration, the init() can do some different things
       */

      if (config.register || config.createEndpoint) {
        returnObj.endpoint  = endpointProvider.createRtcommEndpoint({appContext: config.appContext});
        // If register, go ahead and register the endpoint
        config.register && returnObj.endpoint.register(
          function(message) {
            returnObj.registered = true;
            if (config.createEndpoint) {
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
        l('DEBUG') && console.log("Handle a new incoming session: ", session);
        // Send it to the same id/appContext;
        var epKey = endpointProvider.userid + '|' + session.appContext;
        var endpoint = endpointRegistry.get(epKey) || endpointRegistry.get() || null;
        //TODO:  For the SessQueue thing, we need to lookup based on the session.source
        if (endpoint) {
          endpoint.newSession(session);
        } else {
          // Deny the session.
          session.respond(false, 'No endpoint for appContext:  '+ session.appContext);
          // Should I delete the session?
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
    // Add to registry or return the one already there
    return endpointRegistry.add(endpoint);
  };

  this.createMqttEndpoint = function() {
    return new MqttEndpoint({connection: this.endpointConnection});
  };

  
  this.destroy = function() {
    endpointRegistry.destroy();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointRegistry');
    this.endpointConnection.destroy();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointConnection');
    
  }; 
   
  // exposing module global functions for set/get loglevel
  this.setLogLevel = setLogLevel;
  this.getLogLevel = getLogLevel;

  this.endpoints = function() {
    return endpointRegistry.list();
  };

  
  this.currentState = function() {
    return {
      states:  this._private,
      config : this.config,
      endpointRegistry: endpointRegistry.list()
    };

  };

}; // end of constructor

EndpointProvider.prototype = util.RtcommBaseObject.extend({});


