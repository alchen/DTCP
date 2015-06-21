'use strict';

var ipc = require('ipc');
var Vue = require('vue');
var detectViewport = require('../directives/detectViewport');
Vue.use(detectViewport);
require('./fatTweet');
require('./tweet');

var template = '<ul class="thread timeline">'
    + '<component is="tweet" v-repeat="tweet: pretext"  username="{{ username }}" now="{{ now }}" track-by="id" v-transition="keepScroll"></component>'
    + '<component is="fatTweet" tweet="{{ base }}" username="{{ username }}" now="{{ now }}"></component>'
    + '<component is="tweet" v-repeat="tweet: replies"  username="{{ username }}" now="{{ now }}" track-by="id"></component>'
  + '</ul>';

var Thread = Vue.extend({
  props: ['base', 'pretext', 'replies', 'username', 'now'],
  events: {
    showThread: function (tweet) {
      this.pretext = [];
      this.replies = [];
      this.base = tweet;
      this.findContext();
      return false;
    },
    newPretext: function (tweets) {
      this.pretext = tweets;
      return false;
    },
    newReplies: function (tweets) {
      this.replies = tweets;
      return false;
    }
  },
  methods: {
    findContext: function () {
      ipc.send('findContext', this.base.id);
    }
  },
  compiled: function () {
    this.findContext();
  },
  template: template,
  transitions: {
    keepScroll: {
      enter: function (el, done) {
        var timelineEl = document.getElementsByClassName('thread')[0];
        timelineEl.scrollTop += el.scrollHeight;
        done();
      },
      css: false
    },
    scrollTo: {
      enter: function (el, done) {
        // el.scrollIntoViewIfNeeded()
        done();
      },
      css: false
    },
  }
});

Vue.component('thread', Thread);

module.exports = Thread;
