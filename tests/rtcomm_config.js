// File used for config of node.js to run DOH tests via node.
// This specifies how where to 'load' from
// The paths are relative to where node is launched from.

require({
     paths: { "ibm" : "../../../build/js/umd/ibm" ,
              "lib"  : "../../../build/js/lib",
              "tests"  : "../../../js/tests"}
});
