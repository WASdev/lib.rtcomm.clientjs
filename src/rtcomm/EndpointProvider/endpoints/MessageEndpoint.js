var MessageEndpoint = (function(config) {

  var MessageEndpoint = function MessageEndpoint(config) {

    function addGenericMessageHandlers(ep) {
      ep.createEvent('onetimemessage');
      ep.createEvent('generic_message:message');
      ep.generic_message.on('message', function(event_obj) {
        console.log('eventObject?', event_obj);
        // This shoudl be deprecated (onetimemessage) that is.
        var deprecatedEvent = {
          'onetimemessage': event_obj.message
        };
        ep.emit('onetimemessage', deprecatedEvent);
        ep.emit('generic_message:message', event_obj);
      });
    };
    SessionEndpoint.call(this, config);
    this.addProtocol(new GenericMessageProtocol());
    addGenericMessageHandlers(this);
    // Enabled by default
    this.config.generic_message = true;
    this.generic_message.enable();
  }

  MessageEndpoint.prototype = Object.create(SessionEndpoint.prototype);
  MessageEndpoint.prototype.constructor = MessageEndpoint;

  return MessageEndpoint;
})();
