define([
    'intern!object',
    'intern/chai!assert',
  //  'app/hello'
], function (registerSuite, assert) {
    registerSuite({
        name: 'hello',

        greet: function () {
          console.log('************ greet **************');
        }
    });
});
