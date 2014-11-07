/*
 * This is a private EndpointRegistry object that 
 * can be used to manage endpoints.
 *
 * We create an object like:  { 'appContext'}: { uuid1: Endpoint1,
 *                                               uuid2: Endpoint2}
 */

/* global l:false */

var EndpointRegistry = function EndpointRegistry(options) {
  var singleEndpoint = (options && options.singleEndpoint) ? options.singleEndpoint : false;
  // {options.singleEndpoint = true}  There can only be 1 endpoint per context.
  //
  var registry = {};
  // used to search for endpoints by these values.
  var properties = [];
  /* get an endpoint based on a key
   *  if it is ambiguous, return them all in an Array.
   */
  function get(key) {
    var a = [];
    // Key should be an ID
    if (key) {
      a = findByProperty('id', key);
    } else {
      // create a list of all endpoints.
      a = this.list();
    }
    return a;
  }

  function getOneAvailable() {
    var a = [];
    this.list().forEach(function(item){
      item.available() && a.push(item);
    });
    // Return the last one found
    if(a.length > 0 ) { 
      return a[a.length-1];
    } else {
      return null;
    }
  }

  // Return array of all enpdoints that match the query
  function findByProperty(property, value) {
    if (properties.indexOf(property) > -1) {
      // Two special cases - property is id or appContext:
      var a = [];
      switch(property) {
        case 'appContext':
          if (registry.hasOwnProperty(value)) {
            Object.keys(registry[value]).forEach(function(key){
              a.push(registry[value][key]);
            });
          }
          break;
       case 'id' :
         Object.keys(registry).forEach(function(appContext){
           if (registry[appContext].hasOwnProperty(value)) {
             a.push(registry[appContext][value]);
           }
         });
         break;
       default:
         this.list().forEach(function(obj) {
           if (obj.hasOwnProperty(property) && obj[property] === value ){
             a.push(obj);
           }
         });
         break;
      }
      return a;
    } else {
      l('DEBUG') && console.log('EndpointRegistry.findByProperty '+property+' not valid ');
      return []; 
    }
  }
  /* add an endpoint, if a key for that 
   * endpoint already exists, return it.
   * Otherwise, return null if nothing passed
   */
  function add(object) {
    var appContext  =  null;
    var uuid =  null;
    if (object) {
      properties = Object.keys(object);
      appContext= object.appContext;
      uuid = object.id;
      if (registry.hasOwnProperty(appContext)) {
        var eps = Object.keys(registry[appContext]);
        if (eps.length === 1 && singleEndpoint) {
          console.log('Returning existing object');
          return registry[appContext][eps[0]];
        } else {
          registry[appContext][uuid] = object;
          return registry[appContext][uuid];
        }
      } else {
        // Create context, add endpoint
        registry[appContext] = {};
        registry[appContext][uuid] = object;
        return registry[appContext][uuid];
      }
    } else {
      return null;
    }
  }
  /*
   * Remove an object from the registry
   */
  function remove(object) {
    var key = null;
    var uuid = null;
    if (object && list().length > 0 ) {
      key = object.appContext;
      uuid = object.id;
      l('DEBUG') && console.log('EndpointRegistry.remove() Trying to remove object', object);
      if (registry.hasOwnProperty(key) ) {
        if (registry[key].hasOwnProperty(uuid)) {
           delete registry[key][uuid];
           // If this was the last entry in the appContext, delete it too.
           if (Object.keys(registry[key]).length === 0 ) {
             delete registry[key];
           }
           return true;
        } else {
          l('DEBUG') && console.log('EndpointRegistry.remove() object not found', list());
          return false;
        }
      } else {
        l('DEBUG') && console.log('EndpointRegistry.remove() object not found', list());
        return false;
      }
    } else {
      return false;
    }
  }
  /*
   * Destroy the registry and all objects in it
   *  calls .destroy() on contained objects if
   *  they have that method
   */
  function destroy() {
    // call destroy on all objects, remove them.
    list().forEach(function(obj){
        if (typeof obj.destroy === 'function') {
          obj.destroy();
        }
        remove(obj);
     });
  }

  function length() {
    return this.list().length;
  }

  /*
   * return the registry object for perusal.
   */
  function list() {
    var a = [];
    Object.keys(registry).forEach(function(appContext){
      Object.keys(registry[appContext]).forEach(function(uuid){
        a.push(registry[appContext][uuid]);
      });
    });
    return a;
  }

  return {
    add: add,
    get: get,
    getOneAvailable: getOneAvailable,
    findByProperty: findByProperty,
    remove: remove,
    destroy: destroy,
    length: length,
    list: list
  };

};
