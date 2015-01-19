  var Queues = function Queues(availableQueues) {
    var Queue = function Queue(queue) {
      var self = this;
      Object.keys(queue).forEach(function(key){
        queue.hasOwnProperty(key) && (self[key] = queue[key]);
      });
      // fix the topic, make sure it has a #
      if (/#$/.test(queue.topic)) {
        this.topic = queue.topic;
      } else if (/\/$/.test(queue.topic)) {
        this.topic = queue.topic + "#";
      } else { 
        this.topic = queue.topic + "/#";
      }
      // Augment the passed in queue.
      this.active= false;
      this.callback= null;
      this.paused= false;
      this.regex= null;
      this.autoPause = false;
    };
    var queues  = {};

    this.add = function(availableQueues) {
      availableQueues.forEach( function(queue) {
        // Only overwrite a queue if it doesn't exist 
        if(!queues.hasOwnProperty[queue.endpointID]) {
          queues[queue.endpointID] = new Queue(queue);
        }
      });
    };

    this.get = function(queueid) {
      return queues[queueid] || null;
    };
    this.findByTopic = function(topic) {
      // Typically used on an inbound topic, will iterate through queue and return it.
      var matches = [];
      //console.log(Object.keys(queues));
      Object.keys(queues).forEach(function(queue) {
        l('DEBUG') && console.log('Queues.findByTopic testing '+topic+' against regex: '+queues[queue].regex);
        queues[queue].regex && queues[queue].regex.test(topic) && matches.push(queues[queue]);
        });
     if (matches.length === 1 ) {
       return matches[0];
     } else {
       throw new Error('Multiple Queue matches for topic('+topic+')- should not be possible');
     }
    };
    this.all = function() {
      return queues;
    };
    this.list = function(){
      return Object.keys(queues);
    };
  };

  Queues.prototype.toString = function() {
    this.list();
  };
