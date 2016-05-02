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
      resizeViewer: function () {
        var width = Math.max(this.media[this.index].size.width || 320, 144);
        var height = Math.max(this.media[this.index].size.height || 240, 100);
        ipc.send('resizeViewer', width, height);
      },
      next: function () {
        this.index = (this.index + 1) % this.media.length;
        this.currentView = null;
        this.resizeViewer();
        this.$nextTick(function () {
          this.currentView = this.media[this.index];
        });
      },
      back: function () {
        var length = this.media.length;
        this.index = (((this.index - 1) % length) + length) % length;
        this.currentView = null;
        this.resizeViewer();
        this.$nextTick(function () {
          this.currentView = this.media[this.index];
        });
      }
    },
    compiled: function () {
      var self = this;
      this.currentView = this.media[this.index];

      document.onkeydown = function (event) {
        if (event.keyCode === 27) { // Backspace or ESC
          ipc.send('dismiss');
        } else if (event.keyCode === 72 || event.keyCode === 37 || event.keyCode === 75 || event.keyCode === 38) { // h or left or k or up
          self.back();
        } else if (event.keyCode === 74 || event.keyCode === 40 || event.keyCode === 76 || event.keyCode === 39) { // j or down or l or right
          self.next();
        } else if (event.keyCode === 32) {
          if (event.shiftKey) {
            self.back();
          } else {
            self.next();
          }
        }

        switch (event.keyCode) {
          case 27:
          case 72:
          case 74:
          case 75:
          case 76:
          case 37:
          case 38:
          case 39:
          case 40:
          case 32:
            event.preventDefault();
            break;
          default:
            break;
        }
      };
    }
  });
});
