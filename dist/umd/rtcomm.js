(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(["./rtcomm/connection",
      "./rtcomm/util"], function (connection, util) {
      return (root.returnExportsGlobal = factory(connection, util));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory(require("./rtcomm/connection"),
      require("./rtcomm/util"));
  } else {
        root['rtcomm'] = root['rtcomm']  || {};
        root['rtcomm']['EndpointProvider'] = factory(rtcomm.connection,
      rtcomm.util);
  }
}(this, function (connection, util) {

/*! lib.rtcomm.clientjs 1.0.0-beta.8 29-12-2014 */
console.log('lib.rtcomm.clientjs 1.0.0-beta.8 29-12-2014');
var BaseSessionEndpoint = function BaseSessionEndpoint(protocols) {
  // Presuming you creat an object based on this one, 
  // you must override the session event handler and
  // then augment newSession object.
  this.config = {
    protocols: protocols || null
  };
  this.dependencies = {
    endpointConnection: null,
  };
  // Private info.
  this._ = {
    referralSession: null,
    activeSession: null,
    appContext: null,
    available: true
  };
  protocols && Object.keys(protocols).forEach(function(key) {
    this.config[key] = protocols[key];
  });
};
/*globals util:false*/
/*globals l:false*/
BaseSessionEndpoint.prototype = util.RtcommBaseObject.extend((function() {
  function createSignalingSession(remoteEndpointID, context) {
    l('DEBUG') && console.log("createSignalingSession context: ", context);
    var sessid = null;
    var toTopic = null;
    if (context._.referralSession) {
      var details = context._.referralSession.referralDetails;
      sessid =  (details && details.sessionID) ? details.sessionID : null;
      remoteEndpointID =  (details && details.remoteEndpointID) ? details.remoteEndpointID : null;
      toTopic =  (details && details.toTopic) ? details.toTopic : null;
    }
    if (!remoteEndpointID) {
      throw new Error('toEndpointID must be set');
    }
    var session = context.dependencies.endpointConnection.createSession({
      id : sessid,
      toTopic : toTopic,
      remoteEndpointID: remoteEndpointID,
      appContext: context._.appContext
    });
    console.log('session: ', session);
    return session;
  }
  // Protocol Specific handling of the session content. 
  //
  function addSessionCallbacks(context, session) {
     // Define our callbacks for the session.
    session.on('pranswer', function(content){
      context._.processMessage(content);
    });
    session.on('message', function(content){
      l('DEBUG') && console.log('SigSession callback called to process content: ', content);
      context._.processMessage(content);
    });
    session.on('started', function(content){
      // Our Session is started!
      content && context._.processMessage(content);
      if (context._.referralSession) {
        context._.referralSession.respond(true);
      }
    });
    session.on('stopped', function() {
      console.log('Session Stopped');
    });
    session.on('starting', function() {
      console.log('Session Started');
    });
    session.on('failed', function(message) {
      console.log('Session FAILED');
    });
    l('DEBUG') && console.log('createSignalingSession created!', session);

   // session.listEvents();
    return true;
  }

return  {
  getAppContext:function() {return this._.appContext;},
  newSession: function(session) {
      var event = null;
      var msg = null;
      // If there is a session.appContext, it must match unless this.ignoreAppContext is set 
      if (this.ignoreAppContext || 
         (session.appContext && (session.appContext === this.getAppContext())) || 
         (typeof session.appContext === 'undefined' && session.type === 'refer')) {
        // We match appContexts (or don't care)
        if (this.available()){
          // We are available (we can mark ourselves busy to not accept the call)
          event = 'incoming';
          if (session.type === 'refer') {
            l('DEBUG') && console.log(this + '.newSession() REFER');
            event = 'refer';
          }
         // Save the session and start it.
         this._.activeSession = session;
         session.start();
         // Now, depending on the session.message (i.e its peerContent or future content) then do something. 
         //  For an inbound session, we have several scenarios:
         //
         //  1. peerContent === webrtc 
         //    -- we need to send a pranswer, create our webrtc endpoint, and 'answer'
         //
         //  2. peerContent === chat
         //    -- it is chat content, emit it out, but respond and set up the session.
         //
         if (session.message && session.message.peerContent) {
           // Emit this message, wait for something else?
           session.pranswer();
           console.log('Should send message now to someone else...');
         } else {
           session.respond();
         }
         //
         //
         // 
         //    var conn = this.dependencies.webrtcConnection = this.createConnection();
         //   conn.init({session:session});
         this.available(false);
         // this.emit(event, 'Something here...');
        } else {
          msg = 'Busy';
          l('DEBUG') && console.log(this+'.newSession() '+msg);
          session.fail('Busy');
        }
      } else {
        msg = 'Client is unable to accept a mismatched appContext: ('+session.appContext+') <> ('+this.getAppContext()+')';
        l('DEBUG') && console.log(this+'.newSession() '+msg);
        session.fail(msg);
      }
  },
    available: function(a) {
      if (a) {
        if (typeof a === 'boolean') { 
          this._.available = a;
          return a;
        } 
      } else  {
        return this._.available;
      }
    },
  connect: function(endpointid) {
    this._.activeSession = createSignalingSession(endpointid, this);
    this._.activeSession.start();
  },
  disconnect: function() {
    this._.activeSession.stop();
  },

  reject: function() {

  }
};

})());



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

/*
 * This is a private EndpointRegistry object that 
 * can be used to manage endpoints.
 *
 * We create an object like:  { 'appContext'}: { uuid1: Endpoint1,
 *                                               uuid2: Endpoint2}
 */

/* global l:false */

var EndpointRegistry = function EndpointRegistry(options) {
  var singleEndpoint = (options && options.singleEndpoint) ? options.singleEndpoint : false;
  // {options.singleEndpoint = true}  There can only be 1 endpoint per context.
  //
  var registry = {};
  // used to search for endpoints by these values.
  var properties = [];
  /* get an endpoint based on a key
   *  if it is ambiguous, return them all in an Array.
   */
  function get(key) {
    var a = [];
    // Key should be an ID
    if (key) {
      a = findByProperty('id', key);
    } else {
      // create a list of all endpoints.
      a = this.list();
    }
    return a;
  }

  function getOneAvailable() {
    var a = [];
    this.list().forEach(function(item){
      console.log('REMOVE ME: checking item: ', item);
      console.log('REMOVE ME: available? '+ item.available());
      item.available() && a.push(item);
    });
    // Return the last one found
    console.log('REMOVE ME: Found: ', a);
    if(a.length > 0 ) { 
      return a[a.length-1];
    } else {
      return null;
    }
  }

  // Return array of all enpdoints that match the query
  function findByProperty(property, value) {
    if (properties.indexOf(property) > -1) {
      // Two special cases - property is id or appContext:
      var a = [];
      switch(property) {
        case 'appContext':
          if (registry.hasOwnProperty(value)) {
            Object.keys(registry[value]).forEach(function(key){
              a.push(registry[value][key]);
            });
          }
          break;
       case 'id' :
         Object.keys(registry).forEach(function(appContext){
           if (registry[appContext].hasOwnProperty(value)) {
             a.push(registry[appContext][value]);
           }
         });
         break;
       default:
         this.list().forEach(function(obj) {
           if (obj.hasOwnProperty(property) && obj[property] === value ){
             a.push(obj);
           }
         });
         break;
      }
      return a;
    } else {
      l('DEBUG') && console.log('EndpointRegistry.findByProperty '+property+' not valid ');
      return []; 
    }
  }
  /* add an endpoint, if a key for that 
   * endpoint already exists, return it.
   * Otherwise, return null if nothing passed
   */
  function add(object) {
    var appContext  =  null;
    var uuid =  null;
    if (object) {
      properties = Object.keys(object);
      appContext= object.appContext;
      uuid = object.id;
      if (registry.hasOwnProperty(appContext)) {
        var eps = Object.keys(registry[appContext]);
        if (eps.length === 1 && singleEndpoint) {
          console.log('Returning existing object');
          return registry[appContext][eps[0]];
        } else {
          registry[appContext][uuid] = object;
          return registry[appContext][uuid];
        }
      } else {
        // Create context, add endpoint
        registry[appContext] = {};
        registry[appContext][uuid] = object;
        return registry[appContext][uuid];
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
    var uuid = null;
    if (object && list().length > 0 ) {
      key = object.appContext;
      uuid = object.id;
      l('DEBUG') && console.log('EndpointRegistry.remove() Trying to remove object', object);
      if (registry.hasOwnProperty(key) ) {
        if (registry[key].hasOwnProperty(uuid)) {
           delete registry[key][uuid];
           // If this was the last entry in the appContext, delete it too.
           if (Object.keys(registry[key]).length === 0 ) {
             delete registry[key];
           }
           return true;
        } else {
          l('DEBUG') && console.log('EndpointRegistry.remove() object not found', list());
          return false;
        }
      } else {
        l('DEBUG') && console.log('EndpointRegistry.remove() object not found', list());
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
    list().forEach(function(obj){
        if (typeof obj.destroy === 'function') {
          obj.destroy();
        }
        remove(obj);
     });
  }

  function length() {
    return this.list().length;
  }

  /*
   * return the registry object for perusal.
   */
  function list() {
    var a = [];
    Object.keys(registry).forEach(function(appContext){
      Object.keys(registry[appContext]).forEach(function(uuid){
        a.push(registry[appContext][uuid]);
      });
    });
    return a;
  }

  return {
    add: add,
    get: get,
    getOneAvailable: getOneAvailable,
    findByProperty: findByProperty,
    remove: remove,
    destroy: destroy,
    length: length,
    list: list
  };

};

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
 **/ 
// rtcservice & util should be defined here:
/*jshint -W030*/
/*global util:false*/
var logging = new util.Log(),
    setLogLevel = logging.s,
    getLogLevel = logging.g,
    l = logging.l,
    generateUUID = util.generateUUID,    
    generateRandomBytes = util.generateRandomBytes,    
    validateConfig = util.validateConfig,
    applyConfig = util.applyConfig,
    setConfig = util.setConfig,
    /*global log: false */
    log = logging.log;
// Removing, will do another way.
//console.log('**** rtcomm.js --> '+VERSION);

/* function log() {
          // I want to log CallingObject[id].method Message [possibly an object]

          var object = {},
              method = '<none>',
              message = null,
              remainder = null,
              logMessage = "";

          var args = [].slice.call(arguments);

          if (args.length === 0 ) {
            return;
          } else if (args.length === 1 ) {
            // Just a Message, log it...
            message = args[0];
          } else if (args.length === 2) {
            object = args[0];
            message = args[1];
          } else if (args.length === 3 ) {
            object = args[0];
            method = args[1];
            message = args[2];
          } else {
            object = args.shift();
            method = args.shift();
            message = args.shift();
            remainder = args;
          }

          if (object) {
            logMessage = object.toString() + "." + method + ' ' + message;
          } else {
            logMessage = "<none>" + "." + method + ' ' + message;
          }
          // Ignore Colors...
          if (object && object.color) {object.color = null;}
          
          var css = "";
          if (object && object.color) {
            logMessage = '%c ' + logMessage;
            css = 'color: ' + object.color;
            if (remainder) {
              console.log(logMessage, css, remainder);
            } else {
              console.log(logMessage,css);
            }
          } else {
            if (remainder) {
              console.log(logMessage, remainder);
            } else {
              console.log(logMessage);
            }
          }
        }; // end of log/ 
        */
    
        
    

var MqttEndpoint = function MqttEndpoint(config) {

  this.dependencies = { 
    connection: null,
  };
  /* Object storing subscriptions */
  this.subscriptions = {};
  this.dependencies.connection = config && config.connection;
  this.events = {'message': []};
};
/*global util:false*/
MqttEndpoint.prototype = util.RtcommBaseObject.extend({
  subscribe: function(topic) {
               // Add it
               this.subscriptions[topic] = null;
               var mqttEP = this;
               mqttEP.dependencies.connection.subscribe(topic, function(message) {
                 l('DEBUG') && console.log('MqttEndpoint.subscribe() Received message['+message+'] on topic: '+topic);
                 mqttEP.emit('message', message);
               });
             },

  unsubscribe: function(topic) {
               var mqttEP = this;
               if (this.subscriptions.hasOwnProperty(topic)) {
                 delete this.subscriptions[topic];
                 mqttEP.dependencies.connection.unsubscribe(topic);
               } else {
                 throw new Error("Topic not found:"+topic);
               }
             },
  publish: function(topic,message) {
             this.dependencies.connection.publish(topic, message);
  },
  destroy: function() {
     l('DEBUG') &&  console.log('Destroying mqtt(unsubscribing everything... ');
             var mqttEP = this;
             Object.keys(this.subscriptions).forEach( function(key) {
               mqttEP.unsubscribe(key);
             });
           }
});

var normalizeTopic = function normalizeTopic(topic) {
  // have only 1 /, starts with a /, ends without a /
  // Replace the two slashes if they exist...
  // Remove trailing slash
  var newTopic = null;
  newTopic = topic.replace(/\/+/g,'\/').replace(/\/$/g, '');
  return /^\//.test(newTopic) ? newTopic : '/'+newTopic;
};
var PresenceNode = function PresenceNode(nodename, record) {
  this.objName = 'PresenceNode';
  this.name = nodename || '';
  this.record = record || false;
  this.addressTopic = null;
  this.presenceTopic = null;
  this.nodes= [];
  this.id = this.name;
};

  var topicToArray = function topicToArray(topic) {
    var match = /^\/?(.+)$/.exec(topic.trim());
    if (match[1]) {
      return match[1].split('/');
    } else {
      // failed essentially.
      return [];
    }
  }; 

PresenceNode.prototype = util.RtcommBaseObject.extend({
  /** 
   * update the PresenceNode w/ the message passed
   */
  update: function(message) {
    /* Message looks like: 
     { content: '',
      fromEndpointID: '',
      topic: '' };
      */
    // We may ADD, Update or remove here...
    //createNode(message.topic).addRecord(message);
    
  },
  flatten: function() {
    // return array of all 'records' (dropping the hierarchy)
    var flat = [];
    this.nodes.forEach(function(node){
      if (node.record) {
        flat.push(node);
      } else {
        flat.concat(node.flatten());
      } 
    });
    return flat;
  },
  /** 
   * Return the presenceNode Object matching this topic
   * if it doesn't exist, creates it.
   */
  getSubNode :function(topic) {
    var nodes = topicToArray(topic);
    var node = this.findSubNode(nodes);
    if (node) {
      return node;
    } else {
      return this.createSubNode(nodes);
    }
  },
  findSubNode : function findSubNode(nodes) {
    l('DEBUG') && console.log(this+'.findSubNode() searching for nodes --> ', nodes);
    // If the root node matches our name... 
    var returnValue = null;
    /*
     * if this.name === '/' then we are THE master Root node ('/') and we will presume that nodes[0] should
     * be below us... 
     */
    if (this.name === '/' && nodes[0] !== '/') {
        // If we are searching off of the Top Level, we need to insert it into nodes...
        nodes.unshift('/');
    }
    l('DEBUG') && console.log(this+ '.findSubNode() this.name is: '+this.name);
    if(nodes[0] === this.name) {
      var match = null;
      // Search... 
      l('DEBUG') && console.log(this+ '.findSubNode() searching node '+nodes[0]+' for '+nodes[1]);
      for(var i = 0; i<this.nodes.length;i++ ) {
        if ( this.nodes[i].name === nodes[1] ) { 
          l('DEBUG') && console.log(this+ '.findSubNode() >>> We found '+nodes[1]);
          match =  this.nodes[i].findSubNode(nodes.slice(1));
          break;
        }
      }
      // Match will be a value if what we were looking for was found otherwise it will be null;
      //returnValue = (match && nodes[1]) ? match : this;
      //
      // If a subnode exists, then we did a search and match is accurate.
      //
      if (nodes[1]) {
        l('DEBUG') && console.log(this+ '.findSubNode() >>> The match was found for: '+nodes[1]);
        returnValue = match;
      } else {
        returnValue = this;
      }
    } else {
      returnValue = this;
    }
    l('DEBUG') && console.log(this+ '.findSubNode() >>> RETURNING: ',returnValue);
    return returnValue;
  },
  /*
   * create a node
   *
   * @param [Array] nodes Array of strings that should each represent a node
   *
   * the final node is the one we are trying to create -- We will create any 
   * nodes that are not present on the way down.
   *
   */
  createSubNode: function createNode(nodes) {
    l('DEBUG') && console.log(this+'.createSubNode() Would created node for nodes --> ', nodes);
    // nodes[0] should be us.
    if(nodes[0] === this.name ) {
      if (nodes.length > 1) {
        // Look for the node.  findNode looks for the last entry under the current one
        // so we need to slice nodes for the first two entries to actually look for that entry
        //
        var n = this.findSubNode(nodes.slice(0,2));
        // If we don't find a node create one.
        if (!n) { 
          // nodes[1] should be a node BELOW us.
          l('DEBUG') && console.log(this+'.createSubNode() Creating Node: '+nodes[1]);
          n = new PresenceNode(nodes[1]);
          this.nodes.push(n);
        }
        // call create node on the node we found/created w/ a modified array (pulling the first
        // entry off)
        return n.createSubNode(nodes.slice(1));
      } else {
        l('DEBUG') && console.log(this+ '.createSubNode() Not Creating Node, return this: ',this);
        return this;
      }
    } else {
      return null;
    }
  }, 

  deleteSubNode: function deleteSubNode(topic) {
    var nodes = topicToArray(topic);
    var nodeToDelete = this.findSubNode(nodes);
    // We found the end node
    if (nodeToDelete) {
      l('DEBUG') && console.log(this+'.deleteSubNode() Deleting Node: '+nodeToDelete.name);
      // have to find its parent.
      var parentNode = this.findSubNode(nodes.slice(0, nodes.length-1));
      l('DEBUG') && console.log(this+'.deleteSubNode() Found parent: ', parentNode);
      var index = parentNode.nodes.indexOf(nodeToDelete);
      // Remove it.
      parentNode.nodes.splice(index,1);
    } else {
      l('DEBUG') && console.log(this+'.deleteSubNode() Node not found for topic: '+topic);
    }
  },
  addPresence: function addPresence(topic,presenceMessage) {
    var presence = this.getSubNode(topic);
    presence.presenceTopic = topic;
    l('DEBUG') && console.log(this+'.addPresence() created node: ', presence);
    presence.record = true;
    if (typeof presenceMessage.self !== 'undefined') {
      presence.self = presenceMessage.self;
    }
    if (presenceMessage.content) {
      var msg = null;
      if (typeof presenceMessage.content === 'string') {
        msg = JSON.parse(presenceMessage.content);
      }
      presence.alias = msg.alias || null;
      presence.state = msg.state || 'unknown';
      presence.addressTopic = msg.addressTopic|| null;
      presence.nodes = msg.userDefines ||  [];
    }
  },
  removePresence: function removePresence(topic, endpointID) {
    this.deleteSubNode(topic);
  }
});
/**
 * @class
 * @memberof module:rtcomm
 * @classdesc
 * An object that can be used to monitor presence on topics.
 * <p>
 *
 * <p>
 *
 * @requires {@link mqttws31.js}
 *
 */
/**
 *  @memberof module:rtcomm
 *  @description
 *  This object can only be created with the {@link module:rtcomm.EndpointProvider#getPresenceMonitor|getPresenceMonitor} function.
 *  <p>
 *
 * The PresenceMonitor object provides an interface for the UI Developer to monitor presence of
 * other EndpointProviders that have published their presence w/ the
 * {@link module:rtcomm.EndpointProvider#publishPresence|publishPresence} function.
 *
 * Once created, it is necessary to 'add' a topic to monitor.  This topic can be nested and will 
 * look something like: 'us/agents' in order to monitor the presence of agents in the US.  
 *
 * This can go as deep as necessary.
 *
 * The presenceData is kept up to date in the PresenceMonitor.getPresenceData() object.
 *  @constructor
 *  @extends  module:rtcomm.util.RtcommBaseObject
 *
 *
 * @example
 *
 * // After creating and initializing the EndpointProvider (EP)
 *
 * var presenceMonitor = EP.getPresenceMonitor();
 * presenceMonitor.add('us/agents');
 * var presenceData = presenceMonitor.getPresenceData();
 */
var PresenceMonitor= function PresenceMonitor(config) {
  // Standard Class attributes
  this.objName = 'PresenceMonitor';
  // Private 
  this._ = {};
  // config
  this.config = {};
  this.dependencies = { 
    connection: null,
  };
  this._.presenceData=[];
  this._.subscriptions = [];

  // Required...
  this.dependencies.connection = config && config.connection;
  this._.sphereTopic = (config && config.connection) ? normalizeTopic(config.connection.getPresenceRoot()) : null;
  this.events = {
    /**
     * The presenceData has been updated.  
     * @event module:rtcomm.PresenceMonitor#updated
     * @property {module:rtcomm.presenceData}
     */
    'updated': [],
    };
};
/*global util:false*/
PresenceMonitor.prototype = util.RtcommBaseObject.extend((function() {

  function processMessage(message) {
    // When we get a message on a 'presence' topic, it will be used to build our presence Object for this
    // Monitor. Once we are 'Started', we will need to normalize presence here...
    // do we need a timer?  or something to delay emitting the initial event?
    // pull out the topic:
    l('DEBUG') && console.log('PresenceMonitor received message: ', message);
    var endpointID = message.fromEndpointID;
    // Following removes the endpointID, we don't need to do that.
    // var r = new RegExp('(^\/.+)\/'+endpointID+'$');
    // Remove the sphere Topic
    var r = new RegExp('^'+this._.sphereTopic+'(.+)$');
    if (this.dependencies.connection.getMyPresenceTopic() === message.topic) {
      // Add a field to message
      message.self = true;
    }
    var topic = r.exec(message.topic)[1];
    var presence = this.getRootNode();
    if (presence) {
      if (message.content && message.content !== '') {
        // If content is '' or null then it REMOVES the presence record.
         presence.addPresence(topic, message);
      } else {
         presence.removePresence(topic, endpointID);
      }
      this.emit('updated', this.getPresenceData());
    } else {
      // No Root Node
      l('DEBUG') && console.error('No Root node... dropping presence message');
    }
  }

  return { 
    /**
     * Add a topic to monitor presence on
     *
     * @param {string} topic  A topic/group to monitor, ex. 'us/agents'
     *
     */
    add: function add(topic) {
      var presenceData = this._.presenceData;
      // Validate our topic... 
      // now starts w/ a / and has no double slashes.
      topic = normalizeTopic(topic);
      var rootTopic = null;
      var subscriptionTopic = null;
      var match = null;
      if (this._.sphereTopic) {
        // Make sure it starts with 
        subscriptionTopic = normalizeTopic(this._.sphereTopic +topic + '/#');
        // Topic may or may not start w/ a /, either way it is added to the sphere topic.
        // And is BASED on the 'RootNode' or '/' 
        var a = topic.split('/');
        rootTopic = (a[0] === '') ? a[1] : a[0];
        match = this.getRootNode();
        if (match) { 
          match.getSubNode(topic);
        } else {
          var node = new PresenceNode(rootTopic);
          this._.presenceData.push(node);
          node.getSubNode(topic);
        }
        this.dependencies.connection.subscribe(subscriptionTopic, processMessage.bind(this));
        this._.subscriptions.push(subscriptionTopic);
      } else {
        // No Sphere topic.
        throw new Error('Adding a topic to monitor requires the EndpointProvider be initialized');
      }
      return this;
    },
    setEndpointConnection: function setEndpointConnection(connection) {
      if (connection) {
        this.dependencies.connection = connection;
        this._.sphereTopic = normalizeTopic(connection.getPresenceRoot()) ||  null;
      }
    },
    /**
     * Get an array representing the presence data
     * @returns {array} An array of PresenceNodes
     */
    getPresenceData: function getPresenceData() {
      // This returns everything under the ROOT.
      return this._.presenceData[0].nodes;
    },

    getRootNode: function getRootNode() {
      var rootNode = null;
      var presenceData = this._.presenceData;
      if (presenceData.length === 1) {
        rootNode = presenceData[0]; 
      } else {
        rootNode = new PresenceNode("/");
        this._.presenceData[0] = rootNode;
      }
      return rootNode;
    },

    /**
     * Return the root presenceNode if it exists.
     *
     * @param {string} topic
     * @returns {PresenceNode} The root PresenceNode for a topic (if it already exists)
     */
    __getRootNode: function getRootNode(topic) {
      // The root node matching the topic (if it exists)
      var rootNode = null;
      // The most top level node( if it exists)
      var topLevelNode = null;
      // Root Topic from passed in topic, used to find the matching rootNode
      var rootTopic = null;
      var presenceData = this._.presenceData;
      // Make sure it starts with 
      var a = normalizeTopic(topic).split('/');
      rootTopic = (a[0] === '') ? a[1] : a[0];

      for(var i = 0; i<presenceData.length;i++ ) {
        console.log('REMOVE ME '+a+' rootTopic: '+rootTopic+ ' pd.name: '+presenceData[i].name);
        if ( presenceData[i].name === rootTopic ) { 
          rootNode =  presenceData[i];
          break;
        }
        if (presenceData[i].name === '') {
          // This is the most top level node.  Return it if no other was found.
          topLevelNode = presenceData[i];
        }
      }
     rootNode = (rootNode)? rootNode:(topLevelNode?topLevelNode: null);
     l('DEBUG') &&  console.log(this+'.getRootNode() for topic:'+topic+' found: ',rootNode);
     return rootNode;
    },

  /**
   * Destroy the PresenceMonitor 
   *  Unsubscribes from presence topics
   *
   */
  destroy: function() {
       l('DEBUG') &&  console.log('Destroying mqtt(unsubscribing everything... ');
       var pm = this;
       // Wipe out the data... 
       this._.presenceData = [];
       // Unsubscribe ..
       Object.keys(this._.subscriptions).forEach( function(key) {
         pm.dependencies.connection.unsubscribe(key);
       });
    }
  } ;
})());

  var Queues = function Queues(availableQueues) {
    var Queue = function Queue(queue) {
      var self = this;
      Object.keys(queue).forEach(function(key){
        queue.hasOwnProperty(key) && (self[key] = queue[key]);
      });
      // fix the topic, make sure it has a #
      if (/#$/.test(queue.topic)) {
        this.topic = queue.topic;
      } else if (/\/$/.test(queue.topic)) {
        this.topic = queue.topic + "#";
      } else { 
        this.topic = queue.topic + "/#";
      }
      // Augment the passed in queue.
      this.active= false;
      this.callback= null;
      this.paused= false;
      this.regex= null;
      this.autoPause = false;
    };
    var queues  = {};

    this.add = function(availableQueues) {
      availableQueues.forEach( function(queue) {
        // Only overwrite a queue if it doesn't exist 
        if(!queues.hasOwnProperty[queue.endpointID]) {
          queues[queue.endpointID] = new Queue(queue);
        }
      });
    };

    this.get = function(queueid) {
      return queues[queueid] || null;
    };
    this.findByTopic = function(topic) {
      // Typically used on an inbound topic, will iterate through queue and return it.
      var matches = [];
      console.log(Object.keys(queues));
      Object.keys(queues).forEach(function(queue) {
        l('DEBUG') && console.log('Queues.findByTopic testing '+topic+' against regex: '+queues[queue].regex);
        queues[queue].regex && queues[queue].regex.test(topic) && matches.push(queues[queue]);
        });
     if (matches.length === 1 ) {
       return matches[0];
     } else {
       throw new Error('Multiple Queue matches for topic('+topic+')- should not be possible');
     }
    };
    this.all = function() {
      return queues;
    };
    this.list = function(){
      return Object.keys(queues);
    };
  };

  Queues.prototype.toString = function() {
    this.list();
  };

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
/*global: l:false*/
/*global: generateUUID:false*/
/*global: util:false*/

var RtcommEndpoint = (function invocation(){

  /**
   * @memberof module:rtcomm.RtcommEndpoint
   *
   * @description 
   * A Chat is a connection from one peer to another to pass text back and forth
   *
   *  @constructor
   *  @extends  module:rtcomm.util.RtcommBaseObject
   */
  var Chat = function Chat(parent) {
    // Does this matter?
    var createChatMessage = function(message) {
      return {'type': 'chat', 'content': {'message': message, 'from': parent.userid}};
    };
    var chat = this;
    this._ = {};
    this._.objName = 'Chat';
    this.id = parent.id;
    this._.parentConnected = false;
    this._.enabled = false;
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;
    this.state = 'disconnected';

    this.events = {
      'message': [],
      'ringing': [],
      'connected': [],
      'alerting': [],
      'disconnected': []
    };
    /**
     * Send a message if connected, otherwise, 
     * enables chat for subsequent RtcommEndpoint.connect();
     * @param {string} message  Message to send when enabled.
     */  
    this.enable =  function(message) {
      l('DEBUG') && console.log(this+'.enable() - current state --> '+ this.state);

      this.onEnabledMessage = message || createChatMessage(parent.userid + ' has initiated a Chat with you');
      // Don't need much, just set enabled to true.
      // Default message
      this._.enabled = true;
      
      if (parent.sessionStarted()) {
        l('DEBUG') && console.log(this+'.enable() - Session Started, connecting chat');
        this._connect();
      } else { 
        l('DEBUG') && console.log(this+'.enable() - Session not starting, may respond, but also connecting chat');
        parent._.activeSession && parent._.activeSession.respond();
        this._connect();
      }
      return this;
    };
    /**
     * Accept an inbound connection  
     */
    this.accept = function(message) {
      l('DEBUG') && console.log(this+'.accept() -- accepting -- '+ this.state);
      if (this.state === 'alerting') {
        this.enable(message || 'Accepting chat connection');
        return true;
      } else {
        return false;
      }
    };
    /**
     * Reject an inbound session
     */
    this.reject = function() {
      // Does nothing.
    };
    /**
     * disable chat
     */
    this.disable = function(message) {
      if (this._.enabled) { 
        this._.enabled = false;
        this.onDisabledMessage = message|| createChatMessage(parent.userid + ' has left the chat');
        this.send(this.onDisabledMessage);
        this._setState('disconnected');
      }
      return null;
    };
    /**
     * send a chat message
     * @param {string} message  Message to send
     */
    this.send = function(message) {
      message = (message && message.payload) ? message.payload: message;
      message = (message && message.type === 'chat') ? message : createChatMessage(message);
      if (parent._.activeSession) {
        parent._.activeSession.send(message);
      }
    };
    this._connect = function(sendMethod) {
      sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
      if (this._.enabled) {
        this.onEnabledMessage && sendMethod({'payload': this.onEnabledMessage});
        this._setState('connected');
        return true;
      } else {
        l('DEBUG') && console.log(this+ '_connect() !!!!! not enabled, skipping...'); 
        return false;
      }
    };
    // Message should be in the format:
    // {payload content... }
    // {'message': message, 'from':from}
    //
    this._processMessage = function(message) {
      // If we are connected, emit the message
      if (this.state === 'connected') {
        this.emit('message', message.message);
      } else {
        if (!parent.sessionStopped()) {
          parent._.activeSession && parent._.activeSession.pranswer();
          this._setState('alerting', message.message);
        }
      }
      return this;
    };
    this._setState = function(state, object) {
     l('DEBUG') && console.log(this+'._setState() setting state to: '+ state); 
      var currentState = this.state;
      try {
        this.state = state;
        this.emit(state, object);
      } catch(error) {
        console.error(error);
        console.error(this+'._setState() unsupported state: '+state );
        this.state = currentState;
      }
    };

  };
  Chat.prototype = util.RtcommBaseObject.extend({});

  var createChat = function createChat(parent) {
    var chat = new Chat(parent);
    chat.on('ringing', function(event_obj) {
      (parent.lastEvent !== 'session:ringing') && parent.emit('session:ringing');
    });
    chat.on('message', function(message) {
      parent.emit('chat:message', {'message': message});
    });
    chat.on('alerting', function(message) {
      var obj =  {};
      obj.message  = message;
      obj.protocols = 'chat';
      parent.emit('session:alerting', obj );
    });
    chat.on('connected', function() {
      parent.emit('chat:connected');
    });
    chat.on('disconnected', function() {
      parent.emit('chat:disconnected');
    });
    return chat;
  };


  var createWebRTCConnection = function createWebRTCConnection(parent) {
    /* globals WebRTCConnection:false */
    var webrtc = new WebRTCConnection(parent);
    webrtc.on('ringing', function(event_obj) {
      (parent.lastEvent !== 'session:ringing') && parent.emit('session:ringing');
    });
    webrtc.on('alerting', function(event_obj) {
      parent.emit('session:alerting', {protocols: 'webrtc'});
    });
    webrtc.on('connected', function(event_obj) {
      parent.emit('webrtc:connected');
    });
    webrtc.on('disconnected', function(event_obj) {
      parent.emit('webrtc:disconnected');
    });
    return webrtc;
  };

/**
 *  @memberof module:rtcomm
 *  @description
 *  This object can only be created with the {@link module:rtcomm.EndpointProvider#getRtcommEndpoint|getRtcommEndpoint} function.
 *  <p>
 *  The RtcommEndpoint object provides an interface for the UI Developer to attach 
 *  Video and Audio input/output.  Essentially mapping a broadcast stream(a MediaStream that
 *  is intended to be sent) to a RTCPeerConnection output stream.   When an inbound stream
 *  is added to a RTCPeerConnection, then this also informs the RTCPeerConnection
 *  where to send that stream in the User Interface.
 *  <p>
 *  See the example under {@link module:rtcomm.EndpointProvider#getRtcommEndpoint|getRtcommEndpoint}
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
 */
  var RtcommEndpoint = function RtcommEndpoint(config) {
    // Presuming you creat an object based on this one, 
    // you must override the ession event handler and
    // then augment newSession object.
    //
    this.config = {
      ignoreAppContext: true,
      appContext : null,
      userid: null,
      chat: true,
      webrtc: true
    };
    this.dependencies = {
      endpointConnection: null,
    };
    // Private info.
    this._ = {
      objName: 'RtcommEndpoint',
      activeSession: null,
      available: true,
      /*global generateUUID:false */
      uuid: generateUUID(),
      initialized : false,
      protocols : [],
      // webrtc Only 
      inboundMedia: null,
      attachMedia: false,
      localStream : null,
      media : { In : null,
               Out: null},
    };
    // Used to store the last event emitted;
    this.lastEvent = null;
    // Used to store the last event emitted;
    //
    this.state = 'session:stopped';
    var self = this;
    config && Object.keys(config).forEach(function(key) {
      self.config[key] = config[key];
    });

    this.config.webrtc && this._.protocols.push('webrtc');
    this.config.chat && this._.protocols.push('chat');

    // expose the ID
    this.id = this._.uuid;
    this.userid = this.config.userid || null;
    this.appContext = this.config.appContext || null;

    /**
     * The attached {@link module:rtcomm.RtcommEndpoint.WebRTCConnection} object 
     * if enabled null if not enabled
     *
     * @type {module:rtcomm.RtcommEndpoint.WebRTCConnection}
     * @readonly
     */
    this.webrtc = (this.config.webrtc)?createWebRTCConnection(this): null;
    /**
     * The attached {@link module:rtcomm.RtcommEndpoint.Chat} object 
     * if enabled null if not enabled
     *
     * @type {module:rtcomm.RtcommEndpoint.Chat}
     * @readonly
     */
    this.chat = (this.config.chat) ? createChat(this): null;
    // Enable chat by default if it is set up that way.
    //this.chat && this.chat.enable();

    /** 
     * RtcommEndpoint Event type 
     *
     *  @typedef {Object} module:rtcomm.RtcommEndpoint~Event
     *  @property {name} eventName 
     *  @property {object} endpointObject - an object passed with the event
     *  @property {string} [reason] - Used for failure messages
     *  @property {string} [protocols] - Used for alerting messages
     *  @property {object} [message] - Used for chat:message and session:alerting
     */

    this.events = {
        /**
         * A signaling session to a peer has been established
         * @event module:rtcomm.RtcommEndpoint#session:started
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:started": [],
        /**
         * An inbound request to establish a call via 
         * 3PCC was initiated
         *
         * @event module:rtcomm.RtcommEndpoint#session:refer
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "session:refer": [],
        /**
         * A peer has been reached, but not connected (inbound/outound)
         * @event module:rtcomm.RtcommEndpoint#session:ringing
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:trying": [],
        /**
         * A Queue has been contacted and we are waiting for a response.
         * @event module:rtcomm.RtcommEndpoint#session:queued
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:queued": [],
        /**
         * A peer has been reached, but not connected (inbound/outound)
         * @event module:rtcomm.RtcommEndpoint#session:ringing
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:ringing": [],
        /**
         * An inbound connection is being requested.
         * @event module:rtcomm.RtcommEndpoint#session:alerting
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:alerting": [],
        /**
         * A failure occurred establishing the session (check reason)
         * @event module:rtcomm.RtcommEndpoint#session:failed
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "session:failed": [],
        /**
         * The session has stopped
         * @event module:rtcomm.RtcommEndpoint#session:stopped
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "session:stopped": [],
        /**
         * A PeerConnection to a peer has been established
         * @event module:rtcomm.RtcommEndpoint#webrtc:connected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        "webrtc:connected": [],
        /**
         * The connection to a peer has been closed
         * @event module:rtcomm.RtcommEndpoint#webrtc:disconnected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         *
         */
        "webrtc:disconnected": [],
        /**
         * Creating the connection to a peer failed
         * @event module:rtcomm.RtcommEndpoint#webrtc:failed
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'webrtc:failed': [],
        /**
         * A message has arrived from a peer
         * @event module:rtcomm.RtcommEndpoint#chat:message
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:message': [],
        /**
         * A chat session to a  peer has been established
         * @event module:rtcomm.RtcommEndpoint#chat:connected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:connected': [],
        /**
         * The connection to a peer has been closed
         * @event module:rtcomm.RtcommEndpoint#chat:disconnected
         * @property {module:rtcomm.RtcommEndpoint~Event}
         */
        'chat:disconnected':[],
        /**
         * The endpoint has destroyed itself, clean it up.
         * @event module:rtcomm.RtcommEndpoint#destroyed
         * @property {module:rtcomm.RtcommEndpoint}
         */
        'destroyed': [],
    };
  };
/*globals util:false*/
/*globals l:false*/
RtcommEndpoint.prototype = util.RtcommBaseObject.extend((function() {

  function createSignalingSession(endpoint, context) {
    console.log('REMOVE ME: ', endpoint);
    var remoteEndpointID = null;
    var toTopic = null;
    if (typeof endpoint === 'object') {
      if (endpoint.remoteEndpointID && endpoint.toTopic) {
        
        remoteEndpointID = endpoint.remoteEndpointID;
        toTopic = endpoint.toTopic;
        console.log('toTopic?: '+toTopic);
        console.log('remoteEndpointID?: '+remoteEndpointID);
      } else {
        throw new Error('Invalid object passed on connect! should be {remoteEndpointID: something, toTopic: something}');
      }
    } else {
      remoteEndpointID = endpoint;
    } 
    l('DEBUG') && console.log(context+" createSignalingSession context: ", context);
    var sessid = null;
    if (!remoteEndpointID) {
      throw new Error('remoteEndpointID must be set');
    }
    var session = context.dependencies.endpointConnection.createSession({
      id : sessid,
      toTopic : toTopic,
      protocols: context._.protocols,
      remoteEndpointID: remoteEndpointID,
      appContext: context.config.appContext
    });
    return session;
  }
  // Protocol Specific handling of the session content. 
  //
  function addSessionCallbacks(context, session) {
     // Define our callbacks for the session.
    // received a pranswer
    session.on('have_pranswer', function(content){
      // Got a pranswer:
      context.setState('session:ringing');
      context._processMessage(content);
    });
    /*
     * this is a bit of a special message... content MAY contain:
     * content.queuePosition
     * content.message
     *
     * content.message is all we propogate.
     *
     */
    session.on('queued', function(content){
      l('DEBUG') && console.log('SigSession callback called to queue: ', content);
      var position = 0;
      if (typeof content.queuePosition !== 'undefined') {
        position = content.queuePosition;
        context.setState('session:queued',{'queuePosition':position});
        content = (content.message)? content.message : content;
      } else {
        context.setState('session:queued');
        context._processMessage(content);
      }
    });
    session.on('message', function(content){
      l('DEBUG') && console.log('SigSession callback called to process content: ', content);
      context._processMessage(content);
    });
    session.on('started', function(content){
      // Our Session is started!
      content && context._processMessage(content);
      context.setState('session:started');
    });
    session.on('stopped', function(message) {
      // In this case, we should disconnect();
      context.setState('session:stopped');
      context.disconnect();
    });
    session.on('starting', function() {
      context.setState('session:trying');
      console.log('Session Starting');
    });
    session.on('failed', function(message) {
      context.disconnect();
      context.setState('session:failed',{reason: message});
    });
    l('DEBUG') && console.log(context+' createSignalingSession created!', session);
   // session.listEvents();
    return true;
  }
/** @lends module:rtcomm.RtcommEndpoint.prototype */
return  {
  getAppContext:function() {return this.config.appContext;},
  newSession: function(session) {
      var event = null;
      var msg = null;
      // If there is a session.appContext, it must match unless this.ignoreAppContext is set 
      if (this.config.ignoreAppContext || 
         (session.appContext && (session.appContext === this.getAppContext())) || 
         (typeof session.appContext === 'undefined' )) {
        // We match appContexts (or don't care)
        if (this.available()){
          // We are available (we can mark ourselves busy to not accept the call)
          // Save the session 
          this._.activeSession = session;
          addSessionCallbacks(this,session);
          var commonProtocols = util.commonArrayItems(this._.protocols, session.protocols);
          l('DEBUG') && console.log(this+'.newSession() common protocols: '+ commonProtocols);
          // If this session is created by a REFER, we do something different
          if (session.referralTransaction ) {
            // Don't start it, emit 'session:refer'
            l('DEBUG') && console.log(this + '.newSession() REFER');
            this.setState('session:refer');
          } else if (commonProtocols.length > 0){
            // have a common protocol 
            // any other inbound session should be started.
            session.start({protocols: commonProtocols});
            // Depending on the session.message (i.e its peerContent or future content) then do something. 
            if (session.message && session.message.payload) {
              // If we need to pranswer, processMessage can handle it.
              this._processMessage(session.message.payload);
            } else {
              // it doesn't have any payload, but could have protocols subprotocol
              session.pranswer();
              this.setState('session:alerting', {protocols:commonProtocols});
            }
          } else {
            // can't do anything w/ this session, same as busy... different reason.
            l('DEBUG') && console.log(this+'.newSession() No common protocols');
            session.fail('No common protocols');
          }
          this.available(false);
        } else {
          msg = 'Busy';
          l('DEBUG') && console.log(this+'.newSession() '+msg);
          session.fail('Busy');
        }
      } else {
        msg = 'Client is unable to accept a mismatched appContext: ('+session.appContext+') <> ('+this.getAppContext()+')';
        l('DEBUG') && console.log(this+'.newSession() '+msg);
        session.fail(msg);
      }
  },
  _processMessage: function(payload) {

    // Content should be {type: blah, content: blah};
    // but may be {protocols: [], payload: {}}
    // basically a protocol router...
    var protocols;
    if (payload.protocols) {
      protocols = payload.protocols;
      payload = payload.payload;
    }
    // In the case our protocols are different, we have a common protocol, but should disable the others.
    if (protocols !== this._.protocols) {
      // protocols is what is common.
      console.log('msg protocols?', protocols);
      console.log('my protocols?', this._.protocols);
    //  console.error('Protocols changed, DO SOMETHING -- FIX THIS');
    }
    var self = this;
    if (payload) {
      if (payload.type === 'chat') { 
      // It is a chat this will change to something different later on...
        if (this.config.chat) { 
          this.chat._processMessage(payload.content);
          //this.emit('chat:message', payload.userdata);
        } else {
          console.error('Received chat message, but chat not supported!',payload);
        }
      } else if (payload.type === 'webrtc') {
        if (this.config.webrtc && this.webrtc) { 
          // calling enable will enable if not already enabled... 
          if (this.webrtc.enabled()) {
            self.webrtc._processMessage(payload.content);
          } else {
            // This should only occur on inbound. don't connect, that is for outbound.
            this.webrtc.enable({connect: false}, function(success){
              if (success) {
                self.webrtc._processMessage(payload.content);
              }
            });
          }
        }
      }else {
          console.error(this+' Received message, but unknown protocol: ', payload);
        }
   } else {
     l('DEBUG') && console.log(this+' Received message, but nothing to do with it', payload);
   }
  },
  /** Endpoint is available to accept an incoming call
   *
   * @returns {boolean}
   */

    available: function(a) {
     // if a is a boolean then set it, otherwise return it.
     if (typeof a === 'boolean') { 
       this._.available = a;
       l('DEBUG') && console.log(this+'.available() setting available to '+a);
       return a;
     } else  {
       return this._.available;
     }
    },

  /**
   *  @memberof module:rtcomm.RtcommEndpoint
   * Connect to another endpoint.  Depending on what is enabled, it may also start
   * a chat connection or a webrtc connection.
   * <p>
   * If webrtc is enabled by calling webrtc.enable() then the initial connect will 
   * also generate an Offer to the remote endpoint. <br>
   * If chat is enabled, an initial message will be sent in the session as well.
   * </p>
   *
   * @param {string|object} endpoint Remote ID of endpoint to connect.
   *
   * TODO:  Doc this..
   *
   */

  connect: function(endpoint) {
    console.log('REMOVE ME:  ',endpoint);
    var remoteEndpointID = null;
    var toTopic = null;
    if (typeof endpoint === 'object') {
      if (endpoint.remoteEndpointID && endpoint.toTopic) {
        remoteEndpointID = endpoint.remoteEndpointID;
        toTopic = endpoint.toTopic;
      } else {
        throw new Error('Invalid object passed on connect! should be {remoteEndpointID: something, toTopic: something}');
      }
    } else {
      remoteEndpointID = endpoint;
    } 
    l('DEBUG') && console.log(this+'.connect() using remoteEndpointID: '+ remoteEndpointID +' & toTopic:'+toTopic);
    if (this.ready()) {
      this.available(false);
      if (!this._.activeSession) { 
        this._.activeSession = createSignalingSession(endpoint, this);
        addSessionCallbacks(this, this._.activeSession);
      }
      this.setState('session:trying');
      if (this.config.webrtc && 
          this.webrtc._connect(this._.activeSession.start.bind(this._.activeSession))) {
        l('DEBUG') && console.log(this+'.connect() initiating with webrtc._connect');
      } else if (this.config.chat && 
                 this.chat._connect(this._.activeSession.start.bind(this._.activeSession))){
        l('DEBUG') && console.log(this+'.connect() initiating with chat._connect');
      } else {
        l('DEBUG') && console.log(this+'.connect() sending startMessage w/ no content');
        this._.activeSession.start();
      }
    } else {
      throw new Error('Unable to connect endpoint until EndpointProvider is initialized');
    }
    return this;
  },

  /**
   * Disconnect the endpoint from a remote endpoint.
   */
  disconnect: function() {
    this.webrtc && this.webrtc.disable();
    this.chat && this.chat.disable();
    if (this.sessionStarted()) {
      this._.activeSession.stop();
      this._.activeSession = null;
      this.setState('session:stopped');
    }
    this.available(true);
    return this;
  },
  /**
   * Accept an inbound request.  This is typically called after a 
   * {@link module:rtcomm.RtcommEndpoint#session:alerting|session:alerting} event
   *
   */
  accept: function(options) {
    if (this.getState() === 'session:refer') {  
      this.connect(null);
    } else if (this.webrtc && this.webrtc && this.webrtc.accept(options)) {
      l('DEBUG') && console.log(this+'.accept() Accepted in webrtc.');
    } else if (this.chat && this.chat.accept(options)) {
      l('DEBUG') && console.log(this+'.accept() Accepted in chat.');
    } else {
      l('DEBUG') && console.log(this+'.accept() accepting generically.');
      if (!this.sessionStarted()) {
        this._.activeSession.respond();
      }
    }
    return this;
  },

  /**
   * Reject an inbound request.  This is typically called after a 
   * {@link module:rtcomm.RtcommEndpoint#session:alerting|session:alerting} event
   *
   */
  reject: function() {
      l('DEBUG') && console.log(this + ".reject() invoked ");
      this.webrtc.reject();
      this.chat.reject();
      this._.activeSession && this._.activeSession.fail("The user rejected the call");
      this._.activeSession = null;
      this.available(true);
      return this;
  },

  /* used by the parent to assign the endpoint connection */
  setEndpointConnection: function(connection) {
    this.webrtc && this.webrtc.setIceServers(connection.RTCOMM_CONNECTOR_SERVICE);
    this.dependencies.endpointConnection = connection;
  },

  /** Return user id 
   * @returns {string} Local UserID that endpoint is using
   */
  getUserID : function(userid) {
      return this.config.userid; 
  },

  setUserID : function(userid) {
      this.userid = this.config.userid = userid;
  },

  getState: function() {
    return this.state;
  },

  /**
   * Endpoint is ready to connect
   * @returns {boolean}
   */
  ready : function() {
    var ready = (this.dependencies.endpointConnection) ? true : false;
    return ready;
  },
  /**
   * The Signaling Session is started 
   * @returns {boolean}
   */
  sessionStarted: function() {
    return (this._.activeSession && this._.activeSession.getState() === 'started');
  },
  /**
   * The Signaling Session does not exist or is stopped
   * @returns {boolean}
   */
  sessionStopped: function() {
    var state = (this._.activeSession) ? (this._.activeSession.getState() === 'stopped'): true;
    return state;
  },
  /**
   * Remote EndpointID this endpoint is connected to.
   * @returns {string}
   */
  getRemoteEndpointID: function() {
    return this._.activeSession ? this._.activeSession.remoteEndpointID : 'none';
  },
  /**
   * Local EndpointID this endpoint is using.
   * @returns {string}
   */
  getLocalEndpointID: function() {
    return this.userid;
  },

  /**
   *  Destroy this endpoint.  Cleans up everything and disconnects any and all connections
   */
  destroy : function() {
    l('DEBUG') && console.log(this+'.destroy Destroying RtcommEndpoint');
    this.emit('destroyed');
    this.disconnect();
    // this.getLocalStream() && this.getLocalStream().stop();
    l('DEBUG') && console.log(this+'.destroy() - detaching media streams');
    //detachMediaStream && detachMediaStream(this.getMediaIn());
    //detachMediaStream && detachMediaStream(this.getMediaOut());
    l('DEBUG') && console.log(this+'.destroy() - Finished');
  },

  /* This is an event formatter that is called by the prototype emit() to format an event if 
   * it exists
   * When passed an object, we ammend it w/ eventName and endpoint and pass it along.
   */
  _Event : function Event(event, object) {
      var RtcommEvent =  {
        eventName: '',
        endpoint: null
      };
      l('DEBUG') && console.log(this+'_Event -> creating event['+event+'], augmenting with', object);
      RtcommEvent.eventName= event;
      RtcommEvent.endpoint= this;
      if (typeof object === 'object') {
        Object.keys(object).forEach(function(key) { 
          RtcommEvent[key] = object[key];
        });
      }
      l('DEBUG') && console.log(this+'_Event -> created event: ',RtcommEvent);
      return RtcommEvent;
  }

  };


  })()); // End of Prototype

return RtcommEndpoint;
})();

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
 **/
var WebRTCConnection = (function invocation() {

  /**
   * @memberof module:rtcomm.RtcommEndpoint
   *
   * @description 
   * A WebRTCConnection is a connection from one peer to another encapsulating
   * an RTCPeerConnection and a SigSession
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
   */
  var WebRTCConnection = function WebRTCConnection(parent) {
    var OfferConstraints = {'mandatory': {
      OfferToReceiveAudio: true, 
      OfferToReceiveVideo: true}
    };

    this.config = {
      RTCConfiguration : {iceTransports : "all"},
      RTCOfferConstraints: OfferConstraints,
      RTCConstraints : {'optional': [{'DtlsSrtpKeyAgreement': 'true'}]},
      iceServers: [],
      mediaIn: null,
      mediaOut: null,
      broadcast: {
        audio: true,
        video: true 
      }
    };
    // TODO:  Throw error if no parent.
    this.dependencies = {
      parent: parent || null
    };
    this._ = {
      state: 'disconnected',
      objName:'WebRTCConnection',
      parentConnected : false,
      enabled : false
    };
    this.id = parent.id;
    // Defaults for peerConnection -- must be set on instantiation
    // Required to emit.
    this.events = {
      'alerting': [],
      'ringing': [],
      'trying': [],
      'connected': [],
      'disconnected': []
    };
    this.pc = null;
    this.onEnabledMessage = null;
    this.onDisabledMessage = null;

  };

  /*global util:false*/

  WebRTCConnection.prototype = util.RtcommBaseObject.extend((function() {
    /** @lends module:rtcomm.RtcommEndpoint.WebRTCConnection.prototype */
    return {
    /*
     */
    // Same as options for creating a PeerConnection(and offer/answer)
    // include UI elements here.
    /**
     * enable webrtc
     * <p>
     * When enable() is called, if we are connected we will initiate a webrtc connection (generate offer)
     * Otherwise, call enable() prior to connect and when connect occurs it will do what is enabled...
     * </p>
     *
     * @param {object} [config]
     *
     * @param {object} [config.mediaIn]  UI component to attach inbound media stream
     * @param {object} [config.mediaOut] UI Component to attach outbound media stream
     * @param {object} [config.broadcast] 
     * @param {boolean} [config.broadcast.audio] Broadcast Audio
     * @param {boolean} [config.broadcast.video] Broadcast Video
     * @param {object} [config.RTCOfferConstraints] RTCPeerConnection specific config {@link http://w3c.github.io/webrtc-pc/} 
     * @param {object} [config.RTCConfiguration] RTCPeerConnection specific {@link http://w3c.github.io/webrtc-pc/} 
     * @param {object} [config.RTCConfiguration.peerIdentity] 
     * @param {boolean} [config.lazyAV=true]  Enable AV lazily [upon connect/accept] rather than during
     * right away
     * @param {boolean} [config.connect=true] Internal, do not use.
     *
     **/
    enable: function(config,callback) {
      // If you call enable, no matter what we can update the config.
      //
      var self = this;
      var parent = self.dependencies.parent;
      /*global l:false*/
      l('DEBUG') && console.log(self+'.enable()  --- entry ---');

      var RTCConfiguration = (config && config.RTCConfiguration) ?  config.RTCConfiguration : this.config.RTCConfiguration;
      RTCConfiguration.iceServers = RTCConfiguration.iceServers || this.getIceServers();
      var RTCConstraints= (config && config.RTCConstraints) ? config.RTCConstraints : this.config.RTCConstraints;
      this.config.RTCOfferConstraints= (config && config.RTCOfferConstraints) ? config.RTCOfferConstraints: this.config.RTCOfferConstraints;

      var connect = (config && typeof config.connect === 'boolean') ? config.connect : parent.sessionStarted();
      var lazyAV = (config && typeof config.lazyAV === 'boolean') ? config.lazyAV : true;

      l('DEBUG') && console.log(self+'.enable() config created, defining callback');

      callback = callback || ((typeof config === 'function') ? config :  function(success, message) {
        l('DEBUG') && console.log(self+'.enable() default callback(success='+success+',message='+message);
      });
      // When Enable is called we have a couple of options:
      // 1.  If parent is connected, enable will createofffer and send it.
      // 2.  if parent is NOT CONNECTED. enable will create offer and STORE it for sending by _connect.
      //
      // 3.  
      /*
       * create an offer during the enable process
       */

      // If we are enabled already, just return ourselves;
      //

      if (this._.enabled) {
        this.enableLocalAV(callback);
        return this;
      } else {
        l('DEBUG') && console.log(self+'.enable() connect if possible? '+connect);
        try {
          this.pc = createPeerConnection(RTCConfiguration, RTCConstraints, this);
        } catch (error) {
          // No PeerConnection support, cannot enable.
          throw new Error(error);
        }
        this._.enabled = true;
        // If we don't have lazy set and we aren't immediately connecting, enable AV.
        l('DEBUG') && console.log(self+'.enable() (lazyAV='+lazyAV+',connect='+connect);
        if (!lazyAV && !connect) {
          // enable now.
          this.enableLocalAV(function(success, message) {
            l('DEBUG') && console.log(self+'.enable() enableLocalAV Callback(success='+success+',message='+message);
            callback(true);
          });
        } else {
          if (connect) {
            this._connect(null, callback(true));
          } else {
            callback(true);
          } 
        } 
        return this;
      }
    },
    /** disable webrtc 
     * Disconnect and reset
     */
    disable: function() {
      this.onEnabledMessage = null;
      this._.enabled = false;
      this._disconnect();
      if (this.pc) {
        this.pc = null;
      }
      return this;
    },
    /**
     * WebRTCConnection is enabled
     * @returns {boolean}
     */
    enabled: function() {
      return this._.enabled;
    },

    /*
     * Called to 'connect' (Send message, change state)
     * Only works if enabled.
     *
     */
    _connect: function(sendMethod,callback) {
      var self = this;

      sendMethod = (sendMethod && typeof sendMethod === 'function') ? sendMethod : this.send.bind(this);
      callback = callback ||function(success, message) {
        l('DEBUG') && console.log(self+'._connect() default callback(success='+success+',message='+message);
      };

      var doOffer =  function doOffer(success, msg) {
        if (success) { 
          self.pc.createOffer(
            function(offersdp) {
              l('DEBUG') && console.log(self+'.enable() createOffer created: ', offersdp);
                sendMethod({message: self.createMessage(offersdp)});
                self._setState('trying');
                self.pc.setLocalDescription(offersdp, function(){
                  l('DEBUG') &&  console.log('************setLocalDescription Success!!! ');
                  callback(true);
                }, function(error) { callback(false, error);});
            },
            function(error) {
              console.error('webrtc._connect failed: ', error);
              callback(false);
            },
            self.config.RTCOfferConstraints);
        } else {
          callback(false);
          console.error('_connect failed, '+msg);
        }
      };
      if (this._.enabled && this.pc) {
        this.enableLocalAV(doOffer);
        return true;
      } else {
        return false;
      } 
    },

    _disconnect: function() {
      if (this.pc && this.pc.signalingState !== 'closed') {
        l('DEBUG') && console.log(this+'._disconnect() Closing peer connection');
       this.pc.close();
      }

      detachMediaStream(this.getMediaIn());
      this._.remoteStream = null;
      detachMediaStream(this.getMediaOut());

      if (this.getState() !== 'disconnected') {
        this._setState('disconnected');
      }
      return this;
    },

    send: function(message) {
      var parent = this.dependencies.parent;
      // Validate message?
      message = (message && message.message) ? message.message : message;
      if (parent._.activeSession) {
        parent._.activeSession.send(this.createMessage(message));
      }
    },

    /**
     * Accept an inbound connection
     */
    accept: function(options) {
      var self = this;

      var doAnswer = function doAnswer() {
        l('DEBUG') && console.log(this+'.accept() -- doAnswer -- peerConnection? ', self.pc);
        l('DEBUG') && console.log(this+'.accept() -- doAnswer -- constraints: ', self.config.RTCOfferConstraints);
        console.log('localsttream audio:'+ self._.localStream.getAudioTracks().length );
        console.log('localsttream video:'+ self._.localStream.getVideoTracks().length );
        console.log('PC has a lcoalMediaStream:'+ self.pc.getLocalStreams(), self.pc.getLocalStreams());
        self.pc && self.pc.createAnswer(self._gotAnswer.bind(self), function(error) {
          console.error('failed to create answer', error);
        },
         self.config.RTCOfferConstraints
        );
      };
      l('DEBUG') && console.log(this+'.accept() -- accepting --');
      if (this.getState() === 'alerting') {
        this.enableLocalAV(doAnswer);
        return true;
      } else {
        return false;
      }
    },
    /** reject an inbound connection */
    reject: function() {
      this._disconnect();
    },
    /** State of the WebRTC, matches an event */
    getState: function() {
      return this._.state;
    },
    _setState: function(state) {
      l('DEBUG') && console.log(this+'._setState to '+state);
      this._.state = state;
      var event = state;
      l('DEBUG') && console.log(this+'._setState emitting event '+event);
      this.emit(event);
    },

    broadcastReady: function broadcastReady() {
      if (( this.config.broadcast.audio || this.config.broadcast.video) && (typeof this._.localStream === 'object')) {
        return true;
        // if we have neither, we are still 'ready'
      } else if (this.config.broadcast.audio === false  && this.config.broadcast.video === false) {
        return true;
      } else {
        return false;
      }
    },
    /** configure broadcast 
     *  @param {object} broadcast 
     *  @param {boolean} broadcast.audio
     *  @param {boolean} broadcast.video
     */
    setBroadcast : function setBroadcast(broadcast) {
      this.config.broadcast.audio = (broadcast.hasOwnProperty('audio') && 
                                     typeof broadcast.audio === 'boolean') ? 
                                      broadcast.audio :
                                      this.config.broadcast.audio;
      this.config.broadcast.video= (broadcast.hasOwnProperty('video') && 
                                    typeof broadcast.video=== 'boolean') ?
                                      broadcast.video:
                                      this.config.broadcast.video;
      /*
      if (!broadcast.audio && !broadcast.video) { 
        this.config.RTCOfferConstraints= {'mandatory': {OfferToReceiveAudio: true, OfferToReceiveVideo: true}};
      } else {
        this.config.RTCOfferConstraints = null;
      }
      */
      return this;
    },
    pauseBroadcast: function() {
      if (this._.localStream) {
        this._.localStream.getVideoTracks()[0].enabled = false;
        this._.localStream.getAudioTracks()[0].enabled = false;
      }
    },
    resumeBroadcast: function() {
      if (this._.localStream) {
        this._.localStream.getVideoTracks()[0].enabled = true;
        this._.localStream.getAudioTracks()[0].enabled = true;
      }
    },
    getMediaIn: function() {
      return this.config.mediaIn;
    },
    /**
     * DOM node to link the RtcommEndpoint inbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    setMediaIn: function(value) {
      if(validMediaElement(value) ) {
        if (this._.remoteStream) {
          attachMediaStream(value, this._.remoteStream);
          this.config.mediaIn = value;
        } else {
          detachMediaStream(value);
          this.config.mediaIn = value;
        }
      } else {
        throw new TypeError('Media Element object is invalid');
      }
      return this;
    },
    getMediaOut: function() { return this.config.mediaOut; },
    /**
     * DOM Endpoint to link outbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    setMediaOut: function(value) {
      if(validMediaElement(value) ) {
        if (this._.localStream) {
          // We have a stream already, just move the attachment.
          attachMediaStream(value, this._.localStream);
          this.config.mediaOut = value;
        } else {
          // detach streams...
          detachMediaStream(value);
          this.config.mediaOut = value;
        }
      } else {
        throw new TypeError('Media Element object is invalid');
      }
      return this;
    },
  /*
   * This is executed by createAnswer.  Typically, the intent is to just send the answer
   * and call setLocalDescription w/ it.  There are a couple of variations though.
   *
   * This also means we have applied (at some point) applie a remote offer as our RemoteDescriptor
   *
   * In most cases, we should be in 'have-remote-offer'
   *
   *  We have 3 options here:
   *  (have-remote-offer)
   *  1.  start a session w/ a message
   *  2.  start w/out a message
   *  3.  send message.
   *
   *  // ANSWER
   *  // PRANSWER or REAL_PRANSWER
   *
   *
   *
   */
  _gotAnswer :  function(desc) {

    l('DEBUG') && console.log(this+'.createAnswer answer created:  ', desc);

    var answer = null;
    var pcSigState = this.pc.signalingState;
    var session = this.dependencies.parent._.activeSession;
    var sessionState = session.getState();
    var PRANSWER = (pcSigState === 'have-remote-offer') && (sessionState === 'starting');
    var RESPOND = sessionState === 'pranswer' || pcSigState === 'have-local-pranswer';
    var SKIP = false;
    var message = this.createMessage(desc);
    l('DEBUG') && console.log(this+'.createAnswer._gotAnswer: pcSigState: '+pcSigState+' SIGSESSION STATE: '+ sessionState);
    if (RESPOND) {
      l('DEBUG') && console.log(this+'.createAnswer sending answer as a RESPONSE');
      console.log(this+'.createAnswer sending answer as a RESPONSE', message);
      session.respond(true, message);
      this._setState('connected');
    } else if (PRANSWER){
      l('DEBUG') && console.log(this+'.createAnswer sending PRANSWER');
      this._setState('alerting');
      answer = {};
      answer.type = 'pranswer';
      answer.sdp = this.pranswer ? desc.sdp : '';
      desc = answer;
      session.pranswer(this.createMessage(desc));
    } else if (this.getState() === 'connected' || this.getState() === 'alerting') {
      l('DEBUG') && console.log(this+'.createAnswer sending ANSWER (renegotiation?)');
      // Should be a renegotiation, just send the answer...
      session.send(message);
    } else {
      SKIP = true;
      this._setState('alerting');
    }
    SKIP = (PRANSWER && answer && answer.sdp === '') || SKIP;
    l('DEBUG') && console.log('_gotAnswer: Skip setLocalDescription? '+ SKIP);
    if (!SKIP) {
      this.pc.setLocalDescription(desc,/*onSuccess*/ function() {
        l('DEBUG') && console.log('setLocalDescription in _gotAnswer was successful', desc);
      }.bind(this),
        /*error*/ function(message) {
        console.error(message);
      });
    }
  },

  createMessage: function(content) {
    if (content) {
      if (content.type && content.content) {
        // presumably OK, just return it
        return content;
      } else {
        return {'type':'webrtc', 'content': content};
      }
    } else {
        return {'type':'webrtc', 'content': content};
    }
  },

  /* Process inbound messages
   *
   *  These are 'PeerConnection' messages
   *  Offer/Answer/ICE Candidate, etc...
   */
  _processMessage : function(message) {
    var self = this;
    var isPC = this.pc ? true : false;
    if (!message) {
      return;
    }
    l('DEBUG') && console.log(this+"._processMessage Processing Message...", message);
    if (message.type) {
      switch(message.type) {
      case 'pranswer':
        /*
         * When a 'pranswer' is received, the target is 'THERE' and our state should
         * change to RINGING.
         *
         * Our PeerConnection is not 'stable' yet.  We still need an Answer.
         *
         */
        // Set our local description
        //  Only set state to ringing if we have a local offer...
        if (isPC && this.pc.signalingState === 'have-local-offer') {
          isPC && this.pc.setRemoteDescription(new MyRTCSessionDescription(message));
          this._setState('ringing');
        }
        break;
      case 'answer':
        /*
         *  If we get an 'answer', we should be in a state to RECEIVE the answer,
         *  meaning we can't have sent an answer and receive an answer.
         */
        l('DEBUG') && console.log(this+'._processMessage ANSWERING', message);
        /* global RTCSessionDescription: false */
        isPC && this.pc.setRemoteDescription(
          new MyRTCSessionDescription(message),
          function() {
            l('DEBUG') && console.log("Successfully set the ANSWER Description");
          },
          function(error) {
            console.error('setRemoteDescription has an Error', error);
          });
        this._setState('connected');
        break;
      case 'offer':
        /*
         * When an Offer is Received 
         * 
         * 1.  Set the RemoteDescription -- depending on that result, emit alerting.  whoever catches alerting needs to accept() in order
         * to answer;
         *
         * , we need to send an Answer, this may
         * be a renegotiation depending on our 'state' so we may or may not want
         * to inform the UI.
         */
        var offer = message;
        l('DEBUG') && console.log(this+'_processMessage received an offer ');
        if (this.getState() === 'disconnected') {
           self.pc.setRemoteDescription(new MyRTCSessionDescription(offer),
             /*onSuccess*/ function() {
               l('DEBUG') && console.log(this+' PRANSWER in processMessage for offer()');
                if (!self.dependencies.parent.sessionStarted()) { 
                  self.dependencies.parent._.activeSession.pranswer({'type': 'pranswer', 'sdp':''});
                }
                this._setState('alerting');
               }.bind(self),
               /*onFailure*/ function(error){
                 console.error('setRemoteDescription has an Error', error);
               });
        } else if (this.getState() === 'connected') {
          // THis should be a renegotiation.
          isPC && this.pc.setRemoteDescription(new MyRTCSessionDescription(message),
              /*onSuccess*/ function() {
                this.pc.createAnswer(this._gotAnswer.bind(this), function(error){
                  console.error('Failed to create Answer:'+error);
                });
              }.bind(this),
              /*onFailure*/ function(error){
                console.error('setRemoteDescription has an Error', error);
              });
        } else {
          l('DEBUG') && console.error(this+'_processMessage unable to process offer('+this.getState()+')', message);
        }
        break;
      case 'icecandidate':
        try {
          var iceCandidate = new MyRTCIceCandidate(message.candidate);
          l('DEBUG') && console.log(this+'_processMessage iceCandidate ', iceCandidate );
          isPC && this.pc.addIceCandidate(iceCandidate);
        } catch(err) {
          console.error('addIceCandidate threw an error', err);
        }
        break;
      default:
        // Pass it up out of here...
        // TODO: Fix this, should emit something different here...
        console.error(this+'._processMessage() Nothing to do with this message:', message);
      }
    } else {
      l('DEBUG') && console.log(this+'_processMessage Unknown Message', message);
    }
  },

 /**
  * Apply or update the Media configuration for the webrtc object
  * @param {object} [config]
  *
  * @param {boolean} config.enable
  * @param {object} config.broadcast
  * @param {boolean} config.broadcast.audio
  * @param {boolean} config.broadcast.video
  * @param {object} config.mediaIn
  * @param {object} config.mediaOut
  *
  * @param {function} [callback] callback called if getUserMedia enabled.
  *
  */
  setLocalMedia: function setLocalMedia(config,callback) {
    var enable = false;
    l('DEBUG') && console.log(this+'setLocalMedia() using config:', config);
    if (config && typeof config === 'object') {
      config.mediaIn && this.setMediaIn(config.mediaIn);
      config.mediaOut && this.setMediaOut(config.mediaOut);
      config.broadcast && this.setBroadcast(config.broadcast);
      enable = (typeof config.enable === 'boolean')? config.enable : enable;
    } else if (config && typeof config === 'function') {
      callback = config;
    } else {
      // using defaults
      l('DEBUG') && console.log(this+'setLocalMedia() using defaults');
    }

    var audio = this.config.broadcast.audio;
    var video = this.config.broadcast.video;
    var self = this;
    callback = callback || function(success, message) {
      l('DEBUG') && console.log(self+'.setLocalMedia() default callback(success='+success+',message='+message);
    };
    l('DEBUG') && console.log(self+'.setLocalMedia() audio['+audio+'] & video['+video+'], enable['+enable+']');

    // Enable AV or if enabled, attach it. 
    if (enable) {
      this.enableLocalAV(callback);
    }
    return this;
  },

  /**
   * Enable Local Audio/Video and attach it to the connection
   *
   * Generally called through setLocalMedia({enable:true})
   *
   * @param {object} options
   * @param {boolean} options.audio
   * @param {boolean} options.video
   * @callback 
   *
   */
  enableLocalAV: function(options, callback) {
    var self = this;
    var audio,video;
    if (options && typeof options === 'object') {
      audio = options.audio;
      video = options.video;
      // Update settings.
      this.setBroadcast({audio: audio, video: video});
    } else {
      callback = (typeof options === 'function') ? options : function(success, message) {
       l('DEBUG') && console.log(self+'.enableLocalAV() default callback(success='+success+',message='+message);
      };
      // using current settings.
      audio = this.config.broadcast.audio;
      video= this.config.broadcast.video;
    }

    var attachLocalStream = function attachLocalStream(stream){
      self.getMediaOut() && attachMediaStream(self.getMediaOut(),stream);
      if (self.pc) {
        if (self.pc.getLocalStreams()[0] === stream) {
          // Do nothing, already attached
          return true;
        } else {
          self._.localStream = stream;
          self.pc.addStream(stream);
          return true;
        }
      } else {
        l('DEBUG') && console.log(self+'.enableLocalAV() -- No peerConnection available');
        return false;
      }
    };
    
    if (audio || video ) { 
      if (this._.localStream) {
        l('DEBUG') && console.log(self+'.enableLocalAV() already setup, reattching stream');
        callback(attachLocalStream(this._.localStream));
      } else {
        getUserMedia({'audio': audio, 'video': video},
          /* onSuccess */ function(stream) {
            callback(attachLocalStream(stream));
          },
        /* onFailure */ function(error) {
          callback(false, "getUserMedia failed");
        });
      }
    } else {
      l('DEBUG') && console.log(self+'.enableLocalAV() - nothing to do; both audio & video are false');
    }
  },

 setIceServers: function(service) {
   function buildTURNobject(url) {
     // We expect this to be in form 
     // turn:<userid>@servername:port:credential:<password>
     var matches = /^turn:(\S+)\@(\S+\:\d+):credential:(.+$)/.exec(url);
     var user = matches[1] || null;
     var server = matches[2] || null;
     var credential = matches[3] || null;

     var iceServer = {
       'url': null,
       'username': null,
       'credential': null
     };
     if (user && server && credential) {
       iceServer.url = 'turn:'+server;
       iceServer.username= user;
       iceServer.credential= credential;
     } else {
       l('DEBUG') && console.log('Unable to parse the url into a Turn Server');
       iceServer = null;
     }
     return iceServer;
   }

    // Returned object expected to look something like:
    // {"iceServers":[{"url": "stun:host:port"}, {"url","turn:host:port"}] 
    var urls = [];
    if (service && service.iceURL)  {
        service.iceURL.split(',').forEach(function(url){
          // remove leading/trailing spaces
          url = url.trim();
          var obj = null;
          if (/^stun:/.test(url)) {
            l('DEBUG') && console.log(this+'.setIceServers() Is STUN: '+url);
            obj = {'url': url};
          } else if (/^turn:/.test(url)) {
            l('DEBUG') && console.log(this+'.setIceServers() Is TURN: '+url);
            obj = buildTURNobject(url);
          } else {
            l('DEBUG') && console.error('Failed to match anything, bad Ice URL: '+url);
          }
          obj && urls.push(obj);
        });
    } 
    this.config.iceServers = urls;
   },
  getIceServers: function() {
    return this.config.iceServers;
    }
 };

})()); // End of Prototype

function createPeerConnection(RTCConfiguration, RTCConstraints, /* object */ context) {
  var peerConnection = null;
  if (typeof MyRTCPeerConnection !== 'undefined'){
    l('DEBUG')&& console.log("Creating PeerConnection with RTCConfiguration: " + RTCConfiguration + "and contrainsts: "+ RTCConstraints);
    peerConnection = new MyRTCPeerConnection(RTCConfiguration, RTCConstraints);

    //attach callbacks
    peerConnection.onicecandidate = function (evt) {
      l('DEBUG') && console.log(this+'onicecandidate Event',evt);
      if (evt.candidate) {
          l('DEBUG') && console.log(this+'onicecandidate Sending Ice Candidate');
          var msg = {'type': evt.type,'candidate': evt.candidate};
          this.send(msg);
      }
    }.bind(context);  // End of onicecandidate

    peerConnection.oniceconnectionstatechange = function (evt) {
      if (this.pc === null) {
        // If we are null, do nothing... Weird cases where we get here I don't understand yet.
        l('DEBUG') && console.log(this+' oniceconnectionstatechange ICE STATE CHANGE fired but this.pc is null');
        return;
      }
      l('DEBUG') && console.log(this+' oniceconnectionstatechange ICE STATE CHANGE '+ this.pc.iceConnectionState);
      // When this is connected, set our state to connected in webrtc.
      if (this.pc.iceConnectionState === 'disconnected') {
        this.disable();
      } else if (this.pc.iceConnectionState === 'connected') {
        this._setState('connected');
      }
    }.bind(context);  // End of oniceconnectionstatechange

    // once remote stream arrives, show it in the remote video element
    peerConnection.onaddstream = function (evt) {
      //Only called when there is a VIDEO or AUDIO stream on the remote end...
      l('DEBUG') && console.log(this+' onaddstream Remote Stream Arrived!', evt);
      l('TRACE') && console.log("TRACE onaddstream AUDIO", evt.stream.getAudioTracks());
      l('TRACE') && console.log("TRACE onaddstream Video", evt.stream.getVideoTracks());
      // This isn't really used, may remove
      if (evt.stream.getAudioTracks().length > 0) {
       // this.audio = true;
      }
      if (evt.stream.getVideoTracks().length > 0) {
       // this.video = true;
      }
      /*
       * At this point, we now know what streams are requested
       * we should see what component we have (if we do) and see which one
       * we find and confirm they are the same...
       *
       */
      // Save the stream
      context._.remoteStream = evt.stream;
      if (context.getMediaIn()) {
        l('DEBUG') && console.log(this+' onaddstream Attaching inbound stream to: ',context.getMediaIn());
        attachMediaStream(context.getMediaIn(), evt.stream);
      }
    }.bind(context);

    peerConnection.onnegotiationneeded = function(evt) {
      l('DEBUG') && console.log('ONNEGOTIATIONNEEDED : Received Event - ', evt);
      if ( this.pc.signalingState === 'stable' && this.getState() === 'CONNECTED') {
        // Only if we are stable, renegotiate!
        this.pc.createOffer(
            /*onSuccess*/ function(offer){
              this.pc.setLocalDescription(offer,
                  /*onSuccess*/ function() {
                  this.send(offer);
              }.bind(this),
                  /*onFailure*/ function(error){
                    console.error(error);
                  });


            }.bind(this),
            /*onFailure*/ function(error) {
              console.error(error);
            });
      } else {
        l('DEBUG') && console.log('ONNEGOTIATIONNEEDED Skipping renegotiate - not stable && connected. State: '+ this.pc.signalingState);
      }
    }.bind(context);

    peerConnection.onsignalingstatechange = function(evt) {
        l('DEBUG') && console.log('peerConnection onsignalingstatechange fired: ', evt);
    }.bind(context);

    peerConnection.onclosedconnection = function(evt) {
      l('DEBUG') && console.log('FIREFOX peerConnection onclosedconnection fired: ', evt);
    }.bind(context);
    peerConnection.onconnection = function(evt) {
      l('DEBUG') && console.log('FIREFOX peerConnection onconnection fired: ', evt);
    }.bind(context);

    peerConnection.onremovestream = function (evt) {
      l('DEBUG') && console.log('peerConnection onremovestream fired: ', evt);
      // Stream Removed...
      if (this.pc === null) {
        // If we are null, do nothing... Weird cases where we get here I don't understand yet.
        l('DEBUG') && console.log('peerConnection onremovestream fired: ', evt);
        return;
      }
      // TODO: Emit an event...
      // cleanup(?)
    }.bind(context);

  } else {
    throw new Error("No RTCPeerConnection Available - unsupported browser");
  }
  return peerConnection;
}  // end of createPeerConnection

/*
 *  Following are used to handle different browser implementations of WebRTC
 */
var getBrowser = function() {
    if (typeof navigator === 'undefined' && typeof window === 'undefined') {
      // probably in node.js no browser support
      return ('node.js','unknown');
    } else  if (navigator && navigator.mozGetUserMedia) {
      // firefox
      return("firefox", parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10));
    } else if (navigator && navigator.webkitGetUserMedia) {
     return("chrome", parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10));
    } else {
      return("Unknown","Unknown");
    }
  };

var MyRTCPeerConnection = (function() {
  /*global mozRTCPeerConnection:false */
  /*global webkitRTCPeerConnection:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  } else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCPeerConnection;
  } else if (navigator && navigator.webkitGetUserMedia) {
    return webkitRTCPeerConnection;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();

var MyRTCSessionDescription = (function() {
  /*global mozRTCSessionDescription:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  }  else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCSessionDescription;
  } else if (typeof RTCSessionDescription !== 'undefined' ) {
    return RTCSessionDescription;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();

l('DEBUG') && console.log("Setting RTCSessionDescription", MyRTCSessionDescription);


var MyRTCIceCandidate = (function() {
  /*global mozRTCIceCandidate:false */
  /*global RTCIceCandidate:false */
  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    return null;
  } else if (navigator && navigator.mozGetUserMedia) {
    return mozRTCIceCandidate;
  } else if (typeof RTCIceCandidate !== 'undefined') {
    return RTCIceCandidate;
  } else {
    return null;
  //  throw new Error("Unsupported Browser: ", getBrowser());
  }
})();
l('DEBUG') && console.log("RTCIceCandidate", MyRTCIceCandidate);

var validMediaElement = function(element) {
  return( (typeof element.srcObject !== 'undefined') ||
      (typeof element.mozSrcObject !== 'undefined') ||
      (typeof element.src !== 'undefined'));
};

/*
 * Assign getUserMedia, attachMediaStream as private class functions
 */
var getUserMedia, attachMediaStream,detachMediaStream;
/* globals URL:false */

  if (typeof navigator === 'undefined' && typeof window === 'undefined') {
    getUserMedia = null;
    attachMediaStream = null;
    detachMediaStream = null;
  // Creating methods for Firefox
  } else if (navigator && navigator.mozGetUserMedia) {

    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    // Attach a media stream to an element.
    attachMediaStream = function(element, stream) {
      l('DEBUG') && console.log("FIREFOX --> Attaching media stream");
      try { 
        element.mozSrcObject = stream;
    //    element.play();
      } catch (e) {
        console.error('Attach Media Stream failed in FIREFOX:  ', e);
      }
    };
    detachMediaStream = function(element) {
    l('DEBUG') && console.log("FIREFOX --> Detaching media stream");
    if (element) {
      element.mozSrcObject = null;
    }
  };

} else if (navigator && navigator.webkitGetUserMedia) {
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
  attachMediaStream = function(element, stream) {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.error('Error attaching stream to element.');
    }
  };
  detachMediaStream = function(element) {
    var nullStream = '';
    if (element) {
      if (typeof element.srcObject !== 'undefined') {
        element.srcObject = nullStream;
      } else if (typeof element.mozSrcObject !== 'undefined') {
        element.mozSrcObject = nullStream;
      } else if (typeof element.src !== 'undefined') {
        element.src = nullStream;
      } else {
        console.error('Error attaching stream to element.');
      }
    }
  };
} else {
  console.error("Browser does not appear to be WebRTC-capable");
  var skip = function skip() {
    console.error("Function not supported in browser");
  };
  getUserMedia = skip;
  attachMediaStream = skip;
  detachMediaStream = skip;
}

return WebRTCConnection;

})();



return EndpointProvider;

}));
