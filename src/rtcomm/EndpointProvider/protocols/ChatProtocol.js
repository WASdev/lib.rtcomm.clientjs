var ChatProtocol = function ChatProtocol(){
  // Call superconstructor
  // Define the Protocol
  //
  function getStartMessage(callback) {
    l('DEBUG') && console.log(this+'.getStartMessage() entry');
    callback && callback(true, constructMessage.call(this, this.dependencies.parent.userid + ' has initiated a Chat with you'));
  }

  function getStopMessage(callback) {
    callback && callback(true, constructMessage.call(this, this.dependencies.parent.userid + ' has left the chat'));
  }
  function constructMessage(message) {
    l('DEBUG') && console.log(this+'.constructMessage() MESSAGE: ', message);
      return {'message': message, 'from': this.dependencies.parent.userid};
  }

  function handleMessage(message) {
      l('DEBUG') && console.log(this+'.handleMessage() MESSAGE: ', message);
      var parent = this.dependencies.parent;
      if (this.state === 'connected') {
        this.emit('message', message);
      } else if (this.state === 'alerting') {
        // dropping message, not in a state to receive it.
        l('DEBUG') && console.log(this+ '.handleMessage() Dropping message -- unable to receive in alerting state');
      } else {
        // If we aren't stopped, then we should pranswer it and alert.
        if (!parent.sessionStopped()) {
          // Parent should pranswer, not us...
//          parent._.activeSession && parent._.activeSession.pranswer();
          console.log('handleMessage, calling allering on this: ',this);
          this._setState('alerting', message);
        }
      }
  }
  var protocolDefinition = {
    'name' : 'chat',
    'getStartMessage': getStartMessage,
    'getStopMessage' : getStopMessage,
    'constructMessage':constructMessage,
    'handleMessage': handleMessage
  }

  SubProtocol.call(this, protocolDefinition);
}
ChatProtocol.prototype= Object.create(SubProtocol.prototype);
ChatProtocol.prototype.constructor = ChatProtocol;
