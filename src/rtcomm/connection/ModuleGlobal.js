// rtcservice & util should be defined here:
/*global util:false*/
var logging = new util.Log(),
    setLogLevel = logging.s,
    getLogLevel = logging.g,
    l = logging.l,
    generateUUID = util.generateUUID,    
    validateConfig = util.validateConfig,
    applyConfig = util.applyConfig,
    setConfig = util.setConfig,
    /*global log: false */
    log = function log() {
          // I want to log CallingObject[id].method Message [possibly an object]

          var object = {},
              method = '<none>',
              message = null,
              remainder = null,
              logMessage = "";

          var args = [].slice.call(arguments);

          if (args.length === 0 ) {
            return;
          } else if (args.length === 1 ) {
            // Just a Message, log it...
            message = args[0];
          } else if (args.length === 2) {
            object = args[0];
            message = args[1];
          } else if (args.length === 3 ) {
            object = args[0];
            method = args[1];
            message = args[2];
          } else {
            object = args.shift();
            method = args.shift();
            message = args.shift();
            remainder = args;
          }

          if (object) {
            logMessage = object.toString() + "." + method + ' ' + message;
          } else {
            logMessage = "<none>" + "." + method + ' ' + message;
          }
          // Ignore Colors...
          if (object && object.color) {object.color = null;}
          
          var css = "";
          if (object && object.color) {
            logMessage = '%c ' + logMessage;
            css = 'color: ' + object.color;
            if (remainder) {
              console.log(logMessage, css, remainder);
            } else {
              console.log(logMessage,css);
            }
          } else {
            if (remainder) {
              console.log(logMessage, remainder);
            } else {
              console.log(logMessage);
            }
          }
        }; // end of log/ 
        
    
        
    
