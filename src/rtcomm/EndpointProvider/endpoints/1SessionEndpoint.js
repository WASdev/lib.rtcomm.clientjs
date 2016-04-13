/*
 * Copyright 2016 IBM Corp.
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

/**
 *  @memberof module:rtcomm.EndpointProvider
 *  @description
 *  This object can only be created with the {@link module:rtcomm.EndpointProvider#getSessionEndpoint|getSessionEndpoint} function.
 *  <p>
 *  The SessionEndpoint object provides the base implementation of an endpoint that implements the basic Rtcomm Session Protocol
 *  over MQTT.  Different SubProtocols can be added to the Session Endpoint to construct a different Type of Endpoint.
 *
 *  @constructor
 *  @extends  module:rtcomm.util.RtcommBaseObject
 */
var SessionEndpoint = function SessionEndpoint(config) {
  /**
   * @typedef {object} module:rtcomm.EndpointProvider.SessionEndpoint~config
   *
   * @property {boolean} [autoEnable=false]  Automatically enable SubProtocols upon connect if the protocol is supported on the Endpoint..
   * @property {string}  [userid=null] UserID the endpoint will use (generally provided by the EndpointProvider
   * @property {string}  [appContext=null] AppContext of the endpoint.  TODO: Link to what this is.
   * @property {module:rtcomm.EndpointProvider} [parent] - set the parent Should be done automatically.
   */
  // Default configuration
  this.config = {
    // if a feature is supported, enable by default.
    autoEnable: false,
    ignoreAppContext: true,
    appContext: null,
    userid: null,
  };
  // Dependencies
  this.dependencies = {
    endpointConnection: null,
    parent: null
  };
  // Private info.
  this._ = {
    objName: 'SessionEndpoint',
    activeSession: null,
    available: true,
    /*global generateUUID:false */
    uuid: generateUUID(),
    initialized: false,
    disconnecting: false,
    protocols: []
  };
  // Used to store the last event emitted;
  this.lastEvent = null;
  // Used to store the current state of the Endpoint
  this.state = 'session:stopped';
  var self = this;
  // Apply the passed in Config to the Endpoint config.
  config && Object.keys(config).forEach(function(key) {
    if (key === 'parent') {
      self.dependencies[key] = config[key];
      self.dependencies.endpointConnection = config[key].getEndpointConnection();
    } else {
      self.config[key] = config[key];
    }
  });

  // expose some parameters at the top level of the object 
  this.id = this._.uuid;
  this.userid = this.config.userid || null;
  this.appContext = this.config.appContext || null;

  this.events = {
    /**
     * A signaling session to a peer has been established
     * @event module:rtcomm.EndpointProvider.SessionEndpoint#session:started
     *  @property {name} eventName Name of the Event
     *  @property {module:rtcomm.EndpointProvider.SessionEndpoint} endpoint- an object passed with the event
     */
    "session:started": [],
    /**
     * An inbound request to establish a call via
     * 3PCC was initiated
     *
     * @event module:rtcomm.EndpointProvider.SessionEndpoint#session:refer
     *  @property {name} eventName Name of the Event
     *  @property {module:rtcomm.EndpointProvider.SessionEndpoint} endpoint- an object passed with the event
     *
     */
    "session:refer": [],
    /**
     * A peer has been reached, but not connected (inbound/outound)
     * @event module:rtcomm.EndpointProvider.SessionEndpoint#session:ringing
     *  @property {name} eventName Name of the Event
     *  @property {module:rtcomm.EndpointProvider.SessionEndpoint} endpoint- an object passed with the event
     */
    "session:trying": [],
    /**
     * A Queue has been contacted and we are waiting for a response.
     * @event module:rtcomm.EndpointProvider.SessionEndpoint#session:queued
     *  @property {name} eventName Name of the Event
     *  @property {module:rtcomm.EndpointProvider.SessionEndpoint} endpoint- an object passed with the event
     */
    "session:queued": [],
    /**
     * A peer has been reached, but not connected (inbound/outound)
     * @event module:rtcomm.EndpointProvider.SessionEndpoint#session:ringing
     *  @property {name} eventName Name of the Event
     *  @property {module:rtcomm.EndpointProvider.SessionEndpoint} endpoint- an object passed with the event
     * @property {int} queuePosition location in queue
     */
    "session:ringing": [],
    /**
     * An inbound connection is being requested.
     * @event module:rtcomm.EndpointProvider.SessionEndpoint#session:alerting
     *  @property {name} eventName Name of the Event
     *  @property {module:rtcomm.EndpointProvider.SessionEndpoint} endpoint- an object passed with the event
     *  @property {string} [protocols] - Used for alerting messages
     */
    "session:alerting": [],
    /**
     * A failure occurred establishing the session (check reason)
     * @event module:rtcomm.EndpointProvider.SessionEndpoint#session:failed
     *  @property {name} eventName Name of the Event
     *  @property {module:rtcomm.EndpointProvider.SessionEndpoint} endpoint- an object passed with the event
     *  @property {string} [reason] - Used for failure messages
     */
    "session:failed": [],
    /**
     * The session has stopped
     * @event module:rtcomm.EndpointProvider.SessionEndpoint#session:stopped
     *  @property {name} eventName Name of the Event
     *  @property {module:rtcomm.EndpointProvider.SessionEndpoint} endpoint- an object passed with the event
     *
     */
    "session:stopped": [],
    "destroyed": []
  };
};
/*globals util:false*/
/*globals l:false*/
SessionEndpoint.prototype = util.RtcommBaseObject.extend((function() {

  /** Create a signaling session. */
  function createSignalingSession(endpoint, context) {
    var remoteEndpointID = null;
    var toTopic = null;
    l('DEBUG') && console.log(context + ' createSignalingSession using endpoint: ', endpoint);
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
    l('DEBUG') && console.log(context + " createSignalingSession context: ", context);
    var sessid = null;
    if (!remoteEndpointID) {
      throw new Error('remoteEndpointID must be set');
    }
    var session = context.dependencies.endpointConnection.createSession({
      id: sessid,
      toTopic: toTopic,
      protocols: context._.protocols,
      remoteEndpointID: remoteEndpointID,
      appContext: context.config.appContext
    });
    return session;
  }

  /*
   * Add the session Callbacks.
   */
  function addSessionCallbacks(context, session) {
    // Define our callbacks for the session.
    // received a pranswer
    session.on('have_pranswer', function(content) {
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
     */
    session.on('queued', function(content) {
      l('DEBUG') && console.log('SigSession callback called to queue: ', content);
      var position = 0;
      if (typeof content.queuePosition !== 'undefined') {
        position = content.queuePosition;
        context.setState('session:queued', {
          'queuePosition': position
        });
        content = (content.message) ? content.message : content;
      } else {
        context.setState('session:queued');
        context._processMessage(content);
      }
    });
    session.on('message', function(content) {
      l('DEBUG') && console.log('SigSession callback called to process content: ', content);
      context._processMessage(content);
    });
    session.on('started', function(content) {
      // Our Session is started!
      content && context._processMessage(content);
      context.setState('session:started');
    });
    session.on('stopped', function(message) {
      // We could already be stopped, ignore it in that case.
      l('DEBUG') && console.log(context + ' SigSession callback called to process STOPPED: ' + context.getState());
      if (context.getState() !== 'session:stopped') {
        // In this case, we should disconnect();
        context.setState('session:stopped');
        context.disconnect();
      }
    });
    session.on('starting', function() {
      context.setState('session:trying');
    });
    session.on('failed', function(message) {
      context.disconnect();
      context.setState('session:failed', {
        reason: message
      });
    });
    l('DEBUG') && console.log(context + ' createSignalingSession created!', session);
    // session.listEvents();
    return true;
  }

  /** @lends module:rtcomm.EndpointProvider.SessionEndpoint.prototype */
  var proto = {
    /** Return the appContext */
    getAppContext: function getAppContext() {
      return this.config.appContext;
    },
    /** Handle a newSession is created inbound, this method will be called on this endpoint */
    newSession: function newSession(session) {
      var event = null;
      var msg = null;
      // If there is a session.appContext, it must match unless this.ignoreAppContext is set
      if (this.config.ignoreAppContext ||
        (session.appContext && (session.appContext === this.getAppContext())) ||
        (typeof session.appContext === 'undefined')) {
        // We match appContexts (or don't care)
        if (this.available()) {
          // We are available (we can mark ourselves busy to not accept the call)
          // Save the session
          this._.activeSession = session;
          addSessionCallbacks(this, session);
          var commonProtocols = util.commonArrayItems(this._.protocols, session.protocols);
          l('DEBUG') && console.log(this + '.newSession() common protocols: ' + commonProtocols);
          // If this session is created by a REFER, we do something different
          if (session.referralTransaction) {
            // Don't start it, emit 'session:refer'
            l('DEBUG') && console.log(this + '.newSession() REFER');
            // Set the protocols to match the endpoints.
            session.protocols = this._.protocols;
            this.setState('session:refer');
          } else if (commonProtocols.length > 0 || (this._.protocols.length === 0 && session.protocols.length === 0)) {
            // have a common protocol (or have NO protocols)
            // any other inbound session should be started.
	    // Disable any unsupported protocols (if enabled)
            session.start({
              protocols: commonProtocols
            });
	    
	    var sessionContext = this;
            this._.protocols.forEach(function(protocol) {

		if (commonProtocols.indexOf(protocol) === -1) {
                // Not found, disable it if enabled
                l('DEBUG') && console.log(this + '.newSession() Disabling Unsupported protocol: '+protocol);
                sessionContext[protocol].enabled() && sessionContext[protocol].disable();
              }
            });
            // Depending on the session.message (i.e its peerContent or future content) then do something.
            session.pranswer();
            // if there are messages, pass them along.
            if (session.message && session.message.payload) {
              // We need to pranswer here at this level.
              // TODO:  May need to ask protocols if they have naything to pranswer with.
              this._processMessage(session.message.payload);
            }
            this.setState('session:alerting', {
              protocols: commonProtocols
            });
          } else {
            // can't do anything w/ this session, same as busy... different reason.
            l('DEBUG') && console.log(this + '.newSession() No common protocols');
            session.fail('No common protocols');
          }
          this.available(false);
        } else {
          msg = 'Busy';
          l('DEBUG') && console.log(this + '.newSession() ' + msg);
          session.fail('Busy');
        }
      } else {
        msg = 'Client is unable to accept a mismatched appContext: (' + session.appContext + ') <> (' + this.getAppContext() + ')';
        l('DEBUG') && console.log(this + '.newSession() ' + msg);
        session.fail(msg);
      }
    },

    /* Process inbound messages.  This is basically a protocol router
     *   When inbound messages are have a protocol, we will route the message
     *   to the particular protocol
     */
    _processMessage: function _processMessage(payload) {

      var self = this;
      /*
       * payload will be a key:object map where key is 'webrtc' or 'chat' for example
       * and the object is the 'content' that should be routed to that object.
       */
      // basically a protocol router...
      //
      var protocols;

      if (payload && payload.protocols) {
        protocols = payload.protocols;
        payload = payload.payload;
      }

      if (payload) {
        l('DEBUG') && console.log(this + '._processMessage received: ', payload);
        for (var protocol in payload) {
          if (payload.hasOwnProperty(protocol)) {
            // we  protocol is in payloads
            if (self.hasOwnProperty(protocol)) {
              // we have this protocol defined pass message to the protocol
              // if protocol is enabled, pass the message
              if (self[protocol].enabled()) {
                l('DEBUG') && console.log(this + '_processMessage() passing to protocol:', protocol);
                self[protocol]._processMessage(payload[protocol]);
              } else {
                console.error('Received %s message, but not enabled!', protocol, payload[protocol]);
              }
            } else {
              console.error('Received %s message, but not supported!', protocol, payload[protocol]);
            }
          } else {
            console.error('property not in protocol');
          }
        } // end of for
      } else {
        l('DEBUG') && console.log(this + ' Received message, but nothing to do with it', payload);
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
        l('DEBUG') && console.log(this + '.available() setting available to ' + a);
        return a;
      } else {
        return this._.available;
      }
    },

    /**
     * Connect to another endpoint.  Depending on what is enabled, it may start
     * a connection on the supported protocols.
     *
     * @param {string|object} endpoint Remote ID of endpoint to connect.
     */
    connect: function(endpoint) {
      if (this.ready()) {
        this.available(false);
        this._.disconnecting = false;
        if (!this._.activeSession) {
          l('DEBUG') && console.log(this + '.connect() connecting to endpoint : ', endpoint);
          if (typeof endpoint === 'string') {

            //TODO Move this to the EnpdointProvider
            var pm = this.dependencies.parent.getPresenceMonitor();
            // We do not require  aserver, and there is no service configured (serviceQuery failed)
            if (!this.dependencies.parent.requireServer() && Object.keys(this.getRtcommConnectorService()).length === 0) {
              // If we don't require a server, try to figure out the endpoint Topic
              l('DEBUG') && console.log(this + '.connect() Looking up endpoint : ', endpoint);
              var node = pm.getPresenceData()[0].findNodeByName(endpoint);
              var newep = node ? {
                remoteEndpointID: endpoint,
                toTopic: node.addressTopic
              } : endpoint;
              l('DEBUG') && console.log(this + '.connect() found endpoint : ', newep);
              endpoint = newep;
            }
          }
          l('DEBUG') && console.log(this + '.connect() Creating signaling session to: ', endpoint);
          this._.activeSession = createSignalingSession(endpoint, this);
          addSessionCallbacks(this, this._.activeSession);
        }
        this.setState('session:trying');
        this._getStartMessage(function start(success, startMessage) {
          // Send our message
          //TODO Fix debug logging
          l('DEBUG') && console.log(this + '.connect() sending startMessage w/ message', startMessage);
          if (startMessage) {
            this._.activeSession.start({
              'payload': startMessage
            });
          } else {
            this._.activeSession.start();
          }
        }.bind(this));
      } else {
        throw new Error('Unable to connect endpoint until EndpointProvider is initialized');
      }
      return this;
    },

    /** 
     *  Get the message by calling a method on all protocols
     *
     *  @param String method The method name to call on the protocols to retrieve a message to send.
     *  @callback callback returns a message
     */
    _getGenericMessage: function _getGenericMessage(method, callback) {
      var self = this;
      var returnMessage = {};
      var protocols = this._.protocols;
      var callbacks = 0;
      // How many are enabled?
      var enabled = [];
      for (var i = 0; i < protocols.length; i++) {
        var protocol = protocols[i];
        if (self.hasOwnProperty(protocol) && self[protocol].enabled()) {
          enabled.push(protocol);
        }
      }
      var msgCallback = function msgCallback(success, message) {
        // message should/must be {'protcool': {some message }}
        callbacks++;
        l('DEBUG') && console.log('_getMessage success[' + success + '] message: ', message);
        returnMessage = (message) ? util.combineObjects(message, returnMessage) : returnMessage;
        // We've been called the right number of times.
        l('DEBUG') && console.log('_getMessage success[' + success + ']' + callbacks + ': ' + enabled.length);
        if (callbacks === enabled.length) {
          l('DEBUG') && console.log('_getMessage [' + method + '] Return Message generated: ', returnMessage);
          callback(true, returnMessage);
        }
      };

      enabled.forEach(function msgGetter(protocol) {
        l('DEBUG') && console.log('_getMessage[' + method + '] on protocol: ' + protocol);
        self[protocol][method](msgCallback);
      });

      if (enabled.length === 0) {
        //This endpoint has no protocols call w/ the callback and empty msg
        callback(true, null);
      }

    },
    /*
     * Get the start Message -- this will call 'connect' on all sub protocols.
     * (though it won't really connect yet)
     * TODO:  Think this through.
     */
    _getStartMessage: function _getStartMessage(callback) {
      this._getGenericMessage('connect', callback);
    },

    _getStopMessage: function(callback) {
      this._getGenericMessage('disconnect', callback);
    },
    _getAcceptMessage: function _getAcceptMessage(callback) {
      this._getGenericMessage('accept', callback);
    },

    /**
     * Disconnect the endpoint from a remote endpoint.
     */
    disconnect: function() {
      l('DEBUG') && console.log(this + '.disconnect() Entry');
      if (!this._.disconnecting) {
        // Not in progress, move along
        l('DEBUG') && console.log(this + '.disconnect() Starting disconnect process');
        this._.disconnecting = true;
        this._getStopMessage(function cbDisconnect(success, stopMessage) {
          if (!this.sessionStopped()) {
            this._.activeSession.stop(stopMessage);
            this._.activeSession = null;
            this.setState('session:stopped');
          } else {
            this._.activeSession = null;
          }
          this._.disconnecting = false;
          this.available(true);
        }.bind(this));
      } else {
        l('DEBUG') && console.log(this + '.disconnect() in progress, cannot disconnect again');
      }
      l('DEBUG') && console.log(this + '.disconnect() Exit');
      return this;
    },
    /**
     * Accept an inbound request.  This is typically called after a
     * {@link module:rtcomm.EndpointProvider.SessionEndpoint#session:alerting|session:alerting} event
     *
     * @returns {module:rtcomm.EndpointProvider.SessionEndpoint}
     */
    accept: function accept() {
      // If refer, we have been told to connect to someone, call connect on ourself.
      if (this.getState() === 'session:refer') {
        this.connect(null);
      } else {
        this._getAcceptMessage(function cbAccept(success, acceptMessage) {
          l('DEBUG') && console.log(this + '.connect() sending ANSWER w/ message', acceptMessage);
          // acceptMessage may be null, which means no one has a message for accepting, let the session do what it wants.
          this._.activeSession.respond(true, acceptMessage);

        }.bind(this));
      }
      return this;
    },

    /**
     * Reject an inbound request.  This is typically called after a
     * {@link module:rtcomm.EndpointProvider.SessionEndpoint#session:alerting|session:alerting} event
     *
     */
    reject: function() {
      l('DEBUG') && console.log(this + ".reject() invoked ");
      this._stopRing();
      var self = this;
      this._.protocols.forEach(function(protocol) {
        if (self.hasOwnProperty(protocol) && self[protocol].enabled()) {
          self[protocol].reject();
        }
      });
      this._.activeSession && this._.activeSession.fail("The user rejected the call");
      this.available(true);
      this._.activeSession = null;
      return this;
    },

    getRtcommConnectorService: function() {
      return this.dependencies.endpointConnection.services.RTCOMM_CONNECTOR_SERVICE;
    },
    /* used by the parent to assign the endpoint connection */

    setEndpointConnection: function(connection) {
      this.dependencies.endpointConnection = connection;
      this.dependencies.endpointConnection.on('servicesupdate', function(services) {
        l('DEBUG') && console.log('setEndpointConnection: resetting the ice servers to ' + services.RTCOMM_CONNECTOR_SERVICE);
        //    webrtc && webrtc.setIceServers(services.RTCOMM_CONNECTOR_SERVICE);
      });
    },

    /** Return user id
     * @returns {string} Local UserID that endpoint is using
     */
    getUserID: function(userid) {
      return this.config.userid;
    },

    setUserID: function(userid) {
      this.userid = this.config.userid = userid;
    },

    getState: function() {
      return this.state;
    },

    /**
     * Endpoint is ready to connect
     * @returns {boolean}
     */
    ready: function() {
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
      var state = (this._.activeSession) ? (this._.activeSession.getState() === 'stopped') : true;
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
    destroy: function() {
      l('DEBUG') && console.log(this + '.destroy Destroying SessionEndpoint');
      this.emit('destroyed');
      this.disconnect();
      // this.getLocalStream() && this.getLocalStream().stop();
      l('DEBUG') && console.log(this + '.destroy() - detaching media streams');
      //detachMediaStream && detachMediaStream(this.getMediaIn());
      //detachMediaStream && detachMediaStream(this.getMediaOut());
      l('DEBUG') && console.log(this + '.destroy() - Finished');
    },

    /* This is an event formatter that is called by the prototype emit() to format an event if
     * it exists
     * When passed an object, we ammend it w/ eventName and endpoint and pass it along.
     */
    _Event: function Event(event, object) {
      var RtcommEvent = {
        eventName: '',
        endpoint: null
      };
      l('DEBUG') && console.log(this + '_Event -> creating event[' + event + '], augmenting with', object);
      RtcommEvent.eventName = event;
      RtcommEvent.endpoint = this;
      if (typeof object === 'object') {
        Object.keys(object).forEach(function(key) {
          RtcommEvent[key] = object[key];
        });
      }
      l('DEBUG') && console.log(this + '_Event -> created event: ', RtcommEvent);
      return RtcommEvent;
    },
    /* add a protocol */
    /**
     * Add a Protocol to the endpoint. This is typically used to create another TYPE of endpoint
     *
     * @example
     * // Add the Chat Protocol
     * this.addProtocol(new ChatProtocol());
     * // this.chat will now be defined
     *
     * @param {module:rtcomm.EndpointProvider.SubProtocol} a `new SubProtocol()` instance of a protocol 
     *
     */
    addProtocol: function addProtocol( /*SubProtocol or String*/ protocol) {
      // Add it to the protocols list
      protocol.setParent(this);
      this._.protocols.push(protocol.name);
      this[protocol.name] = protocol;
      var self = this;
      /* don't emit anything by default...
      Object.keys(protocol.events).forEach(function addEvent(eventname) {
        self.createEvent(protocol.name+':'+eventname);
      });
      // add a common event handler for here... to generically emit events.
      this[protocol.name].bubble(function(eventObject) {
        console.log('>>>>> Bubble handling event for :', eventObject.eventName);
        console.log('>>>>> Bubble handling event with object :', eventObject.object);
        // alerting is at the session level.  emit it that way.
        if (eventObject.eventName === 'alerting') {
          self.emit('session:alerting', eventObject.object);
        } else {
          self.emit(protocol.name+':'+eventObject.eventName, eventObject.object);
        }
      });
      */
    }
  };

  // This construct is to get the jsdoc correct
  return proto;

})()); // End of Prototype
