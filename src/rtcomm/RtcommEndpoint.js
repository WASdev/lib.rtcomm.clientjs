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
          anonymous: false,
          userid: null,
          parent: null,
          inboundMedia: null,
          attachMedia: false
      };

      this.id = this._private.uuid;
      this.userid = null;

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
          /**
           * An inbound request to establish a call via 
           * 3PCC was initiated
           */
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
          'message': [],
          /**
           * A message has arrived from a peer
           * @event module:rtcomm.RtcommEndpoint#destroyed
           * @property {module:rtcomm#RtcommEvent}
           */
          'destroyed': []
      };

      l('DEBUG') && console.log(this+'.init() Applying config to this._private ', config, this._private);
      if (config) {
        this.update = (config.update)?config.update: this.update;
        delete config.update;
        applyConfig(config, this._private);
        this.userid = this._private.userid;
      }

      // Expose the appcontext/userid on the object
      this.endpointConnection = this._private.parent.endpointConnection;
      this.appContext = this._private.appContext;

      this._initialized = true;
      /* inbound and outbound Media Element DOM Endpoints */
      this.media = {
          In: null,
          Out: null
      };

      this.available = true;
      this.localStream=null;

      // return  a reference to ourselves for chaining
      return this;
    },
    setUserID : function(userid) {
      this.userid = userid;
    },


    send: function(message) {
      if (this.conn.getState() === 'STARTED')  {
        message && this.conn.send(message);
      } else {
        throw new Error ('A connection to an Endpoint should exist, call addEndpoint() first');
      }
    },


    update: function() { console.log('Default function, should have been overridden');},

    reset: function() {
      this.available = true;
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
      this.emit('destroyed', this);
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
      // 
      // When we get a new session, we must confirm its OURS - there are two checks:
      //
      // 1.  do we match AppContext?
      // 2.  if its a queue, do we match it?
      // 3.  
      //
      //
      var event = null;
      if ((session.appContext === this.appContext) || this.ignoreAppContext) {
        // We match appContexts (or don't care)
        if (this.available) {
          // We are available (we can mark ourselves busy to not accept the call)
          event = 'incoming';
          if (session.type === 'refer') {
            l('DEBUG') && console.log(this + '.newSession() REFER');
            event = 'refer';
          }
          this.conn = this.createConnection();
          this.conn.init({session:session});
          this.available = false;
          this.emit(event, this.conn);
        } else {
          var msg = 'Busy';
          l('DEBUG') && console.log(this+'.newSession() '+msg);
          session.fail('Busy');
        }
      } else {
        var msg = 'Client is unable to accept a mismatched appContext: ('+session.appContext+') <> ('+this.appContext+')';
        l('DEBUG') && console.log(this+'.newSession() '+msg);
        session.fail(msg);
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
      this.available = false;
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
      this.available = false;
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
        this.available = true;
        this.conn.disconnect();
        this.conn = null;
      } else {
        this.conn = null;
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
