/*
 * This is a Paho Client and Mock Rtcomm Server for testing purposes only.  It ONLY handles registration and
 * forwarding messages to another user.  It does not fail gracefully yet.  
 *
 */

var Paho = (function(){
  console.log('************** Loading Mock Paho Client *****************');
  var l = function(level) {
    return true;
  };
  /*global mockMqtt:false*/
  var mockMqtt = (function () {
  // This is a fake to make sure everythign is logged

  /* build a regular expression to match the topic */
  var buildTopicRegex= function(topic) {
    // If it starts w/ a $ its a Shared subscription.  Essentially:
    // $SharedSubscription/something//<publishTopic>
    // We need to Remove the $-> //
    // /^\$.+\/\//, ''
    var regex = topic.replace(/^\$SharedSubscription.+\/\//, '\\/')
                .replace(/\/\+/g,'\\/.+')
                .replace(/\/#$/g,'($|\\/.+$)')
                .replace(/(\\)?\//g, function($0, $1){
                  return $1 ? $0 : '\\/';
                });

    // The ^ at the beginning in the return ensures that it STARTS w/ the topic passed.
    return new RegExp('^'+regex+'$');
  };

  var mqtt_clients = {};
  var topics = {};

  var findTopic = function(topic) {
    for (var t in topics) {
      //console.log('findTopic looking for '+topic+' against :'+t);
      if (buildTopicRegex(t).test(topic)){
       // console.log('returning : ',t);
        return t;
      }
    }
  };
  return {
    add : function(client) {
      mqtt_clients[client._.clientid] = client;
      return mqtt_clients[client._.clientid];
    },
    subscribe : function(topic, mqttClient) {
    // only one client is subscribed to a topic in this case... which is wrong... 
      topics[topic] = mqttClient;
    },
    send : function(message) {
      var topic = message.destinationName;
      console.log('mockMqtt.send() topic: '+topic +' message: '+ message);
      var matchedTopic = findTopic(topic);
      if (matchedTopic) {
        //console.log('mockMqtt.send() emitting on ', topics[matchedTopic]);
       // console.log('mockMqtt.send() message is', message);
        topics[matchedTopic].emit('message', message);
      }
    },
    _getClients : function() {
      return mqtt_clients;
    },
    _getSubscriptions : function () {
      return topics;
    }
  };

})(); 


  var MockMqttClient = function MockMqttClient(server, port, clientid) {

    this._ = {
      server: server,
      port: port,
      clientid: clientid };
    console.log('***************** Using a Mock MQTT Client *****************', this._);

    this.events = {
      'message': []
    };

    this.onMessageArrived = function(message) {
      console.log('Not Defined', message);
    };

    function connect(options){
      l('DEBUG') && console.log('MockMqttClient.connect()', options);
      // Add to the server.
      mockMqtt.add(this); 
      var self = this;
      var onSuccess = (options && options.onSuccess) ? options.onSuccess : function(){ console.log('MockMqttClient.connect onSuccess not defined');};
      var onFailure = (options && options.onFailure) ? options.onFailure: function(){ console.log('MockMqttClient.connect onFailure not defined');};
      self.on('message', self.onMessageArrived);
      onSuccess();
    };

    function send(message) {
      l('DEBUG') && console.log('MockMqttClient.send()', message);
      mockMqtt.send(message);
    };

    function subscribe(topic) {
      l('DEBUG') && console.log('MockMqttClient.subscribe()', topic);
      var self = this;
      mockMqtt.subscribe(topic, self);
    };

    function unsubscribe(topic) {
      l('DEBUG') && console.log('MockMqttClient.unsubscribe()', topic);
    };

    function disconnect(topic) {
      l('DEBUG') && console.log('MockMqttClient.disconnect()', topic);
    };

    this.connect= connect;
    this.subscribe= subscribe;
    this.unsubscribe= unsubscribe;
    this.send= send;
    this.disconnect= disconnect;
  };

  /*global util:false */
  MockMqttClient.prototype  = rtcomm.util.RtcommBaseObject.extend({});

  var MockMqttMessage = function MockMqttMessage(message) {
     return  {destinationName: null, payloadString: message};
  };

var MockRtcommServer = (function MockRtcommServer() {

    var rtcommTopicPath = "/rtcomm/";
    var topics = {
    // Just the SERVICE_QUERY topic
    management: "",
    // The presence Topic
    sphere: "",
    // The main topic (connector)
    connector: ""
    //
    };
    var registry = {};
    var conn = null;

    function setTopics(rootTopic) {
      for (var key in topics) {
        topics[key] = rootTopic + key + "/#";
      }
    }
  return { 

    /**
     * config.rtcommTopicPath is only option
     */

    init : function init(config) {
      console.log('********** Using a Mock Rtcomm Server ****************');
      rtcommTopicPath = (config && config.rtcommTopicPath) ? config.rtcommTopicPath : rtcommTopicPath;
      setTopics(rtcommTopicPath);
      conn = new rtcomm.connection.MqttConnection({server:'localhost', port: 1883,  'rtcommTopicPath': rtcommTopicPath});
      conn.setLogLevel('DEBUG');
      conn.connect();
      conn.subscribe(topics.management);
      conn.subscribe(topics.sphere);
      conn.subscribe(topics.connector);
      conn.on('message', function(message) {
        console.log('MockRtcommServer --> Received a message!', message);
        if (message) {
          if (message.content === '') {
            // If it is an empty message, its a unregister LWT, remove the entry.
            if (message.fromEndpoint) {
              delete registry[message.fromEndpointID]; 
            }
          } else {
            var rtcommMessage = (typeof message.content === 'string')? JSON.parse(message.content): message.content;
            switch(rtcommMessage.method) {
              case 'DOCUMENT': 
                console.log('DOCUMENT received');
                registry[message.fromEndpointID] = rtcommMessage.addressTopic;
                break;
              case 'SERVICE_QUERY':
                console.log('SERVICE QUERY!');
                // We should actually respond to this w/ mock data.
                break;
              default:
                console.log('DEFAULT: ', rtcommMessage);
                if(rtcommMessage.toEndpointID in registry) {
                 conn.publish(registry[rtcommMessage.toEndpointID] +'/'+message.fromEndpointID, rtcommMessage);
                } else {
                  console.error('toEndpointID not found, should send a Failure response');
                }
                break;
             }
          }
        }
      });
    },
    getRegistry: function() {
      return registry;
    }
  };
})();

  return {
    MQTT: {
      Client: MockMqttClient,
      Message: MockMqttMessage
    },
    MockRtcommServer: MockRtcommServer
  };
})();


