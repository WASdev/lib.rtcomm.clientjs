// This script acts as an HTTP server in node.js, serving filesw/ the directory passed in.
//

var connect = require('connect');
var serveStatic = require('serve-static');
var util = require('util');

var defaultPort = 3000;
var defaultDir = '.';

var app = connect();
var directory = "";

process.argv.forEach( function(val, index, array) {
  console.log(index + ":" + val);
});

var directory = (typeof process.argv[2] !== 'undefined') ? process.argv[2] : defaultDir;
var port = (typeof process.argv[3] !== 'undefined') ? process.argv[3] : defaultPort;

console.log('Using Directory: '+ directory);
console.log('Using port: '+ port);

app.use(serveStatic(directory));
app.listen(port);

