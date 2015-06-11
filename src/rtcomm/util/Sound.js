var Sound = function Sound(url) {
  if (!(this instanceof Sound)) {
    return new Sound(url);
  }
  /* global AudioContext:false */ 
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  this.url = url;
  this.context = new AudioContext();
  this.buffer = null;
  this.loaded = false;
  this.playing = null;
};

Sound.prototype = (function () {

  var load = function load(callback) {
    var self = this;
    if (self.url) {
      var request = new XMLHttpRequest();
      request.open('GET', self.url, true);
      request.responseType= 'arraybuffer';
      request.onload = function() {
        self.context.decodeAudioData(request.response, 
          function(buffer) {
            self.buffer = buffer;
            console.log('successfully loaded buffer '+ self.url);
            callback && callback();
          }, 
          function(error) { /* onError */
            console.log('Unable to load the url: ', error);
          });
      };
      request.send();
    }
    return self;
  };

  var play = function play() {
    var self = this;
    var _play = function _play() {
      var sound = self.context.createBufferSource();
      sound.buffer = self.buffer;
      sound.connect(self.context.destination);
      sound.loop= true;
      sound.start(0);
      self.playing = sound;
    };

    if (self.buffer) {
      _play();
    } else {
      load(_play);
    }
    return self;
  };

  var stop= function stop() {
    if (this.playing) {
      this.playing.stop();
      this.playing = null;
    } else {
      console.log('Nothing playing');
    }
    return this;
  };
    return {
      load: load,
      play: play,
      stop: stop
    };
})();

/*globals exports:false*/
exports.Sound= Sound;


