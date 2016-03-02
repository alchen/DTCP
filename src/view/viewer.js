/*jslint browser:true*/
'use strict';

var ipc = require('electron').ipcRenderer;
var Vue = require('vue');

Vue.config.debug = process.env.NODE_ENV !== 'production';
Vue.config.strict = true;

var newViewer;

ipc.on('pretext', function (event, media, index) {
  newViewer = new Vue({
    el: '#content',
    data: {
      media: media,
      index: index,
      currentView: undefined
    },
    methods: {
      imageLoaded: function () {
        console.log('loaded!');
      }
    },
    compiled: function () {
      this.currentView = this.media[this.index];
    }
  });
});
