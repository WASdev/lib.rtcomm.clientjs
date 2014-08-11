/** 
 * A SigSession is an end to end signaling session w/ another Peer.
 * 
 * <p>
 * It is part of a WebRTCConnection and should ONLY be used via a WebRTCConnection.  It 
 * should only be created by 'NodeConnection.createSession()'
 * <p>
 * 
 * 
 * @class
 * @memberof module:rtcomm.connector
 *
 * Arguments are in the form of a 'config' object:
 *
 * @param  {object} config 
 *
 * When created due to an INBOUND connection:
 *   
 * 
 * @private
 */
var SigSession = function SigSession(config) {

  /* Instance Properties */
  this.objName = 'SigSession';
  this.nodeconnector = null;
  this.id = null;
  this.toEndpointID = null;
  this.message = null;
  this.toTopic = null;
  this.type = 'normal'; // or refer
  this.referralDetails = null;

  if (config) {
    if (config.message && config.message.sigSessID) {

      // We are INBOUND. 
      this.message = config.message;
      this.id = config.message.sigSessID;
      this.toEndpointID = config.fromEndpointID || null;
      this.toTopic = config.toTopic || config.message.fromTopic || null;

      if (config.message.peerContent && config.message.peerContent.type === 'refer') {
        this.type = 'refer';
        this.referralDetails = config.message.peerContent.details;
      }
   
    }
   
    this.id = this.id || config.id;
    this.toTopic = this.toTopic || config.toTopic;
  } 
  
  this.id = this.id || generateUUID();
 
  this.events = {
      'starting':[],
      'started':[],
      'failed':[],
      'stopped':[],
      'message':[],
      'ice_candidate':[],
      'have_pranswer':[],
      'pranswer':[],
      'finished':[]
  };
  // Initial State
  this.state = 'stopped';
  // Default our timeout waiting for initial start to 30 seconds.
  this.timeout = 30000; 
  
  

};


