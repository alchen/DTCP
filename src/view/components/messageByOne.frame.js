'use strict';

var Vue = require('vue');
var moment = require('moment');
require('./messageByOne.single');

var template = '<ul class="tweets timeline messagegroup">' +
  '<component is="message" v-for="message in reversedMessages" :message="message" :username="username" :now="now" track-by="id" />' +
  '</ul>';

var MessageGroup = Vue.extend({
  replace: true,
  props: ['messages', 'username', 'now', 'view'],
  template: template,
  filters: {
    at: function (name) {
      return '@' + name;
    }
  },
  computed: {
    reversedMessages: function () {
      return this.messages.slice().reverse();
    }
  },
  attached: function () {
    this.scrollToBottom();
  },
  methods: {
    scrollToBottom: function () {
      var frames = document.getElementsByClassName('frame');
      frames[frames.length - 1].getElementsByClassName('timeline')[0].scrollIntoView(false);
    },
    timeFrom: function (message) {
      var createdAt = moment(new Date(message.createdAt));
      var now = this.now;
      var duration = moment.duration(now.diff(createdAt));

      var sign = null;
      if ((sign = duration.as('second')) <= 5) {
        return 'now';
      } else if (sign < 60) {
        return Math.round(sign) + 's';
      } else if ((sign = duration.as('minute')) < 60) {
        return Math.round(sign) + 'm';
      } else if ((sign = duration.as('hour')) < 24) {
        return Math.round(sign) + 'h';
      } else if ((sign = duration.as('day')) <= 365) {
        return Math.round(sign) + 'd';
      } else {
        sign = duration.as('year');
        return Math.round(sign) + 'y';
      }
    },
    doShowProfile: function (user) {
      this.$dispatch('showProfile', user);
    },
    rightclick: function (event) {
      // TODO modify for direct messages
      // var menu = contextmenu.tweet(this);
      // menu.popup(remote.getCurrentWindow());
      // event.preventDefault();
    }
  }
});

Vue.component('messageGroup', MessageGroup);

module.exports = MessageGroup;
