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
define(['dojo/json', 'dojo/text!./testConfig.json'], function(JSON, testconfig) {

  var configdata = JSON.parse(testconfig);
  console.log('testconfig', configdata );
  
  var mqArray = /(\S+)\:(\d+)/.exec(configdata.mqttServers[0]);
  var 
    mqttServer= mqArray[1],
    mqttPort = parseInt(mqArray[2]),
    connectorTopicName = configdata.connectorTopicName,
    connectorTopicPath = configdata.connectorTopicPath;
  
  function randomID() {
    var num = Math.floor(Math.random()*10000);
    return "rtc"+num+"@us.ibm.com";
  };
  

  return {
    // Not used yet...
    IBMRTC_TEST_TYPE: "normal",
    
    connectorTopicName: connectorTopicName,
    mqttServer : mqttServer,
    mqttPort : mqttPort,
    connectorTopicPath: connectorTopicPath,
    
    _ServerConfig : function(userid, Topic) {
     
      return {
        server: mqttServer,
        port: mqttPort,
        userid: userid || null,
        connectorTopicName: Topic || connectorTopicName,
        connectorTopicPath: connectorTopicPath
      };
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

