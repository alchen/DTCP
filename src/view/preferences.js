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
    useProxy: false,
    proxyHost: '',
    proxyPort: '',
    fontSize: 16,
    changed: false
  },
  methods: {
    save: function () {
      ipc.send('setProxy', this.useProxy ? {
        host: this.proxyHost,
        port: this.proxyPort
      } : undefined);
      this.changed = false
    }
  },
  compiled: function () {
    var self = this;
    ipc.send('getProxy');
    ipc.send('getFontSize');

    ipc.on('proxy', function (event, proxyConfig) {
      if (proxyConfig) {
        self.useProxy = true;
        self.proxyHost = proxyConfig.host;
        self.proxyPort = proxyConfig.port;
      } else {
        self.useProxy = false;
      }

      var markChange = function () {
        self.changed = true;
      };
      self.$watch('useProxy', markChange);
      self.$watch('proxyHost', markChange);
      self.$watch('proxyPort', markChange);
    });

    ipc.on('fontSize', function (event, fontSize) {
      self.fontSize = fontSize;

      self.$watch('fontSize', function () {
        ipc.send('setFontSize', self.fontSize);
      });
    });
  }
});
