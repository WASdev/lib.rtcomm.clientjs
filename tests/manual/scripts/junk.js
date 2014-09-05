/*
* IBM Confidential
*
* OCO Source Materials
*
* WLP Copyright IBM Corp. 2014
*
* The source code for this program is not published or otherwise divested 
* of its trade secrets, irrespective of what has been deposited with the 
* U.S. Copyright Office.
*/

var Junk = (function invocation() {
  
  console.log("RTCIceCandidate", RTCIceCandidate);
  console.log("Setting RTCSessionDescription", RTCSessionDescription);
  
  
  
  var RTCPeerConnection_ibm = (function() { 
    if (navigator.mozGetUserMedia) {
      return mozRTCPeerConnection;
    } else if (navigator.webkitGetUserMedia) {
      return webkitRTCPeerConnection;
    } else {
      throw new Error("Unsupported Browser");
    }
  })();
  
  var RTCSessionDescription_ibm = (function() { 
    if (navigator.mozGetUserMedia) {
      return mozRTCSessionDescription;
    }
    console.log("Setting RTCSessionDescription", RTCSessionDescription);
    return RTCSessionDescription;
  })();
 
  console.log("Setting RTCSessionDescription", RTCSessionDescription_ibm);
  
  console.log("RTCIceCandidate", RTCIceCandidate);
  // WHY IS THIS FAILING?
  var RTCIceCandidate_ibm = (function() { 
    console.log("RTCIceCandidate", RTCIceCandidate);
   
    if (navigator.mozGetUserMedia) {
      return mozRTCIceCandidate;
    } else {
      return RTCIceCandidate;
    } 
  })();
  
  var getBrowser = function() {
    if (navigator.mozGetUserMedia) {
      // firefox
      return("firefox", parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10));
    } else if (navigator.webkitGetUserMedia) {
     return("chrome", parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10));
    } else {
      return("Unknown","Unknown");
    } 
  };
 
})();