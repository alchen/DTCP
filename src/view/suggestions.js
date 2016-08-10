/*jslint browser:true*/
'use strict';

var ipc = require('electron').ipcRenderer;
var Vue = require('vue');

Vue.config.debug = process.env.NODE_ENV !== 'production';
Vue.config.strict = true;

var suggestions = new Vue({
  el: '#content',
  data: {
    activeIndex: 0,
    users: []
  },
  methods: {
    setActive: function (event) {
      var index = event.currentTarget.getAttribute('data-index');
      this.activeIndex = index;
    },
    select: function (event) {
      var index = event.currentTarget.getAttribute('data-index');
      ipc.send('giveSuggestion', this.users[index].screenname);
    }
  },
  compiled: function () {
    var self = this;
    ipc.on('setSuggestions', function (event, users) {
      self.users = users;
    });
  }
});
