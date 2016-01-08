'use strict';

var Vue = require('vue');
require('./messageTop');

var template = '<ul class="tweets timeline">' +
    '<component is="messageTop" v-for="group in messages" :group="group.messages" :username="username" :now="now" track-by="id"></component>' +
    '<div class="loader loader-inner ball-clip-rotate tweetcontainer" v-if="messages.length === 0"><div></div></div>' +
  '</ul>';

var Messages = Vue.extend({
  replace: true,
  props: ['messages', 'username', 'now', 'view'],
  events: {
  },
  template: template,
  methods: {
  },
  transitions: {
  }
});

Vue.component('messages', Messages);

module.exports = Messages;
