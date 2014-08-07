# Abstract
Our main goals when building the base Rtcomm protocols were to make them extremely simple and extremely useful. After years of working with telco based protocols like SIP, we wanted to create something simpler for the web that did not carry all the baggage necessary to support the global telephone network but we also wanted it to be interoperable with those legacy protocols when needed.

With that said, all Rtcomm protocols are built on top of MQTT. They are JSON based and as lightweight as possible. The protocol can be broken down into the following two parts:

1. Signaling protocol for connecting WebRTC clients into media sessions.
2. Service protocol for things like third party call control and event monitoring.See [**rtcomm.service.proto.md**](https://github.com/WASdev/lib.rtcomm.node/blob/master/rtcomm.service.proto.spec.md) for details.

This specification describes the signaling protocol which is implemented by some of the Rtcomm client javascript modules included in this repository. This protocol can be used in a purely peer-to-peer content but is typically used to interact with server-side Rtcomm components such as the Liberty profile of the WebSphere application server (rtcomm-1.0 feature) to do things like:

1. Create WebRTC peer connections with other Rtcomm clients.
2. Create WebRTC peer connections with SIP clients via WebRTC gateways that support the Rtcomm protocol.
3. Create WebRTC peer connections with media resource functions.

TBD

