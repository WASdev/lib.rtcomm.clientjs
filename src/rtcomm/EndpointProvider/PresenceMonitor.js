/*global l:false*/
var normalizeTopic = function normalizeTopic(topic) {
  // have only 1 /, starts with a /, ends without a /
  // Replace the two slashes if they exist...
  // Remove trailing slash
  var newTopic = null;
  newTopic = topic.replace(/\/+/g,'\/').replace(/\/$/g, '');
  return /^\//.test(newTopic) ? newTopic : '/'+newTopic;
};


/** 
 * @memberof module:rtcomm.PresenceMonitor
 * @class 
 */
var PresenceNode = function PresenceNode(nodename, record) {
  /** Object Name 
  *  @readonly
  */
  this.objName = 'PresenceNode';
  /** Node Name 
  *  @readonly
  */
  this.name = nodename || '';
  /** If it is a final record (rather than a tree node)
  *  @readonly
  */
  this.record = record || false;
  /** Address Topic (topic to contact another endpoint) 
  *  @readonly
  */
  this.addressTopic = null;
  /** Presence Topic (topic to presence is published to) 
  *  @readonly
  */
  this.presenceTopic = null;
  /** Sub Presence Nodes if present 
  *  @readonly
  */
  this.nodes= [];
  /** Id (same as name) 
  *  @readonly
  */
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

PresenceNode.prototype = util.RtcommBaseObject.extend(
  /** @lends module:rtcomm.PresenceMonitor.PresenceNode */
  {
  /* 
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
    var new_flat = [];
    this.nodes.forEach(function(node){
      if (node.record) {
        flat.push(node);
      } else {
        new_flat = flat.concat(node.flatten());
      } 
    });
    return (new_flat.length > 0) ? new_flat: flat;
  },
  /* 
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
    l('TRACE') && console.log(this+'.findSubNode() searching for nodes --> ', nodes);
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
    l('TRACE') && console.log(this+ '.findSubNode() this.name is: '+this.name);
    if(nodes[0] === this.name) {
      var match = null;
      // Search... 
      l('TRACE') && console.log(this+ '.findSubNode() searching node '+nodes[0]+' for '+nodes[1]);
      for(var i = 0; i<this.nodes.length;i++ ) {
        if ( this.nodes[i].name === nodes[1] ) { 
          l('TRACE') && console.log(this+ '.findSubNode() >>> We found '+nodes[1]);
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
        l('TRACE') && console.log(this+ '.findSubNode() >>> The match was found for: '+nodes[1]);
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
    l('TRACE') && console.log(this+'.createSubNode() Would created node for nodes --> ', nodes);
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
          l('TRACE') && console.log(this+'.createSubNode() Creating Node: '+nodes[1]);
          n = new PresenceNode(nodes[1]);
          this.nodes.push(n);
        }
        // call create node on the node we found/created w/ a modified array (pulling the first
        // entry off)
        return n.createSubNode(nodes.slice(1));
      } else {
        l('TRACE') && console.log(this+ '.createSubNode() Not Creating Node, return this: ',this);
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
      return true;
    } else {
      l('DEBUG') && console.log(this+'.deleteSubNode() Node not found for topic: '+topic);
      return false;
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
 *  @fires module:rtcomm.PresenceMonitor#updated
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
  // Initialize the presenceData w/ the Root Node
  this._.rootNode = new PresenceNode("/");
  this._.presenceData=[this._.rootNode];
  this._.monitoredTopics ={}; 

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
      // UPdate the flat presence object just in case...
    } else {
      // No Root Node
      l('DEBUG') && console.error('No Root node... dropping presence message');
    }
  }

  /** @lends module:rtcomm.PresenceMonitor.prototype */
  var proto = { 
    /**
     * Add a topic to monitor presence on
     *
     * @param {string} topic  A topic/group to monitor, ex. 'us/agents'
     *
     */
    add: function add(topic) {
     // var presenceData = this._.presenceData;
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
          //this._.presenceData.push(node);
          node.getSubNode(topic);
        }
        this.dependencies.connection.subscribe(subscriptionTopic, processMessage.bind(this));
        this._.monitoredTopics[topic]=subscriptionTopic;
      } else {
        // No Sphere topic.
        throw new Error('Adding a topic to monitor requires the EndpointProvider be initialized');
      }
      return this;
    },
    /**
     * Remove a topic to monitor
     * @param {string} topic  A topic/group to monitor, ex. 'us/agents'
     */
    remove: function remove(topic) {
      //var presenceData = this._.presenceData;
      topic = normalizeTopic(topic);
      if(!this.getRootNode().deleteSubNode(topic)) {
        throw new Error('Topic not found: '+topic);
      } else {
        this.dependencies.connection && this.dependencies.connection.unsubscribe(this._.monitoredTopics[topic]);
        delete this._.monitoredTopics[topic];
      }
      return this;
    },

    setEndpointConnection: function setEndpointConnection(connection) {
      var pm = this;
      if (connection) {
        this.dependencies.connection = connection;
        this._.sphereTopic = normalizeTopic(connection.getPresenceRoot()) ||  null;
        // reset presence Data:
        this._.rootNode.nodes = [];
        var t = util.makeCopy(this._.monitoredTopics);  // Clone the array
        this._.monitoredTopics = {};
        Object.keys(t).forEach(function(topic){
          pm.add(topic);
        });
      }
    },

    /**
     * @typedef {array.<module:rtcomm.PresenceMonitor.PresenceNode>} module:RtcommEndpoint.PresenceMonitor.PresenceData
     */
    /**
     * Get an array representing the presence data
     * @returns {array.<module:rtcomm.PresenceMonitor.PresenceNode>} PresenceData
     */
    getPresenceData: function getPresenceData() {
      return this._.presenceData;
    },
    /**
     * Return the root presenceNode if it exists.
     *
     * @param {string} topic
     * @returns {PresenceNode} The root PresenceNode for a topic (if it already exists)
     */
    getRootNode: function getRootNode() {
      return this._.rootNode;
    },
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
     l('TRACE') &&  console.log(this+'.getRootNode() for topic:'+topic+' found: ',rootNode);
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
       this._.rootNode = null;
       this._.presenceData = [];
       // Unsubscribe ..
       Object.keys(pm._.monitoredTopics).forEach(function(key) {
         pm.dependencies.connection && pm.dependencies.connection.unsubscribe(pm._.monitoredTopics[key]);
       });
    }
  } ;
  return proto;
})());
