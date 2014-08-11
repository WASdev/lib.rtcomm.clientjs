/** @class
 * @memberof module:rtcomm.webrtc
 * @private
 */
/* Constructor */

var MessageFactory = (function (){
  // base Template used for everything.
  var _baseHeaders = {
      'ibmRTC': 'v1.1',
       'method' : null,
       'fromTopic': null
  };
  
  var _optionalHeaders = {
      'sigSessID':null,
      'transID':null,
      'reason': null,
      'toEndpointID': null
  };
  
  // Override base headers and add new headers for the OUTBOUND message
  // If it is a transaction, it will have a transID
  
  var _messageTemplates = {
      'SERVICE_QUERY' : {
        'method': 'SERVICE_QUERY',
        'transID': null,
      },
      'REGISTER_QUERY' : {
        'method': 'REGISTER_QUERY',
        'queryEndpointID': null,
        'transID': null,
      },
      'START_SESSION' : {
        'method': 'START_SESSION',
        'sigSessID':null,
        'transID':null,
        'toEndpointID': null,
        'peerContent': null,
        'appContext': null
      },
     'STOP_SESSION' : {
        'method': 'STOP_SESSION',
        'sigSessID':null,
        'peerContent': null,
      },
      'PRANSWER': {
        'method': 'PRANSWER',
        'peerContent': null
      },
      // Message is generic and could be anything... 
      'MESSAGE':{
        'method':'MESSAGE',
        'peerContent': null
      },
      'ICE_CANDIDATE':{
        'method':'ICE_CANDIDATE',
        'fromTopic': null
      },
      'REGISTER': {
        'method': 'REGISTER',
        'regTopic':null,
        'appContext':null
      }
  };
  
  var _baseResponseTemplate = {
      'RESPONSE' : {
        'method': 'RESPONSE',
        'orig': null,
        'transID': null,
        'result': null,
      }
  };
  
  var _responseTemplates = {
      'SERVICE_QUERY' : {
        'orig': 'SERVICE_QUERY',
        'services':null
      },
      'REGISTER_QUERY' : {
        'orig':'REGISTER_QUERY',
        'endpointTopicName': null,
      },
      'START_SESSION' : {
        'orig': 'START_SESSION',
        'sigSessID': null,
        'result': null,
        'peerContent': null,
        'transID': null,
      },
      'REGISTER': {
        'orig': 'REGISTER',
        'expires': 120,
        'result': null,
        'transID': null,
      }
      
  };
  
  function getMessageTemplate(type) {
    var template = {};
    
    objMerge(template,_baseHeaders);
   
    if (_messageTemplates.hasOwnProperty(type)) {
      objMerge(template,_messageTemplates[type]);
      return template;
    } else {
      console.error('Message Type: '+type+' Not found!');
      return null;
    }
  }
  
  function getResponseTemplate(type) {
    var template = {};
    objMerge(template,_baseHeaders);
    objMerge(template, _baseResponseTemplate.RESPONSE);
    if (_responseTemplates.hasOwnProperty(type)) {
      objMerge(template,_responseTemplates[type]);
      return template;
    } else {
      console.error('Message Type: '+type+' Not found!');
      return null;
    }
  }
  
  function objMerge(obj1,obj2) {
    // Take Right Object and place on top of left object.  
    for (var key in obj2) {
      if (obj2.hasOwnProperty(key)) {
        obj1[key] = obj2[key];
      }
    }
  }
  
  var SigMessage = function SigMessage(template) {
    if (template) {
      for (var key in template) {
        if (template.hasOwnProperty(key)) {
          this[key] = template[key];
        }
      }
    }
  };

  SigMessage.prototype = {
      /** Convert message to a specific JSON object 
       * 
       * @returns {JSON} 
       * 
       */
      toJSON: function() {
        var obj = {};
        for (var key in this) {
          if (this.hasOwnProperty(key)) {
            obj[key] = this[key];
          }
        }
        return obj;
      }, 
      /* Override */
      toString: function() {
        // When converted to a string, we return a SPECIFIC object content that matches the Message Template 
        return JSON.stringify(this.toJSON());
      }
  };
  
  function createResponse(type) {
    var message = null;
    var template = getResponseTemplate(type);
    if (template) {
      message = new SigMessage(template);
    } else {
      throw new TypeError('Invalid Message type:'+type+', should be one of: '+ Object.keys(_messageTemplates));
    }
    return message;
  }
  
  function createMessage(type) {
    type = type || 'MESSAGE';
    var message = null;
    var template = getMessageTemplate(type);
    if (template) {
      message = new SigMessage(template);
    } else {
      throw new TypeError('Invalid Message type:'+type+', should be one of: '+ Object.keys(_messageTemplates));
    }
    return message;
  }
  
  function isValid(message) {
    try {
      var tmpmsg = cast(message);
    } catch(e) {
      // unable to cast, not a good message.
      return false;
    }
    return true;
  }
  
  function cast(obj) {
    l('TRACE') && console.log('MessageFactory.cast() Attempting to cast message: ', obj);
  
    if ( typeof obj === 'string') {
      l('TRACE') && console.log('MessageFactory.cast() It is a string... ', obj);
      /* if its a 'STRING' then convert to a object */
      obj = JSON.parse(obj);
      l('TRACE') && console.log('MessageFactory.cast() After JSON.parse... ', obj);
    }
    var template = null;
    if (obj.method) {
      template = (obj.method === 'RESPONSE') ? getResponseTemplate(obj.orig):getMessageTemplate(obj.method);
    } else {
      throw new TypeError('Unable to cast object as a SigMessage');
    }
    var castedMessage = new SigMessage(template);
    for (var prop in obj){
      // console.log("key:" + prop + " = " + obj[prop]);
      if (template.hasOwnProperty(prop) || _optionalHeaders.hasOwnProperty(prop)){
        //    console.log("key:" + prop + " = " + obj[prop]);
        castedMessage[prop] = obj[prop];
      } else {
        l('DEBUG') && console.log('MessageFactory.cast() dropped header: '+prop);
      }
    }  
    l('TRACE') && console.log('MessageFactory.cast() returning casted message:', castedMessage);
    return castedMessage;
  }

  return {
    createMessage:  createMessage,
    createResponse: createResponse,
    cast : cast
  };
})();


