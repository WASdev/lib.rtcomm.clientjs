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
   * @class
   * @memberof module:rtcomm.connector
   *
   * @classdesc
   * A Transaction is a conversation that requires a response.
   * /**
   * @param options   message: message, timeout: timeout
   * @param {callback} cbSuccess called when transaction is successful 
   * @param {callback} cbFailure 
   * 
   * @event finished Emitted when complete... can also use onSuccess.
   * @event message 
   * 
   * 
   * @private
   */
var Transaction = function Transaction(options, cbSuccess, cbFailure) {
  var message, timeout, toTopic;

  this.defaultTimeout = 5000;
  if (options) {
    message = options.message || null;
    timeout = options.timeout || null;
    toTopic = options.toTopic || null;
  }
  /* Instance Properties */
  this.objName = "Transaction";
  this.events = {'message': [],
      'timeout_changed':[],
      'finished':[]};
  this.timeout = timeout || this.defaultTimeout;
  this.outbound = (message && message.transID) ? false : true;
  /*global generateUUID:false*/
  this.id = (message && message.transID) ? message.transID : generateUUID(); 
  this.method = (message && message.method) ? message.method : 'UNKNOWN'; 

  this.toTopic = toTopic || ((message && message.fromTopic) ? message.fromTopic : null);
  this.message = message;
  this.onSuccess = cbSuccess || function(object) {
    l('DEBUG') && console.log(this+' Response for Transaction received, requires callback for more information:', object);
  };
  this.onFailure = cbFailure || function(object) {
    l('DEBUG') && console.log(this+' Transaction failed, requires callback for more information:', object);
  };

  l('DEBUG') && console.log(this+ '.constructor Are we outbound?', this.outbound);
};
/*global util:false*/
Transaction.prototype = util.RtcommBaseObject.extend(
   /** @lends module:rtcomm.connector.Transaction.prototype */
    {
  /*
   *  A Transaction is something that may require a response, but CAN receive messages w/ the same transaction ID 
   *  until the RESPONSE is received closing the transaction. 
   *  
   *  The types of transactions correlate with the types of Messages with the Session being the most complicated.
   *  
   *  Transaction management... 
   *  
   *  TODO:  Inbound Starts... 
   *  
   *  
   */
  /*
   * Instance Methods
   */
  setTimeout: function(timeout)  {
    this.timeout = timeout || this.defaultTimeout;
    this.emit('timeout_changed', this.timeout);
  },
 
  getInbound: function() {
    return !(this.outbound);
  },
  /**
   * Start a transaction
   * @param [timeout] can set a timeout for the transaction
   */
  start: function(timeout) {
    /*global l:false*/
    l('TRACE') && console.log(this+'.start() Starting Transaction for ID: '+this.id);
    if (this.outbound) {
      this.message.transID = this.id;
      this.send(this.message);  
    } else {
      l('TRACE') && console.log(this+'.start() Inbound Transaction ');
    }
  },
  /**
   * send a message over the transaction
   */
  send: function(message) {
    l('TRACE') && console.log(this+'.send() sending message: '+message);
    if(message) {
      message.transID = message.transID || this.id;
      l('DEBUG') && console.log('Transaction.send() ids...'+message.transID +' this.id '+ this.id+'toTopic: '+this.toTopic);
      if (message.transID === this.id) {
        this.endpointconnector.send({message: message, toTopic:this.toTopic});
      } else {
        l('DEBUG') && console.log(this+'.send() Message is not part of our tranaction, dropping!', message);
      }
    } else {
      console.error('Transaction.send() requires a message to be passed');
    }
  },
  /**
   * Finish the transaction, message should be a RESPONSE.
   */
  finish: function(rtcommMessage) {
    // Is this message for THIS transaction?
    l('DEBUG') && console.log(this+'.finish() Finishing transction with message:',rtcommMessage);
    // if there isn't an id here, add it. 
    rtcommMessage.transID = rtcommMessage.transID || this.id;
    if (this.id === rtcommMessage.transID &&
        rtcommMessage.method === 'RESPONSE' && 
        this.method === rtcommMessage.orig) {
      if (this.outbound) {
        if (rtcommMessage.result  === 'SUCCESS' && this.onSuccess ) {
          this.onSuccess(rtcommMessage);
        } else if (rtcommMessage.result === 'FAILURE' && this.onFailure) {
          this.onFailure(rtcommMessage);
        } else {
          console.error('Unknown result for RESPONSE:', rtcommMessage);
        }
      } else {
     // If we are inbound, then send the message we have and finish the transaction
        this.send(rtcommMessage);
      }
      this.emit('finished');
    } else {
      console.error('Message not for this transaction: ', rtcommMessage);
    }
  }
});
