'use strict';

const Vue = require('vue');
const shell = require('electron').shell;
const app = require('electron').remote.app;

var page = new Vue({
  el: '#content',
  data: {
    name: app.getName(),
    version: app.getVersion()
  },
  methods: {
    openWebsite: function () {
      shell.openExternal('http://lab704.com/dtcp');
    },
    openGithub: function () {
      shell.openExternal('https://github.com/alchen/dtcp');
    }
  }
});

module.exports = page;
