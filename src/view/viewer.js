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
      loadMedia: function () {
        var self = this;
        var img = new Image();
        img.addEventListener('load', function () {
          ipc.send('resizeViewer', img.naturalWidth, img.naturalHeight);
          img = null;

          self.$nextTick(function () {
            self.currentView = self.media[self.index];
          });
        }, false);
        img.src = this.media[this.index];
      }
    },
    compiled: function () {
      this.loadMedia();
    }
  });
});
