/** 
 * @class
 * @memberof module:rtcomm
 * @classdesc
 * Provides Services to register a user and create RtcommNodes
 * <p>
 * This programming interface lets a JavaScript client application use a {@link module:rtcomm.RtcommNode|Real Time Communication Node} 
 * to implement WebRTC simply. When {@link module:rtcomm.NodeProvider|instantiated} & {@link module:rtcomm.RtcommNodeProvider#init|initialized} the 
 * RtcommNodeProvider connects to the defined MQTT Server and subscribes to a unique topic that is used to receive inbound communication.   
 * <p>
 * See the example in {@link module:rtcomm.NodeProvider#init|NodeProvider.init()}
 * <p>
 * 
 * @requires {@link mqttws31.js}
 *   
 */ 
var NodeProvider =  function NodeProvider() {

  var MISSING_DEPENDENCY = "RtcommNodeProvider Missing Dependency: ";
  if (!util) { throw new Error(MISSING_DEPENDENCY+"rtcomm.util");}
  if (!connection) { throw new Error(MISSING_DEPENDENCY+"rtcomm.connection");}

  /** @lends module:rtcomm.NodeProvider */

  /* configuration */
  var defaultConfig = {
      appContext: 'rtcomm',
      server:null,
      port: 1883,
      userid : null,
      connectorTopicName : "nodeConnector",
      connectorTopicPath: "/rtcomm/",
      credentials : { user: "", password: ""},
      register: false,
      createNode: false
  };

  this.config = defaultConfig;
  // Internal objects
  this.ready = false;
  
  // Default rtcommNode (First instance created)
  this.defaultRtcommNode = null;
  
  this.events = { 
      /**
       * A new RtcommNode was created from an inbound 
       * @event module:rtcomm.NodeProvider#newnode
       * @property {module:rtcomm#RtcommNode}
       */
      'newnode': []};
  
  /** services supported by the NodeConnection, populated in init()*/
  this.services = null; 

  /** 
   * NodeProvider Init config object
   * @typedef  {Object} module:rtcomm.NodeProvider~InitOptions
   * @property {string} server MQTT Server
   * @property {string} [port=1883] MQTT Server Port 
   * @property {string} userid User ID or Identity
   * @property {string} [connectorTopicName=nodeConnection] connectorTopicName on rtcomm server
   * @property {string} [connectorTopicPath=/rtcomm/] MQTT Path to prefix connectorTopicName with and register under
   * @property {boolean} [register=false] Automatically register
   * @property {boolean} [createNode=false] Automatically create a {@link module:rtcomm.RtcommNode|RtcommNode}
   */

  /** init method
   *  This method is required to be called prior to doing anything else.
   * @param  {module:rtcomm.NodeProvider~InitOptions} config - Configuration object for init
   * @param {function} [onSuccess] Callback function when init is complete successfully.
   * @param {function} [onFailure] Callback funtion if a failure occurs during init
   * @param {function} [status]  Callback function to monitor status of init
   * 
   * @example
   * var nodeProvider = new ibm.rtcomm.RtcommNodeProvider(); 
   * var nodeProviderConfig = {
   *   server : 'broker.mqttdashboard.com',       
   *   userid : 'ibmAgent1@mysurance.org',
   *   connectorTopicName : 'nodeConnector',   
   *   connectorTopicPath : '/rtcomm/', 
   *   port : 8000,                          
   *   register: true,                     
   *   createNode : true,                   
   *   credentials : null                  
   * };
   *
   * // Initialize the Service. [Using onSuccess/onFailure callbacks]
   * // This initializes the MQTT layer and enables inbound Communication.
   * var rtcommNode = null;  
   * nodeProvider.init(nodeProviderConfig, 
   *    function(object) { //onSuccess
   *        console.log('init was successful, rtcommNode: ', object);
   *        rtcommNode = object;
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
      l('INFO') && console.log('NodeProvider.init() has been called and the object is READY');
      return true;
    }
    var requiredConfig = { server: 'string', port: 'number', userid: 'string'};
    var config = this.config;
    var nodeProvider = this;
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
      throw new Error("RtcommNodeProvider initialization requires a minimum configuration: " + JSON.stringify(requiredConfig));
    }

    cbSuccess = cbSuccess || function(message) {
      console.log(nodeProvider+'.init() Default Success message, use callback to process:', message);
    };
    cbFailure = cbFailure || function(error) {
      console.log(nodeProvider+'.init() Default Failure message, use callback to process:', error);
    };
    this.userid = config.userid;

    this.nodeConnection = new connection.NodeConnection({
      server: config.server,
      port: config.port,
      userid: config.userid,
      connectorTopicName: config.connectorTopicName,
      connectorTopicPath: config.connectorTopicPath
    });

    var nodeConnection = this.nodeConnection;
    nodeConnection.setLogLevel(getLogLevel());


    var onSuccess = function(message) {
      var returnObj = {
          'ready': true,
          'registered': false,
          'nodeObj': null
      };
      this.ready = true;
      
      nodeConnection.service_query(
          /* onSuccess */ function(services) {
            // Returned services
            l('DEBUG') && console.log('Supported services are: ', services);
            this.services = services || null;
            
          }.bind(this),
          /* onFailure */ function(error){
            console.error('Unable to lookup supported services');
          });
     
      if (config.register) {
        nodeConnection.register(config.appContext, 
            function(message) {
          returnObj.registered = true;
          if (config.createNode) {
            returnObj.node  = nodeProvider.createRtcommNode();
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

    nodeConnection.on('newsession', function(session) {
      /*
       * What to do on an inbound request.
       * 
       * Options:
       *  Do we have a default node?  if so, just give the session to it. 
       *  
       *  if that node is busy, create a new node and emit it.
       *  
       *  If there isn't a node, create a Node and EMIT it.
       *
       */  
      if(session) {
        console.log("Handle a new incoming session: ", session);
        var node = nodeProvider.defaultRtcommNode;
        if (node && node.available) {
          console.log('using an existing node...', node);
          node.newSession(session);
        } else {
          node = nodeProvider.createRtcommNode();
          node.newSession(session);
          nodeProvider.emit('newnode', node);
        }
      } else {
        console.error('newsession - expected a session object to be passed.');
      }
    });
    
    nodeConnection.on('message', function(message) {
      if(message) {
        console.log("TODO:  Handle an incoming message ", message);
      }
    });
  
    // Connect!
    nodeConnection.connect( onSuccess.bind(this), onFailure.bind(this));
  
    
  };  // End of RtcommNodeProvider.init()


  /** 
   * @typedef {object} module:rtcomm.NodeProvider~NodeConfig 
   *  @property {boolean} [audio=true] Support audio in the PeerConnection - defaults to true
   *  @property {boolean} [video=true] Support video in the PeerConnection - defaults to true
   *  @property {boolean} [data=true]  Support data in the PeerConnectio - defaults to true
   *  @property {String}  [context='none'] Context for the Handler. Used in messages and with the server. defaults to 'none'
   */

  /**
   * createRtcommNode - Factory method that returns a RtcommNode object to be used
   * by a UI component.  
   * 
   *  The rtcommNode object provides an interface for the UI Developer to attach Video and Audio input/output. 
   *  Essentially mapping a broadcast stream(a MediaStream that is intended to be sent) to a RTCPeerConnection output
   *  stream.   When an inbound stream is added to a RTCPeerConnection, then the RtcommNode object also informs the 
   *  RTCPeerConnection where to send that stream in the User Interface.  
   *
   * @param {module:rtcomm.NodeProvider~NodeConfig} nodeConfig - Configuration to initialize node with. 
   *  
   * @returns {module:rtcomm.RtcommNode|RtcommNode}  A RtcommNode Object
   * 
   * @example 
   *  var nodeConfig = { 
   *    audio: true, 
   *    video: true, 
   *    data: false, 
   *    };
   *  rtcommNodeProvider.createRtcommNode(nodeConfig);
   *  
   *  @throws Error
   */
  this.createRtcommNode = function createRtcommNode(nodeConfig) {
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
    applyConfig(nodeConfig, objConfig);

    // Reflect this into the RtcommNode.
    l('DEBUG') && console.log(this+'.createRtcommNode using config: ', objConfig);
    var node = Object.create(RtcommNode);
    node.init(objConfig);
    // Register
    try {
      this.defaultRtcommNode = this.defaultRtcommNode || node;
      return node;
    } catch(e){
      throw new Error(e);
    }
  };
  
  this.destroy =    function() {
    //TODO:  Add NodeRegistry... 
    // Unregister (be nice...)
    
    this.unregister();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of nodeRegistry');
    this.nodeConnection.destroy();
    l('DEBUG') && console.log(this+'.destroy() Finished cleanup of nodeConnection');
    
  }; 
   
  // exposing module global functions for set/get loglevel
  this.setLogLevel = setLogLevel;
  this.getLogLevel = getLogLevel;
  /** 
   *  Register the 'userid' used in {@link module:rtcomm.RtcommNodeProvider#init|init} with the
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
    }
    //console.log('appContext is:'+ appContext);
    //console.log('cbSuccess is:'+ cbSuccess);
    //console.log('cbFailure is:'+ cbFailure);
    
    if (!this.ready) {
      throw new Error('Not Ready! call init() first');
    }
    this.nodeConnection.register(appContext, cbSuccess, cbFailure);
  };
  /** 
   *  Unregister from the server
   */
  this.unregister = function() {
    this.nodeConnection.unregister();
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
    this.nodeConnection.register_query(userid, cbSuccess, cbFailure);
  };

  this.currentState = function() {
    return {
      states:  this._private,
      config : this.config,
      defaultRtcommNode: this.defaultRtcommNode
    };

  };

}; // end of constructor

NodeProvider.prototype = util.RtcommBaseObject.extend({});


