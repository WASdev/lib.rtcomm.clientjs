
var MessageEndpoint = (function(config) {

	var MessageEndpoint = function MessageEndpoint(config) {
		var ep =  new SessionEndpoint(config);
		ep.addProtocol(GenericMessageEndpoint);
	}
	return MessageEndpoint;
})();
