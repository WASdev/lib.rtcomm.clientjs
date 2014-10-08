/*
 * MqttConnection UNITTESTs
 */

define(["doh/runner", "tests/common/config", "ibm/rtcomm/util"], function(doh, config,util){
    doh.register("util module unit tests ", [
      { name: "Evented Object Test",
        runTest: function(){
          var Obj = function Obj() {
            this.events = 
              { 'event1': [],
                'event2': []
              };
          };
          Obj.prototype = util.RtcommBaseObject.extend();
          var o = new Obj();

          var cb1 = false;
          var cb2 = false;
          var cb3 = false;

          o.on('event1', function(message) {
            console.log('callback 1 on event1 called');
            cb1=true;
          });

          o.on('event1', function(message) {
            console.log('callback 2 on event1 called');
            cb3=true;
          });

          o.on('event2', function(message) {
            console.log('callback 1 called on event2');
            cb2=true;
          });


          o.emit('event1');
          o.emit('event2');
          doh.t(cb1);
          doh.t(cb2);
          doh.t(cb3);
        }

       }
    ]); // End of Tests


});
