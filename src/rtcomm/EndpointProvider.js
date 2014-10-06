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
  this.config = {};
  // Internal objects
  this.ready = false;
  this.queues = new Queues();
  this.events = {
      /**
       * A new RtcommEndpoint was created from an inbound
       * @event module:rtcomm.EndpointProvider#newendpoint
       * @property {module:rtcomm#RtcommEndpoint}
       */
      'newendpoint': [],
      'queueupdate': []};

  /** services supported by the EndpointConnection, populated in init()*/
  this.services = null;

  /**
   * EndpointProvider Init config object
   * @typedef  {Object} module:rtcomm.EndpointProvider~InitOptions
   * @property {string} server MQTT Server
   * @property {string} [port=1883] MQTT Server Port
   * @property {string} userid User ID or Identity
   * @property {string} [rtcommTopicName=endpointConnection] rtcommTopicName on rtcomm server
   * @property {string} [topicPath=/rtcomm/] MQTT Path to prefix rtcommTopicName with and register under
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
   *   rtcommTopicName : 'endpointConnector',
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
    var endpointConnection = this.endpointConnection = createEndpointConnection.call(this, connectionConfig);
    console.log(this+'.init() this.config is: ', JSON.stringify(this.config));
    console.log('created endpointConnection: ', this.endpointConnection);
    // onSuccess callback for endpointConnection.connect();
    var onSuccess = function(message) {
      console.log('endpointProvider success callback called');
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
  };  // End of RtcommEndpointProvider.init()

  /*
   * Create the endpoint connection to the MQTT Server
   * // bind endpointProvider as this when called
   */
  var createEndpointConnection = function createEndpointConnection(config) {
    console.log('REMOVE ME: CREATING ENDPOINT CONNECTION');
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
      endpointProvider.services = services;
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
   * @typedef {object} module:rtcomm.EndpointProvider~EndpointConfig
   *  @property {String} [appContext=rtcomm] Use an appContext with the Endpoint
   *  @property {String} [userid] Specify a userid if not specified in the init()
   *  @property {boolean} [anonymous=false] A userid will not be provided if true.
   *  @property {boolean} [audio=true] Support audio in the PeerConnection - defaults to true
   *  @property {boolean} [audio=true] Support audio in the PeerConnection - defaults to true
   *  @property {boolean} [video=true] Support video in the PeerConnection - defaults to true
   *  @property {boolean} [data=true]  Support data in the PeerConnection - defaults to true
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
  var getRtcommEndpoint = function getRtcommEndpoint(endpointConfig) {
    var endpointid = null;
    var endpoint = null;
    var defaultConfig = {
        autoAnswer: false,
        anonymous: false,
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
      endpoint = Object.create(RtcommEndpoint);
      endpoint.init(objConfig);
      // Add to registry or return the one already there
      console.log('ENDPOINT REGISTRY: ', endpointRegistry);
      endpoint = endpointRegistry.add(endpoint);
    }
    return endpoint;
  };

  this.getRtcommEndpoint = this.createRtcommEndpoint = getRtcommEndpoint;

  this.createMqttEndpoint = this.getMqttEndpoint = function() {
    return new MqttEndpoint({connection: this.endpointConnection});
  };

  this.destroy = function() {
    endpointRegistry.destroy();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointRegistry');
    this.endpointConnection.destroy();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of endpointConnection');

  };

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
     */
    this.updateQueues= function updateQueues() {
      this.queues.add((this.services && 
                       this.services.RTCOMM_CALL_QUEUE_SERVICE && 
                       this.services.RTCOMM_CALL_QUEUE_SERVICE.queues) ||
                       []);
      this.emit('queueupdate', this.queues.list());
      l('DEBUG') && console.log(this+'.updateQueues() QUEUES: ',this.queues.list());
    };
    /**
     * Join a Session Queue
     *
     * A Session Queue is a subscription to a Shared Topic.  By joining a queue, it enables
     * the RtcommEndpoint to be 'available' to receive an inbound request from the queue topic.
     * Generally, this could be used for an Agent scenario where many endpoints have joined the 
     * queue, but only 1 endpoint will receive the inbound request.  Upon receipt, we immediately
     * unsubscribe.  
     *
     * TODO:  Immediate unsubscribe will be an option upon adding chat support. 
     *
     * @param {string} queueid Id of a queue to join.
     * @param {object} [options]  set autoPause:true to autopase queue when a message is received Options to use for queue
     *
     */
    this.joinQueue= function joinQueue(/*String*/ queueid, /*object*/ options) {
    // Is queue a valid queuename?
      var endpointProvider = this;
      var callback = function(message) {
        //TODO: Emit only part of message or verify we should accept it?
        console.log('Received a normal message from Queue', message);
        rtcommEP.emit('message', message);
      };
      var q = this.queues.get(queueid);
      l('DEBUG') && console.log(this+'.joinQueue() Looking for queueid:'+queueid);
      if (q) {
        // Queue Exists... Join it
        // This callback is how inbound messages (that are NOT START_SESSION would be received)
        q.active = true;
        q.callback = callback;
        q.autoPause = (options && options.autoPause) || false;
        q.regex = this.endpointConnection.subscribe(q.topic, callback);
        return true;
      } else {
        throw new Error('Unable to find queue('+queueid+') available queues: '+ this.queues.list());
      }
    };
    /**
     * Leave a queue
     * @param {string} queueid Id of a queue to leave.
     */
    this.leaveQueue= function leaveQueue(queueid) {
      var q = this.queues.get(queueid);
      if (q && !q.active) {
        l('DEBUG') && console.log(this+'.leaveQueue() - Not Active,  cannot leave.');
        return true;
      }
      if (q) {
       q.active = false;
       this.endpointConnection.unsubscribe(q.topic);
       return true;
      } else {
        console.error(this+'.leaveQueue() Queue not found: '+queueid);
        return false;
      }
    };
    /**
     * List Available Session Queues
     *
     * @returns {object} Object keyed on QueueID. The value is a Queue Object
     * that can be used to determine is the queue is active or not.
     *
     */
    this.getAllQueues = function() {
      return  this.queues.all();
    };

  // exposing module global functions for set/get loglevel
  this.setLogLevel = setLogLevel;
  this.getLogLevel = getLogLevel;

  /** available endpoints */
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


