/*jslint browser:true*/
'use strict';

var ipc = require('electron').ipcRenderer;
var Vue = require('vue');
var _ = require('lodash');

Vue.config.debug = process.env.NODE_ENV !== 'production';
Vue.config.strict = true;

var newPreferencePane = new Vue({
  el: 'html',
  data: {
    saveLastTweet: false,
    fontSize: 16,
    muteVideo: false,
    changed: false
  },
  methods: {
    save: function () {
      this.changed = false
    }
  },
  compiled: function () {
    var self = this;
    ipc.send('getSaveLastTweet');
    ipc.send('getFontSize');
    ipc.send('getMuteVideo');

    ipc.on('saveLastTweet', function (event, saveLastTweet) {
      self.saveLastTweet = saveLastTweet;

      self.$watch('saveLastTweet', function () {
        ipc.send('setSaveLastTweet', self.saveLastTweet);
      });
    });

    ipc.on('fontSize', function (event, fontSize) {
      self.fontSize = fontSize;

      self.$watch('fontSize', function () {
        ipc.send('setFontSize', self.fontSize);
      });
    });

    ipc.on('muteVideo', function (event, muteVideo) {
      self.muteVideo = muteVideo;

      self.$watch('muteVideo', function () {
        ipc.send('setMuteVideo', self.muteVideo);
      });
    });
  }
});
