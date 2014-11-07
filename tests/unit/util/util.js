/**
 * Copyright 2013 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
define([
    'intern!object',
    'intern/chai!assert',
    'ibm/rtcomm/util'
], function (registerSuite, assert,util) {
    registerSuite({
      name: "Unit Tests - util module",
      "Evented Object Test" : function(){
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
          assert.ok(cb1);
          assert.ok(cb2);
          assert.ok(cb3);
        }
    }); // End of Tests
});
