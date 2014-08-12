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
      if (this.events && this.events[event]) {
        l('EVENT', this) && console.log(this+".emit()  for event["+event+"]", object);
        // Event exists, call all callbacks
        this.events[event].forEach(function(callback) {
          if (typeof callback === 'function') {
            callback(object);
          } else {
            l('EVENT', this) && console.log(this+' Emitting, but no callback for event['+event+']');
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
    toString: function() {
      return this.objName + '['+this.id+']';
    }
};