SigSession.prototype = util.RtcommBaseObject.extend((function() {
  /** @lends module:rtcomm.connector.SigSession.prototype */
  return { 
    /** 
     * Init method
     * @param config  -- message:message, fromEndpointID: endpointid, toTopic: toTopic
     */
    
    _setupQueue: function _setupQueue() {
      this._messageQueue = {
          'messages': [],
          'processing': false            
      };
      
      this.on('started', this._processQueue.bind(this));
      this.on('have_pranswer', this._processQueue.bind(this));
      this.on('pranswer', this._processQueue.bind(this));
      
    },
    _processQueue : function _processQueue() {
        var q = this._messageQueue.messages;
        var processingQueue = this._messageQueue.processing;
        if (processingQueue) {
          return;
        } else {
          processingQueue = true;
          l('DEBUG') && console.log(this+'.processQueue processing queue... ', q);
          q.forEach(function(message){
            this.send(message);
          }.bind(this));
          q = [];
          processingQueue=false;
        }
      },
    /**
     * 
     * start must be called to send the first message.
     * options are:
     * 
     *  config = {toEndpointID: something, sdp:  }
     */
    start : function(config) {
      this._setupQueue();
      l('DEBUG') && console.log('SigSession.start() using config: ', config);
      var toEndpointID = this.toEndpointID;
      var sdp = null;
      if (config) {
        this.toEndpointID = toEndpointID = config.toEndpointID || toEndpointID;
        sdp = config.sdp || null;
      }
      this.state = 'starting';
      console.log('toEnpdointID is:'+toEndpointID);
      if (!toEndpointID) {
        throw new Error('toEndpointID is required in start() or SigSession() instantiation');
      }  

      /*
       * If we are new, (no message...) then we shoudl create START and 
       *  a Transaction and send it....
       *  and establish an on('message');
       *    
       */
      if (!this.message) {
        this.message = this.createMessage('START_SESSION');
        this.message.peerContent = sdp || null;
      }
      var session_started = function(message) {
        // our session was successfully started, if Outbound session, it means we 
        // recieved a Response, if it has an Answer, we need to pass it up.
        l('DEBUG') && console.log(this+'.sessionStarted!  ', message);
        this.state = 'started';
        this._startTransaction = null;
        //  this.processMessage(message);
        // if Inbound it means we SENT an answer. and have 'FINISHED' the transaction.
        this.emit('started', message.peerContent);
      };

      var session_failed = function(message) {
        this._startTransaction = null;
        this.state = 'stopped';
        console.error('Session Start Failed: ', message);
        this.emit('failed', message);
      };
      
      this._startTransaction = this.nodeconnector.createTransaction(
          { message: this.message,
            timeout: this.timeout
          },
          session_started.bind(this), 
          session_failed.bind(this));
      this._startTransaction.toTopic = this.toTopic || null;
      this._startTransaction.on('message', this.processMessage.bind(this));
      this._startTransaction.on('finished', function() {
        this._startTransaction = null;
      }.bind(this)
      );
     // this._startTransaction.listEvents();
      this._startTransaction.start();
      return this;
    },
    /*
     * Finish the 'Start'
     */
    respond : function(/* boolean */ SUCCESS, /* String */ message) {
      
      /* 
       * Generally, respond is called w/ a message, but could just be a boolean indicating success.
       * if just a message passed then default to true
       * 
       */
      if (SUCCESS && typeof SUCCESS !== 'boolean') {
        message = SUCCESS;
        SUCCESS = true;
      }
      
      // If it isn't set at all, make sure it is true;
      SUCCESS = SUCCESS || true;

      l('DEBUG') && console.log(this+'.respond() Respond called with message', message);
      l('DEBUG') && console.log(this+'.respond() Respond called using this', this);
      var messageToSend = null;
      if (this._startTransaction) {
        messageToSend = this.nodeconnector.createResponse('START_SESSION');
        messageToSend.transID = this._startTransaction.id;
        messageToSend.sigSessID = this.id;
        
        if (SUCCESS) { 
          messageToSend.result = 'SUCCESS';
          messageToSend.peerContent = (this.type === 'refer') ? {type: 'refer'} : message; 
        } else {
          messageToSend.result = 'FAILURE';
          messageToSend.reason = message || "Unknown";
        }
        // Finish the transaction
        this._startTransaction.finish(messageToSend);
        this.state = 'started';
        this.emit('started');
      } else {
        // No transaction to respond to.
        console.log('NO TRANSACTION TO RESPOND TO.');
      }
    },
    /**
     *  send a pranswer
     */
    pranswer : function(peerContent) {
      peerContent = peerContent || {'type':'pranswer'};
      this.state = 'pranswer';
      this.send(peerContent);
      this.emit('pranswer');
    },

    stop : function() {
      var message = this.createMessage('STOP_SESSION');
      l('DEBUG') && console.log(this+'.stop() stopping...', message);
      this.nodeconnector.send({message:message});
      // Let's concerned persons know we are stopped
      this.state = 'stopped';
      this.emit('stopped');
      // We are 'finished' - this is used to clean us up by who created us.
      this.emit('finished');
    },

    /** 
     * Send a message, but we may care about the type, we will infer it
     * based on the content.
     * 
     */
    send :  function(message) {
      var messageToSend = null;
      if (message && message.ibmRTC && message.method) {
        // we've already been cast... just send it raw...
        messageToSend = message;
      } else {
        messageToSend = this.createMessage(message);
       // messageToSend.peerContent = message;
      }
      var transaction = this._startTransaction || null;
      var queue = !(this.state === 'started' || this.state === 'have_pranswer' || this.state === 'pranswer');
      if (queue && messageToSend.method === 'MESSAGE') {
        // Queuing message
        l('DEBUG') && console.log(this+'.send() Queueing message: ', messageToSend);
        this._messageQueue.messages.push(messageToSend);
      } else {
        if (transaction){
          l('DEBUG') && console.log(this+'.send() Sending using transaction['+transaction.id+']', messageToSend);
          transaction.send(messageToSend);
        } else {
          l('DEBUG') && console.log(this+'.send() Sending... ['+this.state+']', messageToSend);
          // There isn't a transaciton, delete transID if it is there...
          if (messageToSend.hasOwnProperty('transID')) {
            delete messageToSend.transID;
          }
          this.nodeconnector.send({message:messageToSend}); 
        }
      }
    },
    
    createMessage : function(object) {
      // We create messages for a sigSession... 
      // generally, this is what we should send, peerContent.
      var peerContent = null;
      
      // object could be a RAW Message... 
      // Object could be a peerContent type of message {type:offer|answer/icecandidate/user sdp/candidate/userdata: }
      //   where could infer our message type.
      // object could be a type we are going to set content...
      if (object && object.type ) { 
        peerContent = object;
      }
     
      var type = 'MESSAGE';
      if (peerContent) {
        type = peerContent.type === 'pranswer' ? 'PRANSWER' : 'MESSAGE';
      } else {
        type = object;
      }
      
      var message = this.nodeconnector.createMessage(type);
      message.toEndpointID = this.toEndpointID;
      message.sigSessID = this.id;
      message.peerContent = peerContent ? object : null;
      return message;
      
    },
    getState : function(){
      return this.state;
    },

    processMessage : function(message) {
      // Process inbound messages. Should not accept these if we ar not in STARTED or HAVE_PRANSWER 
      // HAVE_PRANSWER could mean we sent or received the PRANSWER 
      // 
      l('DEBUG') && console.log(this + '.processMessage() received message: ', message);
      // We care about the type of message here, so we will need to strip some stuff, and may just fire other events.
      // If our fromTopic is dfferent than our toTopic, then update it.

      this.toTopic = (message.fromTopic !== this.toTopic) ? message.fromTopic : this.toTopic;

      switch(message.method) {
      case 'PRANSWER':
        // change our state, emit content if it is there.
        this.state = 'have_pranswer';
        this.emit('have_pranswer', message.peerContent);
        break;
      case 'ICE_CANDIDATE':
        this.emit('ice_candidate', message.peerContent);
        break;
      case 'STOP_SESSION':
        this.state='stopped';
        this.emit('stopped', message.peerContent);
        this.emit('finished');
        break;
      case 'MESSAGE':
       /* l('DEBUG') && console.log('Emitting event [message]', message.peerContent);
        if (typeof this.emit === 'function') {
          console.log('emit is a function!');
        } */
        this.emit('message', message.peerContent);
        break;
      default:
        console.error('Unexpected Message, dropping... ', message);
      }

    }
  };
})());

