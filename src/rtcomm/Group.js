/*
 * Copyright 2015 IBM Corp.
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
 *
 *  @param {Object}  [config] 
 *  @param {Object}  [config.protocols] 
 *  @param {boolean} [config.protocols.webrtc=true] Support audio in the PeerConnection - defaults to true
 *  @param {boolean} [config.protocols.chat=true] Support video in the PeerConnection - defaults to true
 *  @param {string}  config.name 
 *
 *  @returns {module:rtcomm.Group} Group
 *  @throws Error
 */

var Group = function Group(config) {
  var protocols, 
      name;
  if (config) {
    if (typeof config === 'string') {
      name = config;
    } else {
      protocols = config.protocols || {'webrtc':true, 'chat':true};
      name = config.name || null;
    }
  }
  // 'name' is required.
  if (!name) {
    throw new Error("Group: name is required to create a group");
  }
  this.config = {
    protocols: protocols,
  };

  this.name = name;

  this.dependencies = {
    endpointConnection: null,
  };

  // Private info.
  this._ = {
    groupSession: null,
    appContext: null
  };
  // Events we emit.
  this.events = {

  };

};
/*globals util:false*/
/*globals l:false*/
Group.prototype = util.RtcommBaseObject.extend((function() {

  function createSignalingSession(remoteEndpointID, context) {
    l('DEBUG') && console.log("createSignalingSession context: ", context);
    var sessid = null;
    var toTopic = null;
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
    addSessionCallbacks(context, session);
    return session;
  }
  // Protocol Specific handling of the session content. 
  //
  //
  function addSessionCallbacks(context, session) {
     // Define our callbacks for the session.
    session.on('pranswer', function(payload){
      context._processMessage(payload);
    });
    session.on('message', function(payload){
      l('DEBUG') && console.log('SigSession callback called to process payload: ', payload);
      context._processMessage(payload);
    });
    session.on('started', context._startup);
    
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
  /**
   * Join the group.
   * @param {array} members List of endpointIDs the group service should invite to join.
   *
   */
  join: function join(members) {
    // Create a Session to 'group:name'
    this._.groupSession = createSignalingSession("group:"+this.name,this);

    // Build the payload
    var payload = {};
    var content = {};
    if (members && members instanceof Array ) {
      content.add = members;
    }
    if (this.topic) {
      content.topicPath = this.topic;
    }
    if (content.add || content.topicPath) {
      payload.type = 'group';
      payload.content = content;
    }
    this._.groupSession.start({'payload': payload});
  },

  add: function add(members) {
    // Send a message to the 'group:name' w/ some info...
  },

  leave: function leave() {
    // Send a STOP_SESSION to any open sessions, and finally the group.
  },

  _startup: function _startup(payload) {
    // Our Session is started!
    // We need to subscribe to our messaging service and group document
    if (payload && payload.type === 'group') {
      // we need a payload.content.topicPath 
      if (payload.content && payload.content.topicPath) {
        this.topicPath === payload.content.topicPath;
      }
    }

    this.dependencies.endpointConnection.subscribe(this.topicPath, this._processMessage);

  },


  _processMessage: function _processMessage(message) {
    // This needs to handle several types of inbound messages:
    //
    // session:started -- get group topic, subscribe to it and its message topic
    //
    // inbound info(?Chat?) on the message topic.
    //
    // Group Updates with group list [ DOCUMENT message of type GROUP]

  },

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


