#Rtcomm Signalling Protocol Specification: v1.0.0 


## Abstract
This specification defines version v1.0.0 of the Rtcomm signaling protocol . The Rtcomm protocol is JSON based and built on top of MQTT. The protocol can be broken down into the following two parts:

1. General protocol for real-time communications including media session signaling for WebRTC endpoints.
2. Service protocol for things like third party call control.    See [**rtcomm.service.proto.spec.md**](https://github.com/WASdev/lib.rtcomm.node/blob/master/rtcomm.service.proto.spec.md) for details.

Rtcomm is a highly-scalable protocol that uses a minimal set of backend resources. In its most basic from, Rtcomm can be used to build a highly-scalable signaling plane for real-time media sessions that only relies on an MQTT message broker for message routing. Rtcomm is flexible enough to also allow backend services to plug into the MQTT broker for federation with other protocols, persistent chat rooms, etc. 

The protocol supports all of the following capabilities:

1. Registration of Rtcomm endpoints with an Rtcomm service via a Presence message.
2. Service function queries (event monitoring topic name, ICE configuration,...).
3. Call signaling (WebRTC clients, media resources, gateways,...).
    
This specification describes the signaling protocol between various types of Rtcomm endpoints. Examples of Rtcomm endpoints include:
- Rtcomm client endpoints
- Media processing endpoints
- Federated SIP endpoints.
- Basically any endpoint that can run a basic Rtcomm protocol stack.

# Rtcomm Protocol Definition

This protocol specification relies on the publish/subscribe semantics of the MQTT protocol. Rtcomm endpoints and services normally subscribe to one or more topics hosted by an MQTT message broker.    A typical client endpoint topic could look like this: /rtcomm/endpointID. Client endpoints communicate with backend services by publishing messages to the service's topic name.    A typical service topic name could look like this: /rtcomm/group. Services communicates with a particular endpoint by publishing messages to the endpoint's topic name.

### Endpoint ID Definiton
In the message definitions below, there are many references to various EndpointIDs.  This can be any string that does not include a "/" which represents the Rtcomm endpoint. Its a fundamental building block in the Rtcomm protocol and relates directly to the credentials used to connect to the MQTT message broker. It can be a simple name (i.e. "Danko Jones") or it can be preceded by a protocol descriptor (i.e. "sip:dankojones@xyz.com"). Typically, the MQTT broker would be configured to authorize subscriptions on topic names that include endpointIDs to only allow the subscription if a user was logged in with the proper credentials. This would prevent two different users from subscribing on the same endpointID topic.

### Identity Propogation
When an Rtcomm message is sent to a remote topic, the sender publishes to a topic name that is a combination of the remote topic name being subscribed on by the receiver + the senders endpoint ID. For example, if the topic name subscribed on by the receiver is "/rtcomm/connector", the sender publishes to "/rtcomm/connector/"sender's endpoint ID".  This is done in order to propagate endpoint IDs in a secure manner. 
MQTT message brokers can be securely configured to only allow endpoints with proper credentials to publish to MQTT topics that include an appended endpoint ID. Endpoint IDs are sent in this manner to insure the ID is not spoofed. Because of this you never see the senders endpoint ID includes in an Rtcomm message definition.

### Protocols Definition
As you'll see in the various signaling messages below, some messages contain a header key named "protocols" which contains a JSON array that includes a list of protocols supported by the endpoint:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| protocols             | Array of strings   |

Protocols are sub-protocols embedded in the signaling session and identify the types of data that may be in the 'payload' header. This allows Rtcomm signalling sessions to be extensible.  At this time, the following protocols are supported:

| Protocol                 | Description                               |
| ----------------------|:-------------------------------------------|
| chat            | Declares session can support chat      |
| webrtc          | Declares session can support webrtc    |

NOTE:  It is intended that this list of sub-protocols will be extended. Third parties can also define their own sub-protocols.

### Payload Definition
As you'll see in the various signaling messages below, some messages contain a header key named "payload" which contains a JSON object that includes a type and some data content as follows: 

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| payload               | JSON object defined in the table below. |


This JSON object that represents the payload value contains can contain a key/value pair for each supported protocol. Examples for supported protocols for 'webrtc' and 'chat' are

| Key                   | Value                                      |
| ----------------------|:-------------------------------------------|
| webrtc                | JSON Object specific to the sub-protocol defined below |
| chat                  | JSON Object specific to the sub-protocol defined below | 


For the protocols currently supported, the sub-protocol JSON Object should be:

#### chat content
|  Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
|    message            | String containing message to send          |
|    from               | String indicating who send the message     | 

#### webrtc content

|  Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
|   type              |  "offer", "answer", "pranswer", "icecandidate", "stream"|
|   sdp or candidate  | Raw data (based on standards for RTCPeerConnection| 
|   stream            | {audio: boolean, video: boolean, label: string } |

Note:  The **webrtc**  data types (sdp and candidate) are generated by the WebRTC API and are typically associated with the following peerContent type(s): offer, answer, pranswer, and icecandidate. See these links for details:

http://dev.w3.org/2011/webrtc/editor/webrtc.html#session-description-model.   
http://tools.ietf.org/id/draft-nandakumar-rtcweb-sdp-01.html.  

## Endpoint Registration (optional)

The Rtcomm protocol supports the notion of endpoint registration but does not require it. In some cases, a client or service may not know what topic a client is listening on or if it is even logged in. It may only know the endpointID. An endpoint declares this information by publishing a 'DOCUMENT' message.  This message is an MQTT Retained message that is consumed by the service which stores this as registration information. The service stores this registration until the endpoint goes away (either purposefully or accidentally).  When it goes away it sends an empty LWT message to the topic it published this DOCUMENT which clears the retained message.  Services receiving the LWT messages clean up any related resources such as the registration or any active sessions related to the endpoint.

Here is an example of a DOCUMENT message:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | DOCUMENT |
| type					| ENDPOINT or SERVICE                        | 
| rtcommVer             | e.g.  v1.0.0          |
| appContext            | application context associated with the registration   e.g. "XYZ video app"|
| topic                 | topic that the endpoint is subscribed to. Typically the same as the from topic.   e.g.  /rtcomm/2123928217 |
| state                 | String representing state of the endpoint [i.e. "busy", "available", etc..] |
| alias					| Endpoint alias  (i.e. js@blah.com may be an ID, but the alias could be "John Smith")|
| userDefines		    | **Completely** user defined Array of things that an endpoint would like to publish about itself |


Note: appContext is used to differentiate between multiple applications a userid may be registered with on the same service. There can only be one registered topic name associated with a single endpointID/appContext.

## Service query (optional)

An endpoint can make a service query to discover what services are provided in the network. Again, this is not required by the Rtcomm protocol.  A service query returns information related to the service including things like ICE servers the client endpoint should use, service topic names, etc. As other services are added, they will be advertised in this query.

Here is an example of a SERVICE_QUERY message sent to the service:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | SERVICE_QUERY |
| rtcommVer             | e.g.  v1.0.0         |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  b2a4247f-fafc-4d3c-a23b-822d02e8f08b |
| fromTopic             | topic where the response must be published to.   e.g.  /rtcomm/2123928217 |
<br/>

Here is an example of a SERVICE_QUERY response:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | RESPONSE |
| orig                  | SERVICE_QUERY |
| rtcommVer             | e.g.  v1.0.0          |
| transID               | transaction ID, this is a unique identifier associed with this transaction.   e.g.  b2a4247f-fafc-4d3c-a23b-822d02e8f08b |
| services    	        | JSON object containing services available.  See **Note** below|
| result    	        | result of the operation    e.g.  SUCCESS or FAILURE |
| reason				| Optionally included if FAILURE is the result. String explaining why the request failed |


Note:  The "services" header listed above is a JSON object that contains a list of Services the server supports. 
If the server responds, it will respond with at least one object that is similar to the following:

```
"RTCOMM_CONNECTOR_SERVICE": {
  "topic" : "/rtcomm/connector",
  "sphereTopic": "/rtcomm/sphere",
  "iceURL":"stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302",
  "eventMonitoringTopic":"/rtcomm/event"} |
```

It may return additional services depending on the server configuration.  These services are defined on the server. 
If a returned service contains a **schemes** property then their must be a **topic** property as well define where
the topic should be routed.  For example:

```
"SOME_SERVICE" : {
  "topic" : "topicString",
  "schemes" : ["scheme1", "scheme2"]
  }
```

## Signaling for peer to peer sessions

An endpoint uses a signaling session to setup real-time media streams with another endpoint.  Setting up this session requires a number of message exchanges.   The call signaling protocol can be used for client to service communications, or directly between 2 endpoints (assuming the endpoints have permission to publish on their counterparts topic name).   

This is the first message sent from the endpoint to start a new signaling session:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | START_SESSION |
| rtcommVer             | e.g.  v1.0.0          |
| protocols				| Array of protocols supported by the Endpoint starting the session e.g. [ 'chat', 'webrtc'] |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  a57ffe3f-d964-4818-b32a-053c1303a1bb |
| fromTopic             | topic where the response must be published to.   e.g.  /rtcomm/2018097881 |
| toEndpointID          | callee endpoint ID.   e.g. johnDoe |
| appContext            | application context associated with the application (optional)   e.g. "XYZ video app"|
| sigSessID             | Globally unique ID associated with this session   e.g. 553eebdc-6884-47e4-a656-fd89a920bb68 |
| payload               | Typically includes the SDP offer for this session. e.g. {"webrtc": {"type":"offer","sdp":...}}|

Note:    sigSessID should be a UUID to insure it is globally unique.

If this message is sent to a Rtcomm connector service, the service looks up the toEndpointID in the registry, and forwards it to the destination endpoint.

In response to the START_SESSION message, the callee responds may respond with an optional PRANSWER:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | PRANSWER |
| rtcommVer             | e.g.  v1.0.0         |
| protocols				| Array of protocols the callee has in **common** with the caller e.g. [ 'chat', 'webrtc'] |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  a57ffe3f-d964-4818-b32a-053c1303a1bb |
| fromTopic             | Client topic where subsequent messages related to this session should be published.   e.g.  /rtcomm/2123928217 |
| sigSessID             | unique ID associated with this session.   e.g. 7246298a-4b2c-477b-b6cf-410e37074063 |
| payload               | May include SDP information or ICE candidates.  e.g.{"webrtc": {"type":"pranswer","sdp":...}}|
| holdTimeout           | May include hold timeout value (in seconds).   This tells the call originator how long to wait for the call to be established. |
| queuePosition           | May include queue position.   This tells the call originator where the call stands in the queue.    If this is 0, the call is actively being connected.


The caller and/or callee endpoint(s) may also send out another message which specifies one or more ICE candidates:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | MESSAGE |
| rtcommVer             | e.g.  v1.0.0          |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  a57ffe3f-d964-4818-b32a-053c1303a1bb |
| fromTopic             | Client topic where subsequent messages related to this session should be published.   e.g.  /rtcomm/2123928217 |
| sigSessID             | unique ID associated with this session.  e.g. 7246298a-4b2c-477b-b6cf-410e37074063 |
| payload               | includes SDP information about the session.   e.g.  {"webrtc": {"type":"icecandidate","candidate":{"sdpMLineIndex":0,"sdpMid":"audio","candidate":"a=candidate:3013953624 1 udp 2122260223 192.168.1.100 56617 typ host generation 0\r\n"}}}|

The callee endpoint will eventually respond to the START_SESSION:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | RESPONSE |
| protocols				| Array of protocols the callee has in **common** with the caller e.g. [ 'chat', 'webrtc'] |
| orig                  | Method type that started the transaction. In this case: START_SESSION |
| rtcommVer             | e.g.  v1.0.0          |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  a57ffe3f-d964-4818-b32a-053c1303a1bb |
| fromTopic             | Client topic where subsequent messages related to this session should be published.   e.g.  /rtcomm/116396706 |
| sigSessID             | unique ID associated with this session.   e.g. 7246298a-4b2c-477b-b6cf-410e37074063 |
| payload               | May include SDP information with an answer.  e.g.{"webrtc": {"type":"answer","sdp":...}}|
| result                | result of operation    e.g. SUCCESS or FAILURE |
| reason				| Optionally included if FAILURE is the result. String explaining why the request failed |

Either the caller or callee can send an in session message at any time. This message could be used to send opaque user data or to simply update a session description.

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | MESSAGE |
| rtcommVer             | e.g.  v1.0.0          |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  a57ffe3f-d964-4818-b32a-053c1303a1bb |
| fromTopic             | Client topic where subsequent messages related to this session should be published.   e.g.  /rtcomm/116396706 |
| sigSessID             | unique ID associated with this session.   e.g. 7246298a-4b2c-477b-b6cf-410e37074063 |
| payload               | Content associated with the message   e.g.{"webrtc": {"type":"answer","sdp":...}}|

At the end of the session, one of the endpoints will termiante the session by sending this message to the remote endpoint:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | STOP_SESSION |
| rtcommVer             | e.g.  v1.0.0          |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  a57ffe3f-d964-4818-b32a-053c1303a1bb |
| sigSessID             | unique ID associated with this session.  e.g. 553eebdc-6884-47e4-a656-fd89a920bb68 |
| reason 				| Reason session is ending.  e.g. session terminated by endpoint |


Note: no response is sent after a stop session.


## Call referral

The protocol supports call referral. A "call referral" is used to make a request to an endpoint to establish a call with another endpoint. This method of initiating a signaling session is usually triggered through third party call control.

This following defines a refer message.    

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                |REFER |
| rtcommVer             | e.g.  v1.0.0        |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  b2a4247f-fafc-4d3c-a23b-822d02e8f08b |
| fromTopic             | topic where the response must be published to.   e.g.  /rtcomm/116396706 |
| toEndpointID          | callee endpoint ID   e.g. Danko Jones |
| appContext            | application context associated with the application (optional)   e.g. "XYZ video app"|
| details               | details about the refer operation.    e.g. :{"sessionID":"1234567888","toEndpointID":"johnDoe"}|

This following is the response to the refer:

| Key                   | Value                                     |
| ----------------------|:-------------------------------------------|
| method                | RESPONSE |
| orig                  | REFER |
| rtcommVer             | e.g.  v1.0.0          |
| transID               | transaction ID, this is a unique identifier associated with this transaction.   e.g.  b2a4247f-fafc-4d3c-a23b-822d02e8f08b |
| fromTopic             | topic where the response must be published to.   e.g.  /rtcomm/2018097881 |
| toEndpointID          | caller endpoint ID    e.g. Danko Jones |
| result                | result of the operation    e.g. SUCCESS or FAILURE |
| reason				| Optionally included if FAILURE is the result. String explaining why the request failed |



## Last Will and Testament Message

This message is actually an empty message.    There is NO data in this message.    The server uses this message as notification that the endpoint is no longer available.    The fromEndpointID is parsed from the end of the topic name.    All registrations that use this ID, and all sessions established with this ID are canceled.
