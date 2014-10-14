/*
 * Copyright 2014 IBM Corp.
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
/** Base Rtcomm class that provides event functionality 
 * @class
 * @memberof module:rtcomm.util
 */
var RtcommBaseObject = {
    /** @lends module:rtcomm.util.RtcommBaseObject.prototype */
    /*
     * Properties

    objName : 'Base',
    id : 'unknown',
    config: {},
    dependencies: {},
    ready: false,
    state: 'unknown',
    states: {},
    events: {},  
     */
    /*
     * Methods
     */
    setState : function(value) {
      if (this.states.hasOwnProperty(value)) {
        this.state = value;
        this.emit(value);
      }
    },
    listEvents : function() {

      console.log('******* ' + this+' Configured events ***********');
      /*jslint forin: true */
      for(var event in this.events) {
          if (this.events.hasOwnProperty(event)) {
            console.log('******* ['+event+'] has '+this.events[event].length+' listeners registered');
          } 
          
        }
    },  
    clearEventListeners : function() {
      for(var event in this.events) {
          if (this.events.hasOwnProperty(event)) {
            this.events[event] = [];
          } 
      }
    },
    createEvent: function(event) {
      if (this.hasOwnProperty('events')){
        this.events[event] = []; 
      } else {
        throw new Error('createEvent() requires an events property to store the events');
      }
    },  
    removeEvent: function(event) {
      if (event in this.events) {
        delete this.events[event];
      }   
    },  

    /** Establish a listener for an event */
    on : function(event,callback) {
      //console.log('on -- this.events is: '+ JSON.stringify(this.events));
      // This function requires an events object on whatever object is attached to. and event needs to be defined there.
      if (this.events && this.events[event] && Array.isArray(this.events[event])) {
        l('EVENT', this) && console.log(this+' Adding a listener callback for event['+event+']');
        l('TRACE', this) && console.log(this+' Callback for event['+event+'] is', callback);
        this.events[event].push(callback);
      } else {
        throw new Error("on() requires an events property listing the events. this.events["+event+"] = [];");
      }   
    },  
    /** emit an event from the object */
    emit : function(event, object) {
      var self = this;
      if (this.events && this.events[event] ) {
        l('EVENT', this) && console.log(this+".emit()  for event["+event+"]", self.events[event].length);
        // Event exists, call all callbacks
        self.events[event].forEach(function(callback) {
            if (typeof callback === 'function') {
              l('EVENT', self) && console.log(this+".emit()  executing callback for event["+event+"]");
              callback(object);
            } else {
              l('EVENT', self) && console.log(self+' Emitting, but no callback for event['+event+']');
            }   
        });
      } else {
        throw new Error('emit() requires an events property listing the events. this.events['+event+'] = [];');
      }
    },
    extend: function(props) {
      var prop, obj;
      obj = Object.create(this);
      for (prop in props) {
        if (props.hasOwnProperty(prop)) {
          obj[prop] = props[prop];
        }
      }
      return obj;
    },
    // Test Function
    _l: function(level){
      if (typeof l === 'function') {
        return l(level,this);
      } else {
        return 'unknown';  
      }
    },
    toString: function() {
      return this.objName + '['+this.id+']';
    }
};

