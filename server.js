/*eslint-env node*/

//------------------------------------------------------------------------------
// Mosca app for node.js
//------------------------------------------------------------------------------
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
var mosca = require('mosca');
var bunyan = require('bunyan');

var log = bunyan.createLogger({name: 'MqttServer', level: 'info'});
var port = cfenv.getAppEnv().port;
var host = cfenv.getAppEnv().bind; 

// We are using Memory for peristence
var settings = {
  persistence: {
    factory: mosca.persistence.Memory
  },
  host: host,
  logger:  {level: 'info'},
  http: {
    port: port,
    bundle: true,
    static: './'
  },
};

var server = new mosca.Server(settings, function(error) {
  log.debug("Started on " + cfenv.getAppEnv().url + " message: " +error);
});

server.on('clientConnected', function(client) {
    log.debug('client connected', client.id);
});

// fired when a message is received
server.on('published', function(packet, client) {
  //console.log('Published', packet);
  log.debug('Published', packet.payload.toString());
});

// fired when a message is received
server.on('subscribed', function(topic, client) {
  log.debug('Subscribed: ' + topic + ' client:'+client);
});

server.on('ready', setup);

// fired when the mqtt server is ready
function setup() {
  log.info('Mosca server is up and running');
}


