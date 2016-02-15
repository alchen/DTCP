'use strict';

var Vue = require('vue');
var ipc = require('electron').ipcRenderer;
require('../view/components/login.frame.vue');

var prompt = new Vue({
  el: '#content',
  events: {
    back: function () {
      ipc.send('verified');
    }
  }
});

module.exports = prompt;
