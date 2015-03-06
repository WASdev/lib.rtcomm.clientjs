var RtcommError = function RtcommError(/*string*/ message, /*array*/ subs) {
  this.name = "RtcommError";
  this.message = message || "RTCOMM: Default error message";

};

RtcommError.prototype = Object.create(Error.prototype);
RtcommError.prototype.constructor = RtcommError;
/*globals exports:false*/
exports.RtcommError = RtcommError;


