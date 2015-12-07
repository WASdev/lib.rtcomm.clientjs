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
/**
 * @class
 * @memberof module:rtcomm
 * @classdesc
 * Provides Services to register a user and create Endpoints (RtcommEndpoints & MqttEndpoints)
 * <p>
 * This programming interface lets a JavaScript client application use 
 * a {@link module:rtcomm.RtcommEndpoint|Real Time Communication Endpoint}
 * to implement WebRTC simply. When {@link module:rtcomm.EndpointProvider|instantiated} 
 * & {@link module:rtcomm.EndpointProvider#init|initialized} the
 * EndpointProvider connects to the defined MQTT Server and subscribes to a unique topic
 * that is used to receive inbound communication.
 * <p>
 * See the example in {@link module:rtcomm.EndpointProvider#init|EndpointProvider.init()}
 * <p>
 *
 * @requires {@link mqttws31.js}
 *
 */
var EndpointProvider =  function EndpointProvider() {
  /** @lends module:rtcomm.EndpointProvider */
  /*global util:false*/
  /*global getLogLevel:false*/
  /*global setLogLevel:false*/
  /*global l:false*/

  /*global connection:false*/
  /*global applyConfig:false*/
  /*global RtcommEndpoint:false*/
  /*global MqttEndpoint:false*/
  /*global PresenceMonitor:false*/

  var MISSING_DEPENDENCY = "RtcommEndpointProvider Missing Dependency: ";
  if (!util) { throw new Error(MISSING_DEPENDENCY+"rtcomm.util");}
  if (!connection) { throw new Error(MISSING_DEPENDENCY+"rtcomm.connection");}

  /* Store the configuration for the object, provided during the init() */
  this.config = {};
  /* Store the dependent objects */
  this.dependencies= {};
  /* Store private information */
  this._ = {};
  // Internal objects
  /*global Queues:false*/
  this._.queues = new Queues();
  /* services supported by the EndpointConnection, populated in init()*/
  this._.services = null;
  /* Instantiate the endpoint Registry */
  /*global EndpointRegistry:false */
  this._.endpointRegistry = new EndpointRegistry();
  this._.presenceMonitor = null;
  this._.objName = "EndpointProvider";
  this._.rtcommEndpointConfig = {};

  /** State of the EndpointProvider */ 
  this.ready = false;
  this.events = {
      /**
       * A new RtcommEndpoint was created from an inbound
       * @event module:rtcomm.EndpointProvider#newendpoint
       * @property {module:rtcomm.RtcommEndpoint}
       */
      'newendpoint': [],
      /**
       * The Session Queue was updated from the server
       * @event module:rtcomm.EndpointProvider#queueupdate
       * @property {module:rtcomm.Queues}
       *
       */
      'queueupdate': [],
      /**
       * The Presence was Updated 
       * @event module:rtcomm.EndpointProvider#presence_updated
       * @property {module:rtcomm.PresenceMonitor.presenceData}
       *
       */
      'presence_updated': [],
      /**
       * The endpoint Provider has reset.  Usually due to another peer logging in with the same presence. 
       * The event has a 'reason' property indicating why the EndpointProvider was reset.
       *
       * @event module:rtcomm.EndpointProvider#reset
       * @property {module:reason}
       *
       */
      'reset': []};

  /** init method
   *
   *  This method is required to be called prior to doing anything else.  If init() is called w/ a userid, the
   *  userid is *automatically* registered.  If it is called w/out a userid, then the EndpointProvider is 
   *  *anonymous*.  A userid will be generated for security purposes called 'GUEST-<randomnumber>'.  This is 
   *  necessary to have a localEndpointID that can be used for MQTT security.
   *
   * @param {Object} config
   * @param {string} config.server MQTT Server
   * @param {string} [config.userid] User ID or Identity
   * @param {string} [config.appContext=rtcomm] App Context for EndpointProvider
   * @param {string} [config.port=1883] MQTT Server Port. Defaults to 1883 (if no sslport set, we use this no matter what)
   * @param {string} [config.sslport=8883] MQTT Server Port.  Defaults to 8883 (used if served over https)
   * @param {string} [config.managementTopicName=management] managementTopicName on rtcomm server
   * @param {string} [config.rtcommTopicPath=/rtcomm/] MQTT Path to prefix managementTopicName with and register under
   * @param {boolean} [config.createEndpoint=false] Automatically create a {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint}
   * @param {boolean} [config.monitorPresence=true] Automatically create a presence monitor and emit events on the endpoint provider.
   * @param {boolean} [config.requireRtcommServer=false] Require an Rtcomm Server for routing 
   * @param {function} [onSuccess] Callback function when init is complete successfully.
   * @param {function} [onFailure] Callback funtion if a failure occurs during init
   *
   * @returns {module:rtcomm.EndpointProvider}
   *
   *
   * @example
   * var endpointProvider = new ibm.rtcomm.RtcommEndpointProvider();
   * var endpointProviderConfig = {
   *   server : 'messagesight.demos.ibm.com',
   *   userid : 'ibmAgent1@mysurance.org',
   *   rtcommTopicPath : '/rtcomm/',
   *   port : 1883,
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
    //if (this.ready) {
    //  l('INFO') && console.log('EndpointProvider.init() has been called and the object is READY');
    //  return this;
    //}
    // Used to set up config for endpoint connection;
    var config = null;
    var rtcommTopicPath = '/rtcomm/';
    // If we are served over SSL, use SSL is needed and we are going to use the 'sslport' unless port is set (and ssl was not).
    //
    var useSSL = true;
    var defaultPort = 1883;
    var defaultSSLPort = 8883;

    // Reset defaults based on URL
    if (typeof location !== 'undefined') {
       // No matter what, use SSL if served over ssl (won't work otherwise)
       useSSL = (location.protocol === 'https:') ? true : false;
       if (location.port === '' ) {
         // If it is empty, its a default port
         defaultPort = 80;
         defaultSSLPort = 443;
       } else {
         // By default, serve to whatever we were served over.
         defaultPort = parseInt(location.port);
         defaultSSLPort = parseInt(location.port);
       }
    }
    var configDefinition = {
        required: {},
        optional: {
          server: 'string', 
          credentials : 'object',
          rtcommTopicPath: 'string',
          managementTopicName: 'string',
          presence: 'object',
          userid: 'string',
          useSSL: 'boolean',
          port: 'number',
          sslport: 'number',
          monitorPresence: 'boolean',
          requireRtcommServer: 'boolean',
          createEndpoint: 'boolean',
          appContext: 'string'},
        defaults: {
          server: (location !== 'undefined' ? location.hostname : 'localhost'),
          rtcommTopicPath: rtcommTopicPath,
          managementTopicName: 'management',
          presence: { 
            // Relative to the rtcommTopicPath
            rootTopic: 'sphere/',
            topic: '/', // Same as rootTopic by default
          },
          useSSL: useSSL,
          appContext: 'rtcomm',
          // Note, if SSL is true then use 8883
          port: defaultPort, 
          sslport: defaultSSLPort, 
          monitorPresence: true,
          requireRtcommServer: false,
          createEndpoint: false }
      };
    // the configuration for Endpoint Provider
    if (options) {
      // Set any defaults
      // appContext/presence/userid may already be set, have to save them.
      var appContext = (this.config && this.config.appContext) ? this.config.appContext : null;
      var userid = (this.config && this.config.userid) ? this.config.userid : null;
      var presence = (this.config && this.config.presence) ? this.config.presence: null;

      /* global setConfig:false */
      config = this.config = setConfig(options,configDefinition);

      // this.config now has the options + combo with defaults.
      // If we are READY (we are resetting) so use the NEW ones... otherwise, use saved ones.
      this.config.appContext = options.appContext ? options.appContext : (appContext ? appContext : this.config.appContext) ; 
      this.setUserID((options.userid ? options.userid: (userid ? userid: this.config.userid)), true) ; 

      // If sslport was not set, but port was, use port.
      if (typeof options.sslport === 'undefined' && options.port) {
        this.config.sslport = this.config.port;
        l('DEBUG') && console.log(this+'.init() SSLPort not set, using port :'+this.config.sslport);
      } 
    } else {
      throw new Error("EndpointProvider initialization requires a minimum configuration: "+ 
                      JSON.stringify(configDefinition.required));
    }
    var endpointProvider = this;
    cbSuccess = cbSuccess || function(message) {
      l('DEBUG') && console.log(endpointProvider+'.init() Default Success message, use callback to process:', message);
    };
    cbFailure = cbFailure || function(error) {
      l('DEBUG') && console.log(endpointProvider+'.init() Default Failure message, use callback to process:', error);
    };

    // Create the Endpoint Connection  
    l('DEBUG') && console.log(this+'.init() Using config ', config);

    var connectionConfig =  util.makeCopy(config);
    // everything else is the same config.
    connectionConfig.hasOwnProperty('createEndpoint') &&  delete connectionConfig.createEndpoint;
    connectionConfig.hasOwnProperty('monitorPresence') &&  delete connectionConfig.monitorPresence;
    connectionConfig.hasOwnProperty('requireRtcommServer') &&  delete connectionConfig.requireRtcommServer;
    connectionConfig.publishPresence = true;
    if (connectionConfig.useSSL) {
      l('DEBUG') && console.log(this+'.init() configuring for SSL');
      connectionConfig.port = this.config.sslport;
    }
    connectionConfig.hasOwnProperty('sslport') &&  delete connectionConfig.sslport;

    // createEndpointConnection

    if (this.ready) {
      // we are init'd already. Re-init
      l('DEBUG') && console.log(this+'.init() Re-initializing with a new connection');
      if (this.dependencies.endpointConnection) {
        this.dependencies.endpointConnection.destroy();
      }
    }
    var endpointConnection = 
      this.dependencies.endpointConnection = 
      createEndpointConnection.call(this, connectionConfig);
    /*
     * onSuccess callback for endpointConnection.connect();
     */
    var onSuccess = function(message) {
      l('DEBUG') && console.log(endpointProvider+'.onSuccess() called ');
      var returnObj = {
          'ready': true,
          'endpoint': null,
          'registered': false
      };
      this.ready = true;
      /*
       * Depending on the configuration, the init() can do some different things
       * if there is a userid, we register.
       */
      if (config.createEndpoint) {
        returnObj.endpoint  = endpointProvider.createRtcommEndpoint();
      }
      // Attach endpointConnection if a presenceMonitor
      if (endpointProvider._.presenceMonitor) {
        l('DEBUG') && console.log(endpointProvider+'.init() Already have a presenceMonitor -- setting EndpointConnection');
        endpointProvider._.presenceMonitor.setEndpointConnection(endpointConnection);
      }
      // Update the userid
      endpointProvider.setUserID(config.userid,true);
      // If there is a userid and it DOES NOT START WITH GUEST we will publish presence.
      if (config.userid && !(/^GUEST/.test(config.userid))) {
        l('DEBUG') && console.log(endpointProvider+'.init() publishing presence: '+ config.userid+'|'+config.appContext);
        // Publish our presence if we have a userid
        endpointProvider.publishPresence();
        if (config.monitorPresence) {
          // Attach a default presence monitor to our presence topic
          l('DEBUG') && console.log(endpointProvider+'.init() Attaching Presence Monitor to: '+ config.presence.topic);
          // Always monitor our own topic...
          endpointProvider.getPresenceMonitor(config.presence.topic);
        }
        returnObj.registered = true;
      }
      /* In the case where we REQUIRE an rtcomm Server, everything must go through it and init will fail if it isn't there */
      if (config.requireRtcommServer) {
        l('DEBUG') && console.log(endpointProvider+'.onSuccess() require a server, executing serviceQuery...');
        endpointConnection.serviceQuery(function(services) {
          // we don't care about the services, dropping
          cbSuccess(returnObj);
        }, onFailure.bind(endpointProvider));
      } else {
        // Still make the call, but we don't care about success
        endpointConnection.serviceQuery();
        cbSuccess(returnObj);
      }
    };
    /*
     * onFailure for EndpointConnection.connect()
     */
    var onFailure = function(error) {
      this.ready = false;
      if (error.name === 'CONNLOST') {
        // we need to emit this rather than call the callback
        this.reset('Connection Lost');
      } else if (error.name === 'MULTIPLE_SERVERS') {
        this.reset(error.message);
      } else { 
        cbFailure(error);
      }
    };
    // Connect!
    endpointConnection.connect(onSuccess.bind(this), onFailure.bind(this));
    // Return ourself for chaining.
    return this;
  };  // End of RtcommEndpointProvider.init()

  this.stop = this.destroy;
  this.start = this.init;
  this.reset = function reset(reason) {
     console.error(this+'.reset() called reason: '+reason);
     var endpointProvider = this;
      endpointProvider.emit('reset', {'reason':reason});
      setTimeout(function() {
        endpointProvider.destroy();
      },500);
  };

  /*
   * Create the endpoint connection to the MQTT Server
   * // bind endpointProvider as this when called
   */
  var createEndpointConnection = function createEndpointConnection(config) {

    var endpointProvider = this;
    var endpointConnection = new connection.EndpointConnection(config);

    // If we already h some enpdoints, their connection will be null, fix it
    if (this._.endpointRegistry.length() > 0 ) {
      this._.endpointRegistry.list().forEach(function(endpoint) {
        endpoint.setEndpointConnection(endpointConnection);
      });
    }
    // Propogate our loglevel
    //
    endpointConnection.setLogLevel(getLogLevel());

    endpointConnection.on('servicesupdate', function(services) {
      endpointProvider._.services = services;
      endpointProvider.updateQueues();
    });

    endpointConnection.on('newsession', function(session) {
      /*
       * What to do on an inbound request.
       * Options:
       *  Do we have a default endpoint?  if so, just give the session to it.
       *  if that endpoint is busy, create a new endpoint and emit it.
       *  If there isn't a endpoint, create a Endpoint and EMIT it.
       *
       */
      if(session) {
        l('DEBUG') && console.log(endpointProvider+'-on.newsession Handle a new incoming session: ', session);
        // Send it to the same id/appContext;
        //
        l('DEBUG') && console.log(endpointProvider+'-on.newsession endpointRegistry: ', endpointProvider._.endpointRegistry.list());
        var endpoint = endpointProvider._.endpointRegistry.getOneAvailable(); 
        if (endpoint) {
          l('DEBUG') && console.log(endpointProvider+'-on.newsession giving session to Existing Endpoint: ', endpoint);
          endpoint.newSession(session);
        } else if (endpointProvider.hasEventListener('newendpoint'))  {
          // create an endpoint and send it to the listener.
          endpoint = endpointProvider.getRtcommEndpoint();
          l('DEBUG') && console.log(endpointProvider+'-on.newsession Created a NEW endpoint for session: ', endpoint);
          endpoint.newSession(session);
          endpointProvider.emit('newendpoint', endpoint);
        } else {
          // If there is no 'newendpoint' listener, we really only support 1 endpoint.  pass it to that one,
          // it will need to respond if its busy.
          var endpoints = endpointProvider._.endpointRegistry.list();
          if (endpoints.length > 1) {
            // Fail the session, we don't know where to send it.
            session.start();
            session.fail('Unable to accept inbound call: Busy');
            console.error(endpointProvider+
            '-on.newsession - Rejecting session, ambiguous enpdoint selection; add newendpoint callback? ');
          } else {
            // Do not emit anything... 
            endpoints[0].newSession(session);
          }
        }
      } else {
        console.error(endpointProvider+'-on.newsession - expected a session object to be passed.');
      }
    });

    endpointConnection.on('message', function(message) {
      if(message) {
        l('TRACE') && console.log("TODO:  Handle an incoming message ", message);
      }
    });
    endpointConnection.on('document_replaced', function(message) {
      // 'reset' w/ a Reason?
      l('TRACE') && console.log("Document Replaced event received", message);
      endpointProvider.reset("document_replaced");
    });
    return endpointConnection; 
  }; // End of createEndpointConnection

  /**
   * Pre-define RtcommEndpoint configuration.  This provides the means to create a common
   * configuration all RtcommEndpoints will use, including the same event handlers.  
   *
   * *NOTE* This should be set PRIOR to calling getRtcommEndpoint()
   *
   *  @param {module:rtcomm.RtcommEndpoint~config}  [config] - Any of the parameters in this object can be passed.
   *  @param {function} [config.event] Events are defined in {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint}
   *
   * @example
   *
   * endpointProvider.setRtcommEndpointConfig({
   *   appContext : "testApp",
   *   ringtone: "resources/ringtone.wav",
   *   ringbacktone: "resources/ringbacktone.wav",
   *   chat: true,
   *   chatConfig: {},
   *   webrtc:true,
   *   webrtcConfig:{
   *     broadcast: { audio: true, video: true},
   *     iceServers: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
   *   },
   *   'session:started': function(event) {
   *
   *   }, 
   *   'session:alerting': function(event) {
   *
   *   }
   *   });
   */
  this.setRtcommEndpointConfig = function setRtcommEndpointCallbacks(options) {
    this._.rtcommEndpointConfig = util.combineObjects(options, this._.rtcommEndpointConfig);
  };
  /** 
   *  Factory method that returns a RtcommEndpoint object to be used by a UI component.
   *  <p>
   *  The RtcommEndpoint object provides an interface for the UI Developer to attach 
   *  Video and Audio input/output. Essentially mapping a broadcast stream(a MediaStream 
   *  that is intended to be sent) to a RTCPeerConnection output stream.   When an inbound 
   *  stream is added to a RTCPeerConnection, then the RtcommEndpoint object also informs the
   *  RTCPeerConnection where to send that stream in the User Interface.
   *  </p>
   *
   *  @param {module:rtcomm.RtcommEndpoint~config}  [config] - Any of the parameters in this object can be passed.
   *  @returns {module:rtcomm.RtcommEndpoint} RtcommEndpoint 
   *  @throws Error
   *
   * @example
   *  var endpointProvider = new rtcomm.EndpointProvider();
   *  var endpointConfig = {
   *    chat: true,
   *    webrtc: true,
   *    };
   *  endpointProvider.getRtcommEndpoint(endpointConfig);
   *
   */
  this.getRtcommEndpoint = function getRtcommEndpoint(endpointConfig) {
    var endpointProvider = this;
    var endpointid = null;
    var endpoint = null;
    var defaultConfig = {
        chat: true,
        webrtc: true,
        autoEnable: false,
        parent:this
    };

    /*
     * If endpointConfig is not an Object, it should be a String that is an ID of an endpoint
     */
    if (endpointConfig && typeof endpointConfig !== 'object') {
      endpointid = endpointConfig;
      l('DEBUG') && console.log(this+'.getRtcommEndpoint() Looking for endpoint: '+endpointid);
      // Returns an array of 1 endpoint. 
      endpoint = this._.endpointRegistry.get(endpointid)[0];
      l('DEBUG') && console.log(this+'.getRtcommEndpoint() found endpoint: ',endpoint);
    } else {
      if (typeof this.config.appContext === 'undefined') {
        throw new Error('Unable to create an Endpoint without appContext set on EndpointProvider');
      }
      /*
       * First, if there is a config defined on the provider, we are going to use it:
       */
      // Merge the objects, will still have callbacks.

      var objConfig = util.combineObjects(this._.rtcommEndpointConfig, defaultConfig);
      // 
      // If we have any callbacks defined, put in their own object for later.
      //
      var endpointCallbacks = {};
      Object.keys(objConfig).forEach(function(key){
         if (typeof objConfig[key] === 'function') {
           endpointCallbacks[key] = objConfig[key];
           delete objConfig[key];
         }
      });
      // Any passed in config overrides the existing config.
      applyConfig(endpointConfig, objConfig);
      // Add some specific config from the EndpointProvider
      objConfig.appContext = this.config.appContext;
      objConfig.userid = this.config.userid;
      l('DEBUG') && console.log(this+'.getRtcommEndpoint using config: ', objConfig);
      // Create the endpoint
      endpoint = new RtcommEndpoint(objConfig);
      // attach the endpointConnection if it exists. 
      this.dependencies.endpointConnection && endpoint.setEndpointConnection(this.dependencies.endpointConnection);
      // If the endpoint is destroyed, define the behavior to cleanup.
      endpoint.on('destroyed', function(event_object) {
        endpointProvider._.endpointRegistry.remove(event_object.endpoint);
      });
      // Add to registry or return the one already there
      endpoint = this._.endpointRegistry.add(endpoint);
      l('DEBUG') && console.log('ENDPOINT REGISTRY: ', this._.endpointRegistry.list());
      // Attach the callbacks
      Object.keys(endpointCallbacks).forEach(function(key) {
         if (typeof endpointCallbacks[key] === 'function') {
           try {
             if (key === 'bubble') {
               // this is actually a special behavior and should be handled separately
               endpoint.bubble(endpointCallbacks[key]);
             } else {
               endpoint.on(key, endpointCallbacks[key]);
             }
           } catch (e) {
            console.error(e);
            console.error('Invalid event in rtcommEndpointConfig: '+key);
           }
         }
        });
    }
    return endpoint;
  };
  /* deprecated */
  this.createRtcommEndpoint = this.getRtcommEndpoint;

  /** Create Mqtt Endpoint 
   * @returns {module:rtcomm.MqttEndpoint} */
  this.getMqttEndpoint = function() {
    return new MqttEndpoint({connection: this.dependencies.endpointConnection});
  };

  /** 
   * Get the PresenceMonitor Object 
   *
   * This object is used to add topics to monitor for presence. 
   *
   * @returns {module:rtcomm.PresenceMonitor}
   */
  this.getPresenceMonitor= function(topic) {
    var endpointProvider = this;
    function createPresenceMonitor(configObject) {
      var pm = new PresenceMonitor(configObject);
      pm.on('updated', function(presenceData) {
        endpointProvider.emit('presence_updated', {'presenceData': presenceData});
      });
      return pm;
    }
    this._.presenceMonitor  = this._.presenceMonitor || createPresenceMonitor({connection: this.dependencies.endpointConnection});
    if (this.ready) {
      l('DEBUG') && console.log(this+'.getPresenceMonitor Monitoring topic: '+topic); 
      topic && this._.presenceMonitor.add(topic);
    } else {  
      l('DEBUG') && console.log(this+'.getPresenceMonitor Not adding monitor for topic: '+topic); 
    }
    // propogate the event out if we have a handler.
    return this._.presenceMonitor;
  };
  /** 
   * Destroy all endpoints and cleanup the endpointProvider.
   */
  this.destroy = function() {
    this.leaveAllQueues();
    this.clearEventListeners();
    // Clear callbacks
    this._.endpointRegistry.destroy();
    this._.presenceMonitor && this._.presenceMonitor.destroy();
    this._.presenceMonitor = null;
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointRegistry');
    this.dependencies.endpointConnection && this.dependencies.endpointConnection.destroy();
    this.dependencies.endpointConnection = null;
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointConnection');
    this.ready = false;
  };

  /**
   * Set the AppContext. 
   *
   * It is necessary to call setAppContext() prior to getRtcommEndpoint() if
   * init() has not been called
   * 
   * @returns {module:rtcomm.EndpointProvider} EndpointProvider object
   * @throws {Error} Cannot change appContext once init'd
   */

  this.setAppContext = function(context) {
    if (!this.ready) {
      l('DEBUG') && console.log(this+'.setAppContext() Setting appContext to: '+context);
      this.config.appContext = context;
      return this;
    } else {
      throw new Error ('Cannot change appContext once inited, using appContext: ', this.config.appContext);
    }
  };

  /*
   * Set the userId -- generally used prior to init.
   * cannot overwrite an existing ID, but will propogate to endpoints.
   *
   * If we are anonymous, can update the userid
   */
  this.setUserID = function(userid,force) {
    // If we are READY we can only do this when true.
    if (!this.ready || (this.ready && force) || /^GUEST/.test(this.config.userid)) {
      l('DEBUG') && console.log(this+'.setUserID() called with: '+userid);
      userid = (this.getEndpointConnection()) ? this.getEndpointConnection().setUserID(userid):userid;
      l('DEBUG') && console.log(this+'.setUserID() Set userid to: '+userid);
      this.config.userid = this._.id = userid;
      // update the endpoints
      this._.endpointRegistry.list().forEach(function(endpoint){
        endpoint.setUserID(userid);
      });
      l('DEBUG') && console.log(this+'.setUserID() Set userid to: '+userid);
    } else {
      throw new Error('Cannot change UserID in this state');
    }
    return this;
  };
  /**
   * Make your presence available
   *
   * @param {object} presenceConfig 
   * @param {string} presenceConfig.state One of 'available', 'unavailable', 'away', 'busy'
   * @param {string} presenceConfig.alias An alias to be associated with the presence record
   * @param {array} presenceConfig.userDefines  Array of userdefined objects associated w/ presence
   *
   */
  this.publishPresence = function(presenceConfig) {
    // Possible states for presence
    var states = {
      'available': 'available',
      'unavailable': 'unavailable',
      'busy':'busy' 
    };
    // Always default to available
    var state = (presenceConfig && presenceConfig.state) ?
      states[presenceConfig.state.trim()] || 'available' : 
      'available';
    presenceConfig = presenceConfig || {};
    presenceConfig.state = state;
    // build a message, publish it as retained.
    var doc = this.getEndpointConnection().createPresenceDocument(presenceConfig);
    this.getEndpointConnection().publishPresence(doc);
    return this;
  };
  /**
   * Update queues from server
   * @fires module:rtcomm.EndpointProvider#queueupdate
   */
  this.updateQueues= function updateQueues() {
    this._.queues.add((this._.services && 
                     this._.services.RTCOMM_CALL_QUEUE_SERVICE && 
                     this._.services.RTCOMM_CALL_QUEUE_SERVICE.queues) ||
                     []);
    this.emit('queueupdate', this._.queues.all());
    l('DEBUG') && console.log(this+'.updateQueues() QUEUES: ',this._.queues.list());
  };
  /**
   * Join a Session Queue
   * <p>
   * A Session Queue is a subscription to a Shared Topic.  By joining a queue, it enables
   * the all RtcommEndpoints to be 'available' to receive an inbound request from the queue topic.
   * Generally, this could be used for an Agent scenario where many endpoints have joined the 
   * queue, but only 1 endpoint will receive the inbound request.  
   * </p>
   *
   * @param {string} queueid Id of a queue to join.
   * @returns {boolean} Queue Join successful
   *
   * @throws {Error} Unable to find Queue specified
   *
   */
  this.joinQueue= function joinQueue(/*String*/ queueid, /*object*/ options) {
  // Is queue a valid queuename?
    var endpointProvider = this;
    // No more callback
    var q = this._.queues.get(queueid);
    l('DEBUG') && console.log(this+'.joinQueue() Looking for queueid:'+queueid);
    if (q) {
      // Queue Exists... Join it
      // This callback is how inbound messages (that are NOT START_SESSION would be received)
      q.active = true;
      q.callback = null;
      q.autoPause = (options && options.autoPause) || false;
      q.regex = this.dependencies.endpointConnection.subscribe(q.topic);
      return true;
    } else {
      throw new Error('Unable to find queue('+queueid+') available queues: '+ this._.queues.list());
    }
  };
  /**
   * Leave a queue
   * @param {string} queueid Id of a queue to leave.
   */
  this.leaveQueue= function leaveQueue(queueid) {
    var q = this._.queues.get(queueid);
    if (q && !q.active) {
      l('DEBUG') && console.log(this+'.leaveQueue() - Not Active,  cannot leave.');
      return true;
    }
    if (q) {
     q.active = false;
     this.dependencies.endpointConnection.unsubscribe(q.topic);
     l('DEBUG') && console.log(this+ '.leaveQueue() left queue: '+queueid);
     return true;
    } else {
      console.error(this+'.leaveQueue() Queue not found: '+queueid);
      return false;
    }
  };

  /**
   * Leave all queues currently joined
   */
  this.leaveAllQueues = function() {
    var self = this;
    this.listQueues().forEach(function(queue) {
      self.leaveQueue(queue);
    });
  };
  /**
   * List Available Session Queues
   *
   * @returns {object} Object keyed on QueueID. The value is a Queue Object
   * that can be used to determine is the queue is active or not.
   *
   */
  this.getAllQueues = function() {
    return  this._.queues.all();
  };

  this.listQueues = function() {
    return  this._.queues.list();
  };
  this.getServices = function() {
    return this._.services;
  };
  /** Return the userID the EndpointProvider is using */
  this.getUserID= function() {
    return  this.config.userid;
  };
  /** Return the endpointConnection the EndpointProvider is using */
  this.getEndpointConnection = function() {
    return this.dependencies.endpointConnection;
  };

  /** Set LogLevel 
   *  @method
   *  @param {string} INFO, MESSAGE, DEBUG, TRACE
   */
  this.setLogLevel = setLogLevel;

  /** Return  LogLevel 
   * @method
   *  @returns {string} INFO, MESSAGE, DEBUG, TRACE
   */
  this.getLogLevel = getLogLevel;

  /** Return  requireRtcommServer
   * @method
   *  @returns {boolean} 
   */

  this.requireServer = function() {
    return this.config.requireRtcommServer;
  };
  /** Array of {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint} objects that 
   * are associated with this  EndpointProvider
   *  @returns {Array} Array of {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint} 
   */
  this.endpoints = function() {
    return this._.endpointRegistry.list();
  };
  /** Return object indicating state of EndpointProvider 
   *  *NOTE* Generally used for debugging purposes 
  */
  this.currentState = function() {
    return {
      'ready': this.ready,
      'events': this.events,
      'dependencies':  this.dependencies,
      'private':  this._,
      'config' : this.config,
      'queues': this.getAllQueues(),
      'endpointRegistry': this._.endpointRegistry.list()
    };

  };
}; // end of constructor

EndpointProvider.prototype = util.RtcommBaseObject.extend({});
