var GenericMessageProtocol = function GenericMessageProtocol() {

  function startMessage() {
    console.log('No Start Message');
    return null;
  };

  function stopMessage(){
    console.log('No Stop Message');
    return null;
  };
  function processMessage(message) {
    console.log('Received a Message: '+ message);
  };

  function constructMessage(message) {
    // Take a string message, cast it in our 'protocol'
    return {'message': message};
  };

  var  protocolDefinition = new SubProtocol({
    name: 'generic-message',
    getStartMessage: startMessage,
    getStopMessage: stopMessage,
    handleMessage: processMessage,
    constructMessage: constructMessage
});
 return protocolDefinition;
}
