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
define(['intern/node_modules/dojo/text!./testConfig.json'], function(testconfig) {
  var configdata = JSON.parse(testconfig);
  console.log('testconfig', configdata );
  var mqArray = /(\S+)\:(\d+)/.exec(configdata.mqttServers[0]);
  var 
    mqttServer= mqArray[1],
    mqttPort = parseInt(mqArray[2]),
    managementTopicName= configdata.managementTopicName,
    rtcommTopicPath= configdata.rtcommTopicPath;
  
  var generateRandomBytes = function(pattern) {
    var d = new Date().getTime();
    var bytes = pattern.replace(/[xy]/g, function(c) {
        // Take the date + a random number times 16 (so it will be between 0 & 16), get modulus
        // we then get the remainder of dividing by 16 (modulus) and the | 0 converts to an integer.
        // r will be between 0 & 16 (0000 & 1111)
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        // if it is x, just return the random number (0 to 16)
        // if it is not x, then return a value between 8 & 16 (mainly to ctonrol values in a UUID);
        return (c==='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return bytes;
  };

  function randomID() {
    var id = generateRandomBytes("xxxxxxxxxxxxx");
    return id+"@us.ibm.com";
  };
  return {
    // Not used yet...
    IBMRTC_TEST_TYPE: "normal",
    managementTopicName: managementTopicName,
    mqttServer : mqttServer,
    mqttPort : mqttPort,
    rtcommTopicPath: rtcommTopicPath,
    
    _ServerConfig : function(userid, Topic) {
     
      return {
        server: mqttServer,
        port: mqttPort,
        userid: userid || null,
        managementTopicName: Topic || managementTopicName,
        rtcommTopicPath:rtcommTopicPath 
      };
    },
    clientConfig: function() {
         return new this._ServerConfig(
           randomID()
           );
    },
    
    clientConfig1 : function() {
         return new this._ServerConfig(
           randomID()
           );
    },
    
    clientConfig2 : function() {
         return new this._ServerConfig(
            randomID()
           );
    }

    



  };

});

