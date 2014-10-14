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
 * Provides Services to register a user and create RtcommEndpoints
 * <p>
 * This programming interface lets a JavaScript client application use a {@link module:rtcomm.RtcommEndpoint|Real Time Communication Endpoint}
 * to implement WebRTC simply. When {@link module:rtcomm.EndpointProvider|instantiated} & {@link module:rtcomm.RtcommEndpointProvider#init|initialized} the
 * EndpointProvider connects to the defined MQTT Server and subscribes to a unique topic that is used to receive inbound communication.
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
  /*global connection:false*/

  var MISSING_DEPENDENCY = "RtcommEndpointProvider Missing Dependency: ";
  if (!util) { throw new Error(MISSING_DEPENDENCY+"rtcomm.util");}
  if (!connection) { throw new Error(MISSING_DEPENDENCY+"rtcomm.connection");}

  /* Instantiate the endpoint Registry */
  /*global EndpointRegistry:false */
  var endpointRegistry = new EndpointRegistry();

  /** Store the configuration for the object, provided during the init() */
  this.config = {};
  /* Store the dependent objects */
  this.dependencies= {};
  /* Store private information */
  this._private = {};
  // Internal objects
  /*global Queues:false*/
  this._private.queues = new Queues();
  /* services supported by the EndpointConnection, populated in init()*/
  this._private.services = null;

  /**
   * State of the EndpointProvider
   * @type {boolean}
   */ 
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
       */
      'queueupdate': []};



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
   * @param {string} [config.port=1883] MQTT Server Port
   * @param {string} [config.rtcommTopicName=management] rtcommTopicName on rtcomm server
   * @param {string} [config.topicPath=/rtcomm/] MQTT Path to prefix rtcommTopicName with and register under
   * @param {boolean} [config.createEndpoint=false] Automatically create a {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint}
   * @param {function} [onSuccess] Callback function when init is complete successfully.
   * @param {function} [onFailure] Callback funtion if a failure occurs during init
   *
   * @returns {module:rtcomm.EndpointProvider}
   *
   *
   * @example
   * var endpointProvider = new ibm.rtcomm.RtcommEndpointProvider();
   * var endpointProviderConfig = {
   *   server : 'broker.mqttdashboard.com',
   *   userid : 'ibmAgent1@mysurance.org',
   *   topicPath : '/rtcomm/',
   *   port : 8000,
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
  this.start = function init(options, cbSuccess, cbFailure) {
    // You can only be init'd 1 time, without destroying reconnecting.
    if (this.ready) {
      l('INFO') && console.log('EndpointProvider.init() has been called and the object is READY');
      return this;
    }

    // Used to set up config for endoint connection;
    var config = null;
    var configDefinition = {
        required: { server: 'string', port: 'number'},
        optional: {
          credentials : 'object',
          topicPath: 'string',
          rtcommTopicName: 'string',
          userid: 'string',
          createEndpoint: 'boolean',
          appContext: 'string'},
        defaults: {
          topicPath: '/rtcomm/',
          rtcommTopicName: 'management',
          appContext: 'rtcomm',
          port: 1883,
          register: false,
          createEndpoint: false }
      };
    // the configuration for Endpoint Provider
    if (options) {
      /* global setConfig:false */
      // Set any defaults
      // appContext may already be set, ahve to save it.
      var appContext = (this.config && this.config.appContext) ? this.config.appContext : null;
      config = this.config = setConfig(options,configDefinition);
      this.config.appContext = appContext || this.config.appContext;
    } else {
      throw new Error("EndpointProvider initialization requires a minimum configuration: "+ JSON.stringify(configDefinition.required));
    }
    var endpointProvider = this;

    cbSuccess = cbSuccess || function(message) {
      console.log(endpointProvider+'.init() Default Success message, use callback to process:', message);
    };
    cbFailure = cbFailure || function(error) {
      console.log(endpointProvider+'.init() Default Failure message, use callback to process:', error);
    };

    // Create the Endpoint Connection  

    var connectionConfig =  util.makeCopy(config);
    // everything else is the same config.
    connectionConfig.hasOwnProperty('register') && delete connectionConfig.register;
    connectionConfig.hasOwnProperty('createEndpoint') &&  delete connectionConfig.createEndpoint;

    // createEndpointConnection
    var endpointConnection = this.dependencies.endpointConnection = createEndpointConnection.call(this, connectionConfig);
    // onSuccess callback for endpointConnection.connect();
    var onSuccess = function(message) {
      l('DEBUG') && console.log('endpointProvider success callback called');
      var returnObj = {
          'ready': true,
          'registered': false,
          'endpoint': null
      };
      this.ready = true;
      /*
       * Depending on the configuration, the init() can do some different things
       *
       * if there is a userid, we register.
       */
      if (config.userid) {
        l('DEBUG') && 
          console.log(endpointProvider+'.init() Registering with rtcomm server as: '+ config.userid+'|'+config.appContext);
        endpointConnection.register(function(message){
            returnObj.registered = true;
            if (config.createEndpoint) {
              returnObj.endpoint  = endpointProvider.createRtcommEndpoint();
            }
            setUserID.call(endpointProvider, config.userid);
            cbSuccess(returnObj);
          },
          function(error) {
              cbFailure(error);
          });
      } else {
        // We are anonymous
        l('DEBUG') && 
          console.log(endpointProvider+'.init() anonymous provider, outbound support only');
        setUserID.call(endpointProvider, endpointConnection.setUserID());
        endpointConnection.serviceQuery();
        if (config.createEndpoint) {
          returnObj.endpoint  = endpointProvider.createRtcommEndpoint();
        }
        cbSuccess(returnObj);
      }
    };
    /*
     * onFailure for EndpointConnection
     */
    var onFailure = function(error) {
      this.ready = false;
      cbFailure(error);
    };
    // Connect!
    l('DEBUG') && console.log('calling connect');
    endpointConnection.connect( onSuccess.bind(this), onFailure.bind(this));
    // Return ourself for chaining.
    return this;
  };  // End of RtcommEndpointProvider.init()

  this.stop = this.destroy;
  this.init = this.start;

  /*
   * Create the endpoint connection to the MQTT Server
   * // bind endpointProvider as this when called
   */
  var createEndpointConnection = function createEndpointConnection(config) {
    var endpointProvider = this;
    var endpointConnection = new connection.EndpointConnection(config);

    // If we already have some enpdoints, their connection will be null, fix it
    if (endpointRegistry.length() > 0 ) {
      endpointRegistry.list().forEach(function(endpoint) {
        endpoint.setEndpointConnection(endpointConnection);
      });
    }
    // Propogate our loglevel
    //
    endpointConnection.setLogLevel(getLogLevel());

    endpointConnection.on('servicesupdate', function(services) {
      endpointProvider._private.services = services;
      endpointProvider.updateQueues();
    });

    endpointConnection.on('newsession', function(session) {
      /*
       * What to do on an inbound request.
       * Options:
       *  Do we have a default endpoint?  if so, just give the session to it.
       *  if that endpoint is busy, create a new endpoint and emit it.
       *
       *  If there isn't a endpoint, create a Endpoint and EMIT it.
       *
       */
      if(session) {
        l('DEBUG') && console.log("Handle a new incoming session: ", session);
        // Send it to the same id/appContext;
        l('DEBUG') && console.log("endpointRegistry: ", endpointRegistry.list());
        var endpoint = endpointRegistry.get() || null;
        //TODO:  For the Queue thing, we need to lookup based on the session.source
        l('DEBUG') && console.log("giving session to Endpoint: ", endpoint);
        if (endpoint && endpoint.available) {
          endpoint.newSession(session);
        } else {
          endpoint = endpointProvider.getRtcommEndpoint();
          l('DEBUG') && console.log("Creating a new endpoint for  session: ", endpoint);
          endpoint.newSession(session);
          endpointProvider.emit('newendpoint', endpoint);
          // Deny the session.
          // session.respond(false, 'No endpoint for appContext:  '+ session.appContext);
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
    return endpointConnection; 
  }; // End of createEndpointConnection

  /** 
   * getRtcommEndpoint
   * Factory method that returns a RtcommEndpoint object to be used by a UI component.
   *
   *  The RtcommEndpoint object provides an interface for the UI Developer to attach Video and Audio input/output.
   *  Essentially mapping a broadcast stream(a MediaStream that is intended to be sent) to a RTCPeerConnection output
   *  stream.   When an inbound stream is added to a RTCPeerConnection, then the RtcommEndpoint object also informs the
   *  RTCPeerConnection where to send that stream in the User Interface.
   *
   *  @param {Object}  [config] 
   *  @param {boolean} [config.audio=true] Support audio in the PeerConnection - defaults to true
   *  @param {boolean} [config.video=true] Support video in the PeerConnection - defaults to true
   *  @param {boolean} [config.data=true]  Support data in the PeerConnection - defaults to true
   *
   *  @returns {module:rtcomm.RtcommEndpoint} RtcommEndpoint 
   *  @throws Error
   *
   * @example
   *  var endpointProvider = new rtcomm.EndpointProvider();
   *  var endpointConfig = {
   *    audio: true,
   *    video: true,
   *    data: false,
   *    autoAnswer: false
   *    };
   *  endpointProvider.getRtcommEndpoint(endpointConfig);
   *
   */
  this.getRtcommEndpoint = function getRtcommEndpoint(endpointConfig) {
    var endpointProvider = this;
    var endpointid = null;
    var endpoint = null;
    var defaultConfig = {
        autoAnswer: false,
        audio: true,
        video: true,
        data: true,
        parent:this,
    };
    var objConfig = defaultConfig;
    if (typeof this.config.appContext === 'undefined') {
      throw new Error('Unable to create an Endpoint without appContext set on EndpointProvider');
    }
    if(endpointConfig && typeof endpointConfig !== 'object') {
      endpointid = endpointConfig;
      endpoint = endpointRegistry.get(endpointid);
    } else {
      applyConfig(endpointConfig, objConfig);
      objConfig.appContext = this.config.appContext;
      objConfig.userid = this.config.userid;
      l('DEBUG') && console.log(this+'.getRtcommEndpoint using config: ', objConfig);
      endpoint = new RtcommEndpoint();
      endpoint.init(objConfig);
      endpoint.on('destroyed', function(endpoint) {
        endpointRegistry.remove(endpoint);
      });
      // Add to registry or return the one already there
      console.log('ENDPOINT REGISTRY: ', endpointRegistry);

      endpoint = endpointRegistry.add(endpoint);
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
  this.destroy = function() {
    this.leaveAllQueues();
    this.clearEventListeners();
    // Clear callbacks
    console.log('EndpointRegistry: '+endpointRegistry.list());
    endpointRegistry.destroy();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointRegistry');
    this.dependencies.endpointConnection && this.dependencies.endpointConnection.destroy();
    this.dependencies.endpointConnection = null;
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointConnection');
    this.ready = false;
    console.log('This.CurrentState --', this.currentState());
    
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
   * set the userId -- generally used prior to init.
   * cannot overwrite an existing ID, but will propogate to endpoints.
   */
  var setUserID = function(userid) {
    l('DEBUG') && console.log(this+'.setUserID() Setting userid to: '+userid);
    if (this.config.userid && (userid !== this.config.userid)) {
      throw new Error('Cannot change UserID once it is set');
    } else {
      this.config.userid = userid;
      // update the endpoints
      endpointRegistry.list().forEach(function(endpoint){
        endpoint.setUserID(userid);
      });
    }
  };
  /**
   * populate the session queues
   * @fires module:rtcomm.EndpointProvider#queueupdate
   */
  this.updateQueues= function updateQueues() {
    this._private.queues.add((this._private.services && 
                     this._private.services.RTCOMM_CALL_QUEUE_SERVICE && 
                     this._private.services.RTCOMM_CALL_QUEUE_SERVICE.queues) ||
                     []);
    this.emit('queueupdate', this._private.queues.all());
    l('DEBUG') && console.log(this+'.updateQueues() QUEUES: ',this._private.queues.list());
  };
  /**
   * Join a Session Queue
   *
   * A Session Queue is a subscription to a Shared Topic.  By joining a queue, it enables
   * the all RtcommEndpoints to be 'available' to receive an inbound request from the queue topic.
   * Generally, this could be used for an Agent scenario where many endpoints have joined the 
   * queue, but only 1 endpoint will receive the inbound request.  
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
    var q = this._private.queues.get(queueid);
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
      throw new Error('Unable to find queue('+queueid+') available queues: '+ this._private.queues.list());
    }
  };
  /**
   * Leave a queue
   * @param {string} queueid Id of a queue to leave.
   */
  this.leaveQueue= function leaveQueue(queueid) {
    var q = this._private.queues.get(queueid);
    if (q && !q.active) {
      l('DEBUG') && console.log(this+'.leaveQueue() - Not Active,  cannot leave.');
      return true;
    }
    if (q) {
     q.active = false;
     this.dependencies.endpointConnection.unsubscribe(q.topic);
     return true;
    } else {
      console.error(this+'.leaveQueue() Queue not found: '+queueid);
      return false;
    }
  };

  this.leaveAllQueues = function() {
    var self = this;
    this.listQueues().forEach(function(queue) {
      console.log('Trying to leave: queue.endpointID: ',queue);
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
    return  this._private.queues.all();
  };

  this.listQueues = function() {
    return  this._private.queues.list();
  };

  /** Return the userID the EndpointProvider is using */
  this.getUserID= function() {
    return  this.config.userid;
  };
  this.getEndpointConnection = function() {
    return this.dependencies.endpointConnection;
  };

  // exposing module global functions for set/get loglevel
  /** Set LogLevel 
   *  @param {string} INFO, MESSAGE, DEBUG, TRACE
   */
  this.setLogLevel = setLogLevel;
  /** Return  LogLevel 
   *  @returns {string} INFO, MESSAGE, DEBUG, TRACE
   */
  this.getLogLevel = getLogLevel;
  /** available endpoints
   *  @returns {Array} Array of Endpoint Objects 
   */
  this.endpoints = function() {
    return endpointRegistry.list();
  };
  this.currentState = function() {
    return {
      'ready': this.ready,
      'events': this.events,
      'dependencies':  this.dependencies,
      'private':  this._private,
      'config' : this.config,
      'queues': this.getAllQueues(),
      'endpointRegistry': endpointRegistry.list()
    };

  };
}; // end of constructor

EndpointProvider.prototype = util.RtcommBaseObject.extend({});


