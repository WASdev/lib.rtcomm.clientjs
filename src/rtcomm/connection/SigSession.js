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

/** 
 * A SigSession is an end to end signaling session w/ another Peer.
 * 
 * <p>
 * It is part of a WebRTCConnection and should ONLY be used via a WebRTCConnection.  It 
 * should only be created by 'EndpointConnection.createSession()'
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
  this.endpointconnector = null;
  this.id = null;
  this.remoteEndpointID = null;
  this.message = null;
  this.source = null;
  this.toTopic = null;
  this.type = 'normal'; // or refer
  this.referralDetails= null;
  this.referralTransaction = null;
  this.appContext = null;

  if (config) {
    if (config.message) {
      this.appContext = config.message.appContext || null;
      this.source = config.source || null;
      if (config.message.method === 'START_SESSION') {
        l('DEBUG') && 
          console.log(this+'.constructor - inbound message(START_SESSION) config: ', config);
        // We are INBOUND. 
        this.message = config.message;
        this.id = config.message.sigSessID;
        this.remoteEndpointID = config.fromEndpointID || null;
        this.toTopic = config.toTopic || config.message.fromTopic || null;
      } else if (config.message.method === 'REFER') {
        l('DEBUG') && 
          console.log(this+'.constructor - inbound message(REFER) config: ', config);
        // If there is a sessionID, use it...
        this.id = config.message.details.sessionID && config.message.details.sessionID;
        this.remoteEndpointID = config.message.details.toEndpointID || null;
        this.referralTransaction = config.referralTransaction;
      } else {
        l('DEBUG') && 
          console.log(this+'.constructor - inbound message(unknown) doing nothing -->  config: ', config);
      }
    } else {
      l('DEBUG') && console.log(this+'.constructor creating session from config: ', config);
      this.remoteEndpointID = config.remoteEndpointID || null;
      this.id = this.id || config.id;
      this.toTopic = this.toTopic || config.toTopic;
      this.appContext = this.appContext|| config.appContext;
    }
  }

  /* global generateUUID: false */
  this.id = this.id || generateUUID();
  l('DEBUG') && console.log(this+'.constructor creating session from config: ', config);

  this.events = {
      'starting':[],
      'started':[],
      'failed':[],
      'stopped':[],
      'message':[],
      'queued':[],
      'ice_candidate':[],
      'have_pranswer':[],
      'pranswer':[],
      'finished':[]
  };
  // Initial State
  this.state = 'stopped';

  /** The timeout we will wait for a PRANSWER indicating someone is at other end */
  this.initialTimeout = 5000; 
  /** The timeout we will wait for a ANSWER (responding to session START)*/
  this.finalTimeout = 30000; 
};

