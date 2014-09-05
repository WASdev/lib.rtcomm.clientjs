// This script acts as an HTTP server in node.js, serving filesw/ the directory passed in.
//

var connect = require('connect'),
        http = require('http'),
        directory = "";

process.argv.forEach( function(val, index, array) {
  console.log(index + ":" + val);
});

if (process.argv[2] === undefined ) {
  console.log("Please pass a directory to serve files from");
} else {
  directory = process.argv[2];
}


connect()
    .use(connect.static(directory))
        .listen(3000);
