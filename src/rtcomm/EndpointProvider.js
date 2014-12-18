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
 * & {@link module:rtcomm.RtcommEndpointProvider#init|initialized} the
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
  /*global connection:false*/

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
       *
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
   * @param {string} [config.managementTopicName=management] managementTopicName on rtcomm server
   * @param {string} [config.rtcommTopicPath=/rtcomm/] MQTT Path to prefix managementTopicName with and register under
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
    if (this.ready) {
      l('INFO') && console.log('EndpointProvider.init() has been called and the object is READY');
      return this;
    }
    // Used to set up config for endoint connection;
    var config = null;
    var rtcommTopicPath = '/rtcomm/';
    var configDefinition = {
        required: { server: 'string', port: 'number'},
        optional: {
          credentials : 'object',
          rtcommTopicPath: 'string',
          managementTopicName: 'string',
          presence: 'object',
          userid: 'string',
          createEndpoint: 'boolean',
          appContext: 'string'},
        defaults: {
          rtcommTopicPath: rtcommTopicPath,
          managementTopicName: 'management',
          presence: { 
            // Relative to the rtcommTopicPath
            rootTopic: 'sphere/',
            topic: '/', // Same as rootTopic by default
          },
          appContext: 'rtcomm',
          port: 1883,
          createEndpoint: false }
      };
    // the configuration for Endpoint Provider
    if (options) {
      // Set any defaults
      // appContext may already be set, have to save it.
      var appContext = (this.config && this.config.appContext) ? this.config.appContext : null;
      var userid = (this.config && this.config.userid) ? this.config.userid : null;
      var presence = (this.config && this.config.presence) ? this.config.presence: null;
      /* global setConfig:false */
      config = this.config = setConfig(options,configDefinition);
      this.config.appContext = appContext || this.config.appContext;
      this.setUserID(userid || this.config.userid);
    } else {
      throw new Error("EndpointProvider initialization requires a minimum configuration: "+ 
                      JSON.stringify(configDefinition.required));
    }
    var endpointProvider = this;
    cbSuccess = cbSuccess || function(message) {
      console.log(endpointProvider+'.init() Default Success message, use callback to process:', message);
    };
    cbFailure = cbFailure || function(error) {
      console.log(endpointProvider+'.init() Default Failure message, use callback to process:', error);
    };

    // Create the Endpoint Connection  
    l('DEBUG') && console.log(this+'.init() Using config ', config);

    var connectionConfig =  util.makeCopy(config);
    // everything else is the same config.
    connectionConfig.hasOwnProperty('createEndpoint') &&  delete connectionConfig.createEndpoint;
    connectionConfig.publishPresence = true;
    // createEndpointConnection
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
      if (config.userid) {
        l('DEBUG') && 
          console.log(endpointProvider+'.init() publishing presence: '+ config.userid+'|'+config.appContext);
        endpointProvider.publishPresence();
        endpointProvider.setUserID(config.userid);
        returnObj.registered = true;
      }
      // Update the userid
      endpointProvider.setUserID(config.userid);
      endpointConnection.serviceQuery();
      cbSuccess(returnObj);
    };
    /*
     * onFailure for EndpointConnection.connect()
     */
    var onFailure = function(error) {
      this.ready = false;
      cbFailure(error);
    };
    // Connect!
    endpointConnection.connect(onSuccess.bind(this), onFailure.bind(this));
    // Return ourself for chaining.
    return this;
  };  // End of RtcommEndpointProvider.init()

  this.stop = this.destroy;
  this.start = this.init;

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
    if (this._.presenceMonitor) {
      this._.presenceMonitor.setEndpointConnection(endpointConnection);
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
        console.log("TODO:  Handle an incoming message ", message);
      }
    });
    return endpointConnection; 
  }; // End of createEndpointConnection

  /**
   * Pre-define RtcommEndpoint configuration.  This provides the means to create a common
   * configuration all RtcommEndpoints will use, including the same event handlers.  
   *
   * *NOTE* This should be set PRIOR to calling getRtcommEndpoint()
   *
   *  @param {Object}  [config] 
   *  @param {boolean} [config.webrtc=true] Support audio in the PeerConnection - defaults to true
   *  @param {boolean} [config.chat=true] Support video in the PeerConnection - defaults to true
   *  @param {object}  [config.broadcast]   
   *  @param {boolean}  [config.broadcast.audio]  Endpoint should broadcast Audio
   *  @param {boolean}  [config.broadcast.video]  Endpoint should broadcast Video
   *  @param {function} [config.event] Events are defined in {@link module:rtcomm.RtcommEndpoint|RtcommEndpoint}
   *
   * @example
   *
   * endpointProvider.setRtcommEndpointConfig({
   *   webrtc: true,
   *   chat: true,
   *   broadcast: { audio: true, video: true},
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
   *  @param {Object}  [config] 
   *  @param {boolean} [config.webrtc=true] Support audio in the PeerConnection - defaults to true
   *  @param {boolean} [config.chat=true] Support video in the PeerConnection - defaults to true
   *
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
        parent:this
    };
    var objConfig = defaultConfig;
    // if there is a config defined...
    if (this._.rtcommEndpointConfig) {
      objConfig.chat = (typeof this._.rtcommEndpointConfig.chat === 'boolean') ? 
        this._.rtcommEndpointConfig.chat : objConfig.chat;
      objConfig.webrtc = (typeof this._.rtcommEndpointConfig.webrtc === 'boolean') ? 
        this._.rtcommEndpointConfig.webrtc : objConfig.webrtc;
    }

    if (typeof this.config.appContext === 'undefined') {
      throw new Error('Unable to create an Endpoint without appContext set on EndpointProvider');
    }
    if(endpointConfig && typeof endpointConfig !== 'object') {
      endpointid = endpointConfig;
      l('DEBUG') && console.log(this+'.getRtcommEndpoint() Looking for endpoint: '+endpointid);
      // Returns an array of 1 endpoint. 
      endpoint = this._.endpointRegistry.get(endpointid)[0];
      l('DEBUG') && console.log(this+'.getRtcommEndpoint() found endpoint: ',endpoint);
    } else {
      applyConfig(endpointConfig, objConfig);
      objConfig.appContext = this.config.appContext;
      objConfig.userid = this.config.userid;
      l('DEBUG') && console.log(this+'.getRtcommEndpoint using config: ', objConfig);
      endpoint = new RtcommEndpoint(objConfig);
      this.dependencies.endpointConnection && endpoint.setEndpointConnection(this.dependencies.endpointConnection);
//      endpoint.init(objConfig);
      endpoint.on('destroyed', function(event_object) {
        endpointProvider._.endpointRegistry.remove(event_object.endpoint);
      });
      // If we have any callbacks defined:
      //
      if (this._.rtcommEndpointConfig) {
        Object.keys(this._.rtcommEndpointConfig).forEach(function(key){
          try {
            if (typeof endpointProvider._.rtcommEndpointConfig[key] === 'function') {
              endpoint.on(key, endpointProvider._.rtcommEndpointConfig[key]);
            } 
          } catch (e) {
            console.error(e);
            console.error('Invalid event in rtcommEndpointConfig: '+key);
          }
        });
      }
      // If broadcast needs to be set
      if(this._.rtcommEndpointConfig.broadcast) {
        endpoint.webrtc && endpoint.webrtc.setBroadcast(this._.rtcommEndpointConfig.broadcast);
      }
      // Add to registry or return the one already there
      endpoint = this._.endpointRegistry.add(endpoint);
      l('DEBUG') && console.log('ENDPOINT REGISTRY: ', this._.endpointRegistry.list());
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
    this._.presenceMonitor  = this._.presenceMonitor || new PresenceMonitor({connection: this.dependencies.endpointConnection});
    if (this.ready) {
      topic && this._.presenceMonitor.add(topic);
    } 
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
  this.setUserID = function(userid) {

    if (this.config.userid && (userid !== this.config.userid) && !(/^GUEST/.test(this.config.userid))) {
      l('DEBUG') && console.error(this.config.userid +'!== '+ userid);
      throw new Error('Cannot change UserID once it is set');
    } else {
      l('DEBUG') && console.log(this+'.setUserID() called with: '+userid);
      userid = (this.getEndpointConnection()) ? this.getEndpointConnection().setUserID(userid):userid;
      l('DEBUG') && console.log(this+'.setUserID() Set userid to: '+userid);
      this.config.userid = this._.id = userid;
      // update the endpoints
      this._.endpointRegistry.list().forEach(function(endpoint){
        endpoint.setUserID(userid);
      });
      l('DEBUG') && console.log(this+'.setUserID() Set userid to: '+userid);
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