/* global util: false */
SigSession.prototype = util.RtcommBaseObject.extend((function() {
  /** @lends module:rtcomm.connector.SigSession.prototype */
  return { 
    /** 
     * Init method
     * @param config  -- message:message, localEndpointID: endpointid, toTopic: toTopic
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
          l('DEBUG') && console.log(this+'._processQueue processing queue... ', q);
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
     *  config = {remoteEndpointID: something, message:  }
     */
    start : function(config) {

      if (this._startTransaction) {
        // already Started
        //
        l('DEBUG') && console.log('SigSession.start() already started/starting');
        return;
      }
      this._setupQueue();
      /*global l:false*/
      l('DEBUG') && console.log('SigSession.start() using config: ', config);
      var remoteEndpointID = this.remoteEndpointID;
      var message = null;
      if (config) {
        this.remoteEndpointID = remoteEndpointID = config.remoteEndpointID || remoteEndpointID;
        message = config.message|| null;
      }
      this.state = 'starting';
      if (!remoteEndpointID) {
        throw new Error('remoteEndpointID is required in start() or SigSession() instantiation');
      }  

      /*
       * If we are new, (no message...) then we should create START and 
       *  a Transaction and send it....
       *  and establish an on('message');
       *    
       */
      if (!this.message) {
        this.message = this.createMessage('START_SESSION');
        this.message.peerContent = message || null;
        if (this.appContext) {
          this.message.appContext = this.appContext;
        }
      }
      var session_started = function(message) {
        // our session was successfully started, if Outbound session, it means we 
        // recieved a Response, if it has an Answer, we need to pass it up.
        l('DEBUG') && console.log(this+'.sessionStarted!  ', message);
        this.state = 'started';

        if (message.fromEndpointID !== this.remoteEndpointID) {
          l('DEBUG') && console.log(this+'.sessionStarted! updating remoteEndpointID to: '+ message.fromEndpointID);
          this.remoteEndpointID = message.fromEndpointID;
        }

        this._startTransaction = null;
        this.referralTransaction && 
          this.referralTransaction.finish(this.endpointconnector.createResponse('REFER'));
        this.emit('started', message.peerContent);
      };

      var session_failed = function(message) {
        this._startTransaction = null;
        var reason = (message && message.reason) ? message.reason : 'Session Start failed for unknown reason';
        this.state = 'stopped';
        console.error('Session Start Failed: ', reason);
        this.emit('failed', reason);
      };
      this._startTransaction = this.endpointconnector.createTransaction(
          { message: this.message,
            timeout: this.initialTimeout
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
      // If SUCCESS is undefined, set it to true
      SUCCESS = (typeof SUCCESS !== 'undefined')? SUCCESS: true;

      l('DEBUG') && console.log(this+'.respond() Respond called with SUCCESS', SUCCESS);
      l('DEBUG') && console.log(this+'.respond() Respond called with message', message);
      l('DEBUG') && console.log(this+'.respond() Respond called using this', this);
      var messageToSend = null;
      if (this._startTransaction) {
        messageToSend = this.endpointconnector.createResponse('START_SESSION');
        messageToSend.transID = this._startTransaction.id;
        messageToSend.sigSessID = this.id;
        var referralResponse = this.endpointconnector.createResponse('REFER');

        if (SUCCESS) { 
          messageToSend.result = 'SUCCESS';
          messageToSend.peerContent = message;
          // If there is a referral transaction, finish it...
          this.state = 'started';
        } else {
          messageToSend.result = 'FAILURE';
          messageToSend.reason = message || "Unknown";
          referralResponse.result = 'FAILURE';
          referralResponse.reason = message || "Unknown";
          this.state = 'failed';
        }
        // Finish the transaction
        this.referralTransaction && 
          this.referralTransaction.finish(referralResponse);
        this._startTransaction.finish(messageToSend);
        this.emit(this.state);
      } else {
        // No transaction to respond to.
        console.log('NO TRANSACTION TO RESPOND TO.');
      }
    },
    /**
     * Fail the session, this is only a RESPONSE to a START_SESSION
     */
    fail: function(message) {
      this.start();
      this.respond(false,message);
    },

    /**
     *  send a pranswer
     *  
     *  peerContent -- Message to send
     *  timeout -- in SECONDS -- timeout to wait.
     */
    pranswer : function(peerContent, timeout) {
      if (typeof peerContent !== 'number') { 
        peerContent = peerContent || {'type':'pranswer'};
      } else {
        timeout = peerContent;
        peerContent = {'type':'pranswer'};
      }
      var pranswerMessage = this.createMessage(peerContent);
      if (timeout) { 
        pranswerMessage.holdTimeout=timeout;
      }
      this.state = 'pranswer';
      this.send(pranswerMessage,timeout*1000 || this.finalTimeout);
      this.emit('pranswer');
    },

    stop : function() {
      var message = this.createMessage('STOP_SESSION');
      l('DEBUG') && console.log(this+'.stop() stopping...', message);
      this.endpointconnector.send({message:message, toTopic: this.toTopic});
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
    send :  function(message, timeout) {
      var messageToSend = null;
      if (message && message.rtcommVer && message.method) {
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
          // If we have a timeout update the transaction;
          timeout && transaction.setTimeout(timeout);
          transaction.send(messageToSend);
        } else {
          l('DEBUG') && console.log(this+'.send() Sending... ['+this.state+']', messageToSend);
          // There isn't a transaciton, delete transID if it is there...
          if (messageToSend.hasOwnProperty('transID')) {
            delete messageToSend.transID;
          }
          this.endpointconnector.send({message:messageToSend, toTopic: this.toTopic}); 
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
      var message = this.endpointconnector.createMessage(type);
      message.toEndpointID = this.remoteEndpointID;
      message.sigSessID = this.id;
      message.peerContent = peerContent ? object : null;
      return message;
    },
    getState : function(){
      return this.state;
    },
    processMessage : function(message) {

      l('DEBUG') && console.log(this + '.processMessage() received message: ', message);
      // We care about the type of message here, so we will need to strip some stuff, and may just fire other events.
      // If our fromTopic is dfferent than our toTopic, then update it.

      this.toTopic = (message.fromTopic !== this.toTopic) ? message.fromTopic : this.toTopic;

      switch(message.method) {
      case 'PRANSWER':
        // change our state, emit content if it is there.
        // holdTimeout is in seconds, rather than milliseconds.
        l('TRACE') && console.log('PRANSWER --> '+ message.holdTimeout+"="+ (typeof message.holdTimeout === 'undefined') + " - "+this.finalTimeout);

        var timeout = (typeof message.holdTimeout === 'undefined') ? this.finalTimeout : message.holdTimeout*1000;
        l('TRACE') && console.log('PRANSWER, resetting timeout to :',timeout);
        this._startTransaction && this._startTransaction.setTimeout(timeout);

        if (message.holdTimeout || message.queuePosition) {
          // We've been Queued...
          this.state = 'queued';
          this.emit('queued', {'queuePosition': message.queuePosition, 'message': message.peerContent});
        } else {
          this.state = 'have_pranswer';
          this.emit('have_pranswer', message.peerContent);
        } 
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
        l('DEBUG') && console.log('Emitting event [message]', message.peerContent);
        this.emit('message', message.peerContent);
        break;
      default:
        console.error('Unexpected Message, dropping... ', message);
      }

    }
  };
})());

