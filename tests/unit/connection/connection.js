/**
 * Copyright 2013 IBM Corp.
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
define([
    'intern!object',
    'intern/chai!assert',
    'intern/node_modules/dojo/Deferred',
    /* Use the Mock (in browser mqtt) */
    (typeof window === 'undefined' && global)
      ?'intern/dojo/node!../../support/mqttws31_shim':
        'lib/mqttws31',
    'support/config',
    'umd/rtcomm/connection'
], function (registerSuite, assert, Deferred, globals, config, connection) {
  console.log('Paho!', Paho);
  var optionalHeaders = {
      'sigSessID':null,
      'transID':null,
      'failureResponse': null,
      'toEndpointID': null,
      'appContext': null
  }
  
  var sampleMessage = {
      'START_SESSION':
      {"rtcommVer":"v0.4.0","method":"START_SESSION","protocols":['webrtc', 'chat'], "fromTopic":"/rtcomm/22222222222222222222430","transID":"393415e2-34f3-4748-ed07-1ba121a704bf","appContext":"xxx","sigSessID":"SESS-108b9","toEndpointID":"bpulito",
        "payload":{"type":"webrtc", "content":{"sdp":"v=0\r\no=- 8852116315035575203 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS bzeFOU2AeViWo3wREkelcut1KHi8mQq47tKX\r\nm=audio 1 RTP/SAVPF 111 103 104 0 8 106 105 13 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:1 IN IP4 0.0.0.0\r\na=ice-ufrag:FNHLnDU2MhgqLyTK\r\na=ice-pwd:IzeD4mKMUAxdwMCQT0O65zIG\r\na=ice-options:google-ice\r\na=fingerprint:sha-256 44:C3:8D:31:AE:3A:6A:CC:ED:21:EF:32:C8:5E:B8:90:8E:26:66:19:D6:18:25:2B:21:FE:D2:3F:C1:62:E5:D9\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:126 telephone-event/8000\r\na=maxptime:60\r\na=ssrc:1360844460 cname:vV6xKzvKBQ8hqeAn\r\na=ssrc:1360844460 msid:bzeFOU2AeViWo3wREkelcut1KHi8mQq47tKX cf069584-b654-4e3a-a8ee-2f526ebce058\r\na=ssrc:1360844460 mslabel:bzeFOU2AeViWo3wREkelcut1KHi8mQq47tKX\r\na=ssrc:1360844460 label:cf069584-b654-4e3a-a8ee-2f526ebce058\r\nm=video 1 RTP/SAVPF 100 116 117\r\nc=IN IP4 0.0.0.0\r\na=rtcp:1 IN IP4 0.0.0.0\r\na=ice-ufrag:FNHLnDU2MhgqLyTK\r\na=ice-pwd:IzeD4mKMUAxdwMCQT0O65zIG\r\na=ice-options:google-ice\r\na=fingerprint:sha-256 44:C3:8D:31:AE:3A:6A:CC:ED:21:EF:32:C8:5E:B8:90:8E:26:66:19:D6:18:25:2B:21:FE:D2:3F:C1:62:E5:D9\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:100 VP8/90000\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=rtcp-fb:100 goog-remb\r\na=rtpmap:116 red/90000\r\na=rtpmap:117 ulpfec/90000\r\na=ssrc:3194928559 cname:vV6xKzvKBQ8hqeAn\r\na=ssrc:3194928559 msid:bzeFOU2AeViWo3wREkelcut1KHi8mQq47tKX 818f9bcd-8af4-4720-9ad6-4b84958e0dc8\r\na=ssrc:3194928559 mslabel:bzeFOU2AeViWo3wREkelcut1KHi8mQq47tKX\r\na=ssrc:3194928559 label:818f9bcd-8af4-4720-9ad6-4b84958e0dc8\r\n","type":"offer"}}},
        'PRANSWER' :
        {"rtcommVer":"v0.4.0","method":"PRANSWER","protocols":['webrtc','chat'], "fromTopic":'xxx',"transID":"6c528abf-b01d-4528-b8e0-b13b93a46ff6","sigSessID":"d9df3683-fd26-4cc4-8bab-bb94873cda15","payload":{"type":"webrtc", "content":"{type:pranswer, sdp:''}"}},
        'MESSAGE':
        {"rtcommVer":"v0.4.0","method":"ICE_CANDIDATE","fromTopic":"/rtcomm/22222222222222222222430","transID":"6c528abf-b01d-4528-b8e0-b13b93a46ff6","sigSessID":"SESS-108b9",
          "peerContent":{"type":"icecandidate","candidate":{"sdpMLineIndex":0,"sdpMid":"audio","candidate":"a=candidate:3013953624 1 udp 2122260223 192.168.1.100 56617 typ host generation 0\r\n"}}},
          'STOP_SESSION':
          {"rtcommVer":"v0.4.0","method":"STOP_SESSION","fromTopic":"/rtcomm/22222222222222222222430","transID":"393415e2-34f3-4748-ed07-1ba121a704bf","sigSessID":"SESS-108b9", "peerContent":"reason"},
          'SERVICE_QUERY':
          {"rtcommVer":"v 1.0","method":"SERVICE_QUERY","fromTopic":"xxx","transID":"6c528abf-b01d-4528-b8e0-b13b93a46ff6"}
  };

  var responseMessage = {
      'START_SESSION':
      {"rtcommVer":"v0.1.0","method":"RESPONSE","orig":"START_SESSION","fromTopic":'xxx',"transID":"6c528abf-b01d-4528-b8e0-b13b93a46ff6","result":"SUCCESS","sigSessID":"d9df3683-fd26-4cc4-8bab-bb94873cda15", "peerContent":{"sdp":"v=0\r\no=- 3518173539422956791 3 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS LHSE8yQLf2XKK7IMg9AcYsnyAQaeEIaZve7z\r\nm=audio 56623 RTP/SAVPF 111 103 104 0 8 106 105 13 126\r\nc=IN IP4 192.168.1.100\r\na=rtcp:1 IN IP4 0.0.0.0\r\na=candidate:3013953624 1 udp 2122260223 192.168.1.100 56623 typ host generation 0\r\na=candidate:1457988505 1 udp 2122194687 9.65.176.106 56624 typ host generation 0\r\na=candidate:4247172264 1 tcp 1518280447 192.168.1.100 0 typ host generation 0\r\na=candidate:409263977 1 tcp 1518214911 9.65.176.106 0 typ host generation 0\r\na=ice-ufrag:fvD63qLiYFsKR7yB\r\na=ice-pwd:XaPPY8pW+807a3b8hCLRpz/f\r\na=fingerprint:sha-256 44:C3:8D:31:AE:3A:6A:CC:ED:21:EF:32:C8:5E:B8:90:8E:26:66:19:D6:18:25:2B:21:FE:D2:3F:C1:62:E5:D9\r\na=setup:active\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:126 telephone-event/8000\r\na=maxptime:60\r\na=ssrc:2119564335 cname:55jRs5nrq4YtG2pe\r\na=ssrc:2119564335 msid:LHSE8yQLf2XKK7IMg9AcYsnyAQaeEIaZve7z 05561975-4c5a-4614-a8c3-60e911f4c4bb\r\na=ssrc:2119564335 mslabel:LHSE8yQLf2XKK7IMg9AcYsnyAQaeEIaZve7z\r\na=ssrc:2119564335 label:05561975-4c5a-4614-a8c3-60e911f4c4bb\r\nm=video 56623 RTP/SAVPF 100 116 117\r\nc=IN IP4 192.168.1.100\r\na=rtcp:1 IN IP4 0.0.0.0\r\na=candidate:3013953624 1 udp 2122260223 192.168.1.100 56623 typ host generation 0\r\na=candidate:1457988505 1 udp 2122194687 9.65.176.106 56624 typ host generation 0\r\na=candidate:4247172264 1 tcp 1518280447 192.168.1.100 0 typ host generation 0\r\na=candidate:409263977 1 tcp 1518214911 9.65.176.106 0 typ host generation 0\r\na=ice-ufrag:fvD63qLiYFsKR7yB\r\na=ice-pwd:XaPPY8pW+807a3b8hCLRpz/f\r\na=fingerprint:sha-256 44:C3:8D:31:AE:3A:6A:CC:ED:21:EF:32:C8:5E:B8:90:8E:26:66:19:D6:18:25:2B:21:FE:D2:3F:C1:62:E5:D9\r\na=setup:active\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:100 VP8/90000\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=rtcp-fb:100 goog-remb\r\na=rtpmap:116 red/90000\r\na=rtpmap:117 ulpfec/90000\r\na=ssrc:2395068464 cname:55jRs5nrq4YtG2pe\r\na=ssrc:2395068464 msid:LHSE8yQLf2XKK7IMg9AcYsnyAQaeEIaZve7z e373d5e5-a839-461a-8151-b87344cd6c48\r\na=ssrc:2395068464 mslabel:LHSE8yQLf2XKK7IMg9AcYsnyAQaeEIaZve7z\r\na=ssrc:2395068464 label:e373d5e5-a839-461a-8151-b87344cd6c48\r\n","type":"answer"}},
      'SERVICE_QUERY':
      {"rtcommVer":"v0.4.0","method":"RESPONSE","orig":"SERVICE_QUERY","transID":"6c528abf-b01d-4528-b8e0-b13b93a46ff6", "services": {"iceURL": "stun:host:port,turn:host:port","nodeconnectiontopic":"topic name", "sipconnectiontopic":"topic name"}}
  };

  function messageValid(message) {
    // one passed should be the one to check against the sample.  
    var template = sampleMessage[message.method];
    var valid = true;
    Object.keys(template).forEach(function(key){
      // Key from template MUST be in real one, or in optional)
      valid = valid && (message.hasOwnProperty(key) || optionalHeaders.hasOwnProperty(key));              
      console.log('['+key+']--> '+valid);
    }
    );
    return valid;
  }
    registerSuite({ 
      name: 'Unit Tests - EndpointConnection',
  "newMessageTest" : function(){
     var msg = connection.MessageFactory.createMessage();
     // Should be a SIGMSG
//     console.log(msg);
     assert.equal("MESSAGE", msg.method);
     assert.equal("v0.4.0", msg.rtcommVer) ;
     assert.equal(null, msg.peerContent);
     assert.equal(null, msg.fromTopic);
   },
 "newMessageSTART_SESSIONTest": function(){
     var method = 'START_SESSION';
     var msg = connection.MessageFactory.createMessage(method);
  //   console.log(msg);
     assert.equal(msg.method, method);
     assert.ok(messageValid(msg));
 },
"newMessagePRANSWERTest": function(){
     var method = 'PRANSWER';
     var msg = connection.MessageFactory.createMessage(method);
   //  console.log(msg);
     assert.equal(msg.method, method);
     assert.ok(messageValid(msg));
 },
 "CastAMessageSTART_SESSIONTest": function(){
     var ssmsg = sampleMessage['START_SESSION'];
     var msg = connection.MessageFactory.cast(sampleMessage['START_SESSION']);
     var not_missing = true;
     Object.keys(ssmsg).forEach(function(key){
       not_missing = not_missing && msg.hasOwnProperty(key);              
    //   console.log('['+key+']--> '+not_missing);
     }
     );
     assert.ok(not_missing);
   },
	
  "Minimum MqttConnection Configuration Test" : function(){
      try {
        var rtcsvc = new connection.MqttConnection();
      } catch(e) {
          assert.equal('MqttConnection instantiation requires a minimum configuration: {"server":"string","port":"number","rtcommTopicPath":"string"}', e.message);
      }
   },
  "Number as Server in config" : function() {
    var badconfig = {
      server: 1,
      port: "a"
    };
     try {
         var rtcsvc = new connection.MqttConnection(badconfig);
     } catch(e) {
         assert.equal('Typeof server is incorrect. number  Should be a string', e.message);
     }
  },
  "String in port config" : function(){
   // change each to be good as we go down...
    var badconfig = {
      server: 1,
      port: "a"
    };
    badconfig.server = "astring";
    try {
      var rtcsvc =new connection.MqttConnection(badconfig);
    } catch(e) {
        assert.equal('Typeof port is incorrect. string  Should be a number', e.message);
    }
  },
    
   "Pass invalid config parameter" : function(){
     // change each to be good as we go down...
    var validconfig = { server: "a",
     port: 1,
     rtcommTopicPath: "/rtcomm/"};
     validconfig.junk = "astring";
     try {
       var rtcsvc = new connection.MqttConnection(validconfig);
      } catch(e) {
     assert.equal('junk is an invalid property for {"server":"a","port":1,"rtcommTopicPath":"/rtcomm/","credentials":null,"myTopic":null,"defaultTopic":null,"useSSL":null}', e.message);
      }
    },
    "valid but incorrect config throws an error": function(){
       try {
         var rtcsvc = new connection.MqttConnection(validconfig);
       } catch(e) {
           assert.ok(e);
       }
     },
   'logLevelTest': function () {
     var cfg = config.clientConfig1();
     console.log('Paho!', Paho);
     console.log('config', cfg);
        var conn = new connection.EndpointConnection(cfg);
        console.log(conn);
        var d1 = conn.getLogLevel();
        conn.setLogLevel('DEBUG');
        assert.ok(conn._l('DEBUG'));
      }
    });
});
