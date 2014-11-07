// This script acts as an HTTP server in node.js, serving filesw/ the directory passed in.
//

var connect = require('connect');
var serveStatic = require('serve-static');
var util = require('util');


var app = connect();
var directory = "";

process.argv.forEach( function(val, index, array) {
  console.log(index + ":" + val);
});

if (process.argv[2] === undefined ) {
  console.log("Please pass a directory to serve files from");
} else {
  directory = process.argv[2];
}

app.use(serveStatic(directory));
app.listen(3000);

