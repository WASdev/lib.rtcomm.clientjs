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
 *  @memberof module:rtcomm
 *  @description
 *  This object can only be created with the {@link module:rtcomm.RtcommEndpointProvider#createRtcommEndpoint|createRtcommEndpoint} function.
 *  <p>
 *  The rtcommEndpoint object provides an interface for the UI Developer to attach Video and Audio input/output.
 *  Essentially mapping a broadcast stream(a MediaStream that is intended to be sent) to a RTCPeerConnection output
 *  stream.   When an inbound stream is added to a RTCPeerConnection, then this also informs the RTCPeerConnection
 *  where to send that stream in the User Interface.
 *  <p>
 *  See the example under {@link module:rtcomm.RtcommEndpointProvider#createRtcommEndpoint|createRtcommEndpoint}
 *  @constructor
 *
 *  @extends  module:rtcomm.util.RtcommBaseObject
 */
var RtcommEndpoint = util.RtcommBaseObject.extend((function() {

  // Used to store registration timer.
  var registerTimer = null;

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
  if (navigator && navigator.mozGetUserMedia) {
    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    // Attach a media stream to an element.
    attachMediaStream = function(element, stream) {
      l('DEBUG') && console.log("FIREFOX --> Attaching media stream");
      element.mozSrcObject = stream;
      element.play();
    };
    detachMediaStream = function(element) {
      l('DEBUG') && console.log("FIREFOX --> Detaching media stream");
      if (element) {

        element.mozSrcObject = null;
        console.log('Element is: ', element);
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
        console.log('Error attaching stream to element.');
      }
    };
    detachMediaStream = function(element) {
      if (element) {
        if (typeof element.srcObject !== 'undefined') {
          element.srcObject = null;
        } else if (typeof element.mozSrcObject !== 'undefined') {
          element.mozSrcObject = null;
        } else if (typeof element.src !== 'undefined') {
          element.src = null;
        } else {
          console.log('Error attaching stream to element.');
        }
      }
    };
  } else {
    console.log("Browser does not appear to be WebRTC-capable");
  }


  var Queues = function Queues(availableQueues) {
    var Queue = function Queue(queue) {
      this.endpointID= queue.endpointID;

      // If it ends
      if (/#$/.test(queue.topic)) {
        this.topic = queue.topic;
      } else if (/\/$/.test(queue.topic)) {
        this.topic = queue.topic + "#";
      } else { 
        this.topic = queue.topic + "/#";
      }
      this.active= false;
      this.callback= null;
      this.paused= false;
      this.regex= null;
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
      Object.keys(queues).forEach(function(queue) {
        queues[queue].regex.test(topic) && matches.push(queues[queue]);
        });
     if (matches.length === 1 ) {
       return matches[0];
     } else {
       throw new Error('Multiple Queue matches for topic('+topic+')- should not be possible');
     }
    };
    this.list = function(){
      return Object.keys(queues);
    };
  };

  Queues.prototype.toString = function() {
    this.list();
  };


  /** @lends module:rtcomm.RtcommEndpoint.prototype */
  return {

    _initialized: false,
    /** initialize the object */
    init: function(config) {
      /* Object to store private information */
      this._private =  {
          uuid: generateUUID(),
          autoAnswer: false,
          audio: true,
          video: true,
          data: true,
          appContext: 'rtcomm',
          userid: null,
          parent: null,
          inboundMedia: null,
          attachMedia: false
      };

      /** @typedef {object} module:rtcomm#RtcommEvent
       *  @property {string} name - name of event
       *  @property {object} object - an object passed with the event
       *  @property {message} message - a message associated with the event
       */


      this.events = {
          /**
           * A connection to a peer has been established
           * @event module:rtcomm.RtcommEndpoint#connected
           * @property {module:rtcomm#RtcommEvent}
           */
          "connected": [],
          "refer": [],
          /**
           * The connection to a peer has been closed
           * @event module:rtcomm.RtcommEndpoint#disconnected
           * @property {module:rtcomm#RtcommEvent}
           */
          "disconnected": [],
          /**
           * A peer has been reached, but not connected (inbound/outound)
           * @event module:rtcomm.RtcommEndpoint#ringing
           * @property {module:rtcomm#RtcommEvent}
           */
          "ringing": [],
          /**
           * A connection is being attempted (outbound only)
           * @event module:rtcomm.RtcommEndpoint#trying
           * @property {module:rtcomm#RtcommEvent}
           */
          "trying": [],
          /**
           * An inbound connection is being requested.
           * @event module:rtcomm.RtcommEndpoint#incoming
           * @property {module:rtcomm#RtcommEvent}
           */
          "incoming": [],
          /**
           * A message has arrived from a peer
           * @event module:rtcomm.RtcommEndpoint#message
           * @property {module:rtcomm#RtcommEvent}
           */
          'message': []
      };


      l('DEBUG') && console.log(this+'.init() Applying config to this._private ', config, this._private);
      if (config) {
        this.update = (config.update)?config.update: this.update;
        delete config.update;
        applyConfig(config, this._private);
      }
      this.endpointConnection = this._private.parent.endpointConnection;
      this.queues = new Queues();
      console.log('QUEUES: ',this.queues.list());
      this.queues.add((this.endpointConnection && 
                              this.endpointConnection.RTCOMM_CALL_QUEUE_SERVICE && 
                              this.endpointConnection.RTCOMM_CALL_QUEUE_SERVICE.queues)
                              || []);
      console.log('QUEUES: ',this.queues.list());
      l('DEBUG') && console.log('RtcommEndpoint.init() queues are: ', this.queues);
      /* inbound and outbound Media Element DOM Endpoints */
      this.media = {
          In: null,
          Out: null
      };

      // Expose the appcontext/userid on the object
      this.appContext = this._private.appContext;
      this.userid = this._private.userid;
      this.available = true;
      this.localStream=null;
      this._initialized = true;
    },
    /**
     *  Register the 'userid' used in {@link module:rtcomm.RtcommEndpointProvider#init|init} with the
     *  rtcomm service so it can receive inbound requests.
     *
     *  @param {function} [onSuccess] Called when register completes successfully with the returned message about the userid
     *  @param {function} [onFailure] Callback executed if register fails, argument contains reason.
     */
    register : function(cbSuccess, cbFailure) {
      var minimumReregister = 30;  // 30 seconds;
      var onSuccess = function(register_message) {
        l('DEBUG') && console.log(this+'register() REGISTER RESPONSE: ', register_message);
        if (register_message.orig === 'REGISTER' && register_message.expires) {
          var expires = register_message.expires;
          l('DEBUG') && console.log(this+'.register() Message Expires in: '+ expires);
          /* We will reregister every expires/2 unless that is less than minimumReregister */
          var regAgain = expires/2>minimumReregister?expires/2:minimumReregister;
          // we have a expire in seconds, register a timer...
          l('DEBUG') && console.log(this+'.register() Setting Timeout to:  '+regAgain*1000);
          registerTimer = setTimeout(this.register.bind(this), regAgain*1000);
        }
        this.registered = true;
        // Call our passed in w/ no info...
        if (cbSuccess && typeof cbSuccess === 'function') {
          cbSuccess();
        } else {
          l('DEBUG') && console.log(this + ".register() Register Succeeded (use onSuccess Callback to get the message)", message);
        }
      };

      // {'failureReason': 'some reason' }
      var onFailure = function(errorObject) {
        if (cbFailure && typeof cbFailure === 'function') {
          cbFailure(errorObject.failureReason);
        } else {
          console.error('Registration failed : '+errorObject.failureReason);
        }
      };
      // Call register!
      if (this._initialized) {
        var message = this.endpointConnection.createMessage('REGISTER');
        message.appContext = this.appContext || "none";
        message.regTopic = message.fromTopic;
        var t = this.endpointConnection.createTransaction({message:message}, onSuccess.bind(this), onFailure.bind(this));
        t.start();
      } else {
        if (cbSuccess && typeof cbSuccess === 'function') {
          cbFailure('Not Ready, unable to register.');
        } else {
          console.error('Not Ready, unable to register.');
        }
      }
    },
    /**
     *  Unregister the userid associated with the EndpointConnection
     */
    unregister : function() {
      if (registerTimer) {
        clearTimeout(registerTimer);
        registerTimer=null;
        var message = this.endpointConnection.createMessage('REGISTER');
        message.regTopic = message.fromTopic;
        message.appContext = this.appContext;
        message.expires = "0";
        this.endpointConnection.send({'message':message});
        this.registered = false;
      } else {
        l('DEBUG') && console.log(this+' No registration found, cannot unregister');
      }
    },

    update: function() { console.log('Default function, should have been overridden');},

    reset: function() {
      this.disconnect();
      this.localStream && this.localStream.stop();
      detachMediaStream && detachMediaStream(this.getMediaIn());
      detachMediaStream && detachMediaStream(this.getMediaOut());
    },
    /**
     *  Destroy this endpoint.  Cleans up everything and disconnects any and all connections
     *
     */
    destroy : function() {
      l('DEBUG') && console.log(this+'.destroy Destroying RtcommEndpoint');
      this.registered && this.unregister();
      this.disconnect();
      this.localStream && this.localStream.stop();
      l('DEBUG') && console.log(this+'.destroy() - detaching media streams');
      detachMediaStream && detachMediaStream(this.getMediaIn());
      detachMediaStream && detachMediaStream(this.getMediaOut());
      l('DEBUG') && console.log(this+'.destroy() - Finished');
    },

    newSession : function(session) {
      // This is how we get an inbound session.
      // If our session is not 'normal', i.e. it is a 3PCC session
      // then we need to behave differently:
      // should be just display 'RINGING' and let them create ANOTHER session.
      //
      l('DEBUG') && console.log(this + '.newSession() new session called w/ ',session);
      // If session.source is in a queue we have open
      // Match the source, then immediately pause the queue (if that is on...)
      if (session.source) {
        var q = null;
        try {
          q = this.queues.findByTopic(session.source);
          if(q.active) { 
            this.pauseSessQueue(q.endpointID);
          } else {
            // Even though we matched a queue, we aren't active. drop it.
            console.error('Session recieved on a Topic that is not active for this endpoint');
            return false;
          }
        } catch(e) {
          console.error('This Enpdoint does not support inbound calls from this source');
        }
        console.log('found q: ', q);
      }

      if ((session.appContext === this.appContext) || this.ignoreAppContext) {
        if (this.available) {
          var event = 'incoming';
          if (session.type === 'refer') {
          l('DEBUG') && console.log(this + '.newSession() REFER, sending pranswer()');
    //      session.pranswer();
          event = 'refer';
        }
        this.conn = this.createConnection();
        this.conn.init({session:session});
        this.emit(event, this.conn);
        } else {
          var msg = 'Busy';
          l('DEBUG') && console.log(this+'.newSession() '+msg);
          session.respond(false,'Busy');
        }
      } else {
        var msg = 'Client is unable to accept a mismatched appContext: ('+session.appContext+') <> ('+this.appContext+')';
        l('DEBUG') && console.log(this+'.newSession() '+msg);
        session.respond(false,msg);
      }
    },

    createConnection : function(config, onSuccess, onFailure) {

      if (!this._initialized) {
        throw new Error('Not Ready! call init() first');
      }
      // ourself is the rtcommEndpoint
      var rtcommEndpoint = this;
      config = config || {};
      config.rtcommEndpoint = rtcommEndpoint;
      // Call the ClientServide createConnection with correct context set and config;
      rtcommEndpoint.conn  = new WebRTCConnection({
        audio: this.getAudio(),
        video: this.getVideo(),
        data: this.getData(),
        appContext: this._private.appContext,
        toEndpointID: config.toEndpointID,
        rtcommEndpoint: rtcommEndpoint,
        endpointConnection: this.endpointConnection,
        onEvent: function(event) {
          // This type of event is event.name...
          rtcommEndpoint.emit(event.name, event);
        }
      });
      return rtcommEndpoint.conn;
    },

    // TODO:  Remove?
    /**
     * attachLocalMedia method used to validate internal setup and set things up if not already done.
     *
     * The setup requires a mediaOut & mediaIn object w/ src attribute.  it also requires a localStream, or it will add it.
     * We should decouple this...
     *
     * @params {function} callback  Passed true/false if attachMedia is successful. If false, also gets a reason message.
     *
     */
    attachLocalMedia : function(/*callback*/ cbFunction) {
      var callback = cbFunction || function(value,message) {
        message = message || "No Message";
        console.log(this+"attachLocalMedia.callback should be overridden:("+value+","+message+")");
      };
      var rtcommEndpoint = this;
      l('DEBUG') && console.log('rtcommEndpoint.attachLocalMedia(): Setting up the rtcommEndpoint:', this);
      if (this.getAudio() || this.getVideo()|| this.getData()) {
        if (this.getMediaIn() && this.getMediaOut()) {
          // Must be set...
          if (this.localStream) {
            l('DEBUG') && console.log('rtcommEndpoint.attachLocalMedia(): Have a localStream already, apply it.', this.localStream);
            // we have a local stream, proceed to make a call.
            // TODO:  This following COMPARE is not browser agnostic
            if (URL.createObjectURL(this.localStream) === this.getMediaOut().src) {
              // We are connected and everthing...
              l('DEBUG') && console.log('rtcommEndpoint.attachLocalMedia(): Already setup, skipping');
              callback(true);
            } else {
              // Apply the stream.
              l('DEBUG') && console.log('rtcommEndpoint.attachLocalMedia(): Applying Local Stream');
              rtcommEndpoint.attachMediaStream(rtcommEndpoint.getMediaOut(),rtcommEndpoint.localStream);
              callback(true);
            }
          } else {
            // No local stream, get it!
            l('DEBUG') && console.log('rtcommEndpoint.attachLocalMedia(): No Stream, getting one! audio:'+ this.getAudio()+' video: '+ this.getVideo());
            this.getUserMedia({audio: this.getAudio(), video: this.getVideo()} ,
                /* onSuccess */ function(stream) {
              console.log('getUserMedia returned: ', stream);
              rtcommEndpoint.localStream = stream;
              rtcommEndpoint.attachMediaStream(rtcommEndpoint.getMediaOut(),stream);
              callback(true);
            },
            /* onFailure */ function(error) {
              callback(false, "getUserMedia failed");
            });
          }
        } else {
          callback(false, "mediaIn & mediaOut must be set" );
        }
      } else {
        callback(true);
      }
    },

    /**
     * Create a connection and send an offer to the id passed
     * <p>
     * This will go through event state "trying" --> "ringing" --> "connected",
     * These should be handled through onEvent
     *
     * @param {string} remoteId  - Id of CALLEE.
     * @throws Error No ID passed
     */
    addEndpoint : function(/* String */ remoteId){
      // When call is invoked, we must have a RemoteID and we must have mediaIn & Out set.
      // We need to confirm the stream is attached
      var rtcommEndpoint = this;
      l('DEBUG') && console.log(this + ".addEndpoint() Calling "+remoteId);
      if ( remoteId === null ) { throw new Error(".addEndpoint() requires an ID to be passed"); }

      this.attachLocalMedia(function(success, message) {
        if (success) {
          if (typeof rtcommEndpoint.createConnection === 'function') {
            rtcommEndpoint.createConnection({toEndpointID: remoteId, appContext: rtcommEndpoint.getAppContext()});
            rtcommEndpoint.conn.connect();
          } else {
            console.error("Don't know what to do, createConnection missing...");
          }
        } else {
          throw new Error(".addEndpoint() failed: "+ message);
        }
      });
    },
    /**
     *  Answers a call - [Sends an 'answer' on a connection that is inbound]
     *  There MAY be more than one connection present, if so, uses a passed ID to answer
     *  the right connection
     *
     *  @param {string} [id] Optional Id to answer.  Required if more than 1 connection
     *
     *  @throws Error Could not find connection to answer
     */
    acceptEndpoint : function(id) {
      var rtcommEndpoint = this;
      l('DEBUG') && console.log(this + ".answer() invoked ");
      rtcommEndpoint.attachLocalMedia(function(success, message) {
        if (success) {
          var connection = rtcommEndpoint.getConnection(id);
          if(connection) {
            connection.connect();
          } else {
            throw new Error(".answer() could not find a valid connection to answer.");
          }
        } else {
          throw new Error(".answer() failed: "+ message);
        }
      });
    },

    /**  Destroys an existing connection. If there are more than one, then requires an ID
     *
     *  @throws Error Could not find connection to hangup
     *
     */
    disconnect : function() {
      if (this.conn  && this.conn.getState() !== 'DISCONNECTED') {
        this.conn.disconnect();
        this.conn = null;
      } else {
        this.conn = null;
      }

    },
    //SessionQueue methods
    /**
     * Join a Session Queue
     */
    joinSessQueue: function joinSessQueue(/*String*/ queueid, /*object*/ options) {
    // Is queue a valid queuename?
      var rtcommEP = this;
      var callback = function(message) {
        //TODO: Emit only part of message or verify we should accept it?
        console.log('Received a normal message from Queue', message);
        rtcommEP.emit('message', message);
      };
      var q = this.queues.get(queueid);
      l('DEBUG') && console.log(this+'.joinSessQueue() Looking for queueid:'+queueid);

      if (q) {
        // Queue Exists... Join it
        // This callback is how inbound messages (that are NOT START_SESSION would be received)
        q.active = true;
        q.callback = callback;
        q.regex = this.endpointConnection.subscribe(q.topic, callback);
        return true;
      } else {
        throw new Error('Unable to find queue('+queueid+') available queues: '+ this.queues.list());
      }
    },
    pauseSessQueue: function pauseSessQueue(queueid) {
      l('DEBUG') && console.log(this+'.pauseSessQueue() ', queueid);
      var q = this.queues.get(queueid);
      if (q && q.paused) {
        l('DEBUG') && console.log(this+'.pauseSessQueue() - ALREADY PAUSED.');
        return true;
      }
      if (q) {
        q.paused = true;
        this.endpointConnection.unsubscribe(q.topic);
        return true;
      } else {
        console.error(this+'.pauseSessQueue() Queue not found: '+queueid);
        return false;
      }
    },
    resumeSessQueue: function resumeSessQueue(queueid) {
      var q = this.queues.get(queueid);
      if (q && !q.paused) {
        l('DEBUG') && console.log(this+'.resumeSessQueue() - Not Paused, no need to resume.');
        return true;
      }
      if (q ) {
        q.paused = false;
        this.endpointConnection.subscribe(q.topic,q.callback);
        return true;
      } else {
        console.error(this+'.resumeSessQueue() Queue not found: '+queueid);
        return false;
      }
    },
    leaveSessQueue: function leaveSessQueue(queueid) {
      var q = this.queues.get(queueid);
      if (q && !q.active) {
        l('DEBUG') && console.log(this+'.leaveSessQueue() - Not Active,  cannot leave.');
        return true;
      }
      if (q) {
       q.active = false;
       this.endpointConnection.unsubscribe(q.topic);
       return true;
      } else {
        console.error(this+'.leaveSessQueue() Queue not found: '+queueid);
        return false;
      }
    },

    // UserMedia Methods

    getUserMedia : getUserMedia,
    attachMediaStream : attachMediaStream,
    detachMediaStream : detachMediaStream,

    getConnection: function() { return this.conn ;},

    /** set the endpointConnection IFF it is null */
    setEndpointConnection: function(endpointConnection) {
      if (!this.endpointConnection) {
        this.endpointConnection = endpointConnection;
        this.queues.add((endpointConnection.RTCOMM_CALL_QUEUE_SERVICE && 
                         endpointConnection.RTCOMM_CALL_QUEUE_SERVICE.queues) 
                         || []);
        return true;
      } else {
        return false;
      }
    },
    /** Whether audio is enabled or not in the RtcommEndpoint.
     * @type Boolean
     * @throws Error Resulting Audio/Video/Data combination already exists for the context.
     * */
    getAudio: function() { return this._private.audio; },
    setAudio: function(/*boolean*/ value)  {
      if(this.update({audio: value}, this._private.uuid)) {
        this._private.audio = value;
      } else {
        throw new Error("Unable to set value, would create a registration that already exists");
      }
    },
    /** Whether Video is enabled or not in the RtcommEndpoint.
     * @type Boolean
     * @throws Error Resulting Audio/Video/Data combination already exists for the context.
     * */
    getVideo: function() { return this._private.video;},
    setVideo: function(/*boolean*/ value)  {
      if(this.update({video: value}, this._private.uuid)) {
        this._private.video = value;
      } else {
        throw new Error("Unable to set value, would create a registration that already exists");
      }
    },
    /** Whether data is enabled or not in the RtcommEndpoint.
     * @type Boolean
     * @throws Error Resulting Audio/Video/Data combination already exists for the context.
     * */
    getData: function() {return this._private.data;},
    setData: function(/*boolean*/ value)  {
      if(this.update({data: value}, this._private.uuid)) {
        this._private.data = value;
      } else {
        throw new Error("Unable to set value, would create a registration that already exists");
      }
    },
    /** context of the endpoint instance.  This is used to match nodes on endpoints so that each endpoint
     *  should have a node with the same context in order to communicate with each other. There can
     *  only be one context + audio/video/data combination.
     *
     *  @example
     *  // get the context
     *  var context = rtcommEndpoint.getAppContext();
     *  // set the context
     *  rtcommEndpoint.setAppContext("newcontext");
     *
     *  @throws Error Context already exists
     */
    getAppContext:function() {return this._private.appContext;},

    setAppContext:function(appcontext) {this.appContext = this._private.appContext = appcontext;},

    /** Return userid associated with this RtcommEndpoint */
    getUserid: function() { return this._private.userid;},
    getUuid: function() {return this._private.uuid;},
    /** RtcommEndpoint is ready to initiate a connection
     * @type Boolean */
    isReady: function() {return this._private.parent.isReady();},
    /* autoAnswer - used for testing */
    getAutoAnswer: function() { return this._private.autoAnswer;},
    setAutoAnswer: function(value) { this._private.autoAnswer = value;},

    setInboundMediaStream: function(stream) {
      this._private.inboundMedia=URL.createObjectURL(stream);
      if (this.getMediaIn()) {
        this.attachMediaStream(this.getMediaIn(), stream);
      }
    },
    getInboundMediaStream: function() { return this._private.inboundMedia;},

    /**
     * DOM node to link the RtcommEndpoint inbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    getMediaIn: function() {
      return this.media.In;
    },
    setMediaIn: function(value) {
      if(validMediaElement(value) ) {
        this.media.In = value;
        // if we already have an inboundMedia stream attached, attach it here.
        if (this._private.inboundMedia) {
          this.attachMediaStream(this.media.In, this._private.inboundMedia);
        }
      } else {
        throw new TypeError('Media Element object is invalid');
      }

    },
    /**
     * DOM Endpoint to link outbound media stream to.
     * @param {Object} value - DOM Endpoint with 'src' attribute like a 'video' node.
     * @throws Error Object does not have a src attribute
     */
    getMediaOut: function() { return this.media.Out; },
    setMediaOut: function(value) {
      if(validMediaElement(value) ) {
        this.media.Out = value;
        // if we already have an inboundMedia stream attached, attach it here.
        if (this.localStream) {
          this.attachMediaStream(this.media.In, this.localStream);
        }
      } else {
        throw new TypeError('Media Element object is invalid');
      }
    },
    toString: function() {
      return "RtcommEndpoint["+this._private.uuid+"]";
    }
  }; // end of Return

})());
