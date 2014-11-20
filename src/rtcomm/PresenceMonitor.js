var normalizeTopic = function normalizeTopic(topic) {
  // have only 1 /, starts with a /, ends without a /
  // Replace the two slashes if they exist...
  // Remove trailing slash
  var newTopic = null;
  newTopic = topic.replace('\/\/','\/').replace(/\/$/g, '');
  return /^\//.test(newTopic) ? newTopic : '/'+newTopic;
};
var PresenceNode = function PresenceNode(nodename, record) {
  this.objName = 'PresenceNode';
  this.name = nodename || '';
  this.record = record || false;
  this.topic = null;
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
    if(nodes[0] === this.name) {
      var match = null;
      // Search... 
      l('DEBUG') && console.log(this+ '.findSubNode() searching node '+nodes[0]+' for '+nodes[1]);
      for(var i = 0; i<this.nodes.length;i++ ) {
        if ( this.nodes[i].name === nodes[1] ) { 
          l('DEBUG') && console.log(this+ '.findSubNode() >>> Found '+nodes[1]);
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
        returnValue = match;
      } else {
        returnValue = this;
      }
    } else {
      returnValue = this;
    }
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
          l('DEBUG') && console.debug(this+'.createSubNode() Creating Node: '+nodes[1]);
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
      l('DEBUG') && console.debug(this+'.deleteSubNode() Deleting Node: '+nodeToDelete.name);
      // have to find its parent.
      var parentNode = this.findSubNode(nodes.slice(0, nodes.length-1));
      var index = parentNode.nodes.indexOf(nodeToDelete);
      // Remove it.
      parentNode.nodes.splice(index,1);
    } else {
      l('DEBUG') && console.debug(this+'.deleteSubNode() Node not found for topic: '+topic);
    }
  },
  addPresence: function addPresence(topic,presenceMessage) {
    var presence = this.getSubNode(topic);
    l('DEBUG') && console.debug(this+'.addPresence() created node: ', presence);
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
      presence.topic = msg.topic|| null;
      presence.nodes = msg.userDefines ||  [];
    }
  },
  removePresence: function removePresence(topic, endpointID) {
    this.deleteSubNode(topic);
  }
});

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
    l('DEBUG') && console.debug('PresenceMonitor received message: ', message);
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
    var presence = this.getRootNode(topic);
    if (presence) {
      if (message.content && message.content !== '') {
        // If content is '' or null then it REMOVES the presence record.
         presence.addPresence(topic, message);
      } else {
         presence.removePresence(topic, endpointID);
      }
      this.emit('updated');
    } else {
      // No Root Node
      l('DEBUG') && console.error('No Root node... dropping presence message');
    }
  }

  return { 
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
        var a = topic.split('/');
        rootTopic = (a[0] === '') ? a[1] : a[0];
        match = this.getRootNode(topic);
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
        console.error('No Sphere topic, not connected?');
      }
      return this;
    },
    setEndpointConnection: function setEndpointConnection(connection) {
      if (connection) {
        this.dependencies.connection = connection;
        this._.sphereTopic = normalizeTopic(connection.getPresenceRoot()) ||  null;
      }
    },
    getPresenceData: function getPresenceData() {
      return this._.presenceData;
    },
    getRootNode: function getRootNode(topic) {
      var rootNode = null;
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
      }
     return rootNode;
    },

  destroy: function() {
       l('DEBUG') &&  console.log('Destroying mqtt(unsubscribing everything... ');
       var pm = this;
       // Wipe out the data... 
       this._.presenceData = [];
       // Unsubscribe ..
       Object.keys(this._.subscriptions).forEach( function(key) {
         pm.unsubscribe(key);
       });
    }
  } ;
})());
