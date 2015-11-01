'use strict';

var ipc = require('ipc');
var Vue = require('vue');
var detectViewport = require('../directives/detectViewport');
Vue.use(detectViewport);
require('./fatTweet');
require('./tweet');

var template = '<ul class="thread timeline">' +
    '<component is="tweetComponent" v-for="tweet in pretext" :tweet="tweet" :username="username" :now="now" track-by="id"></component>' +
    '<component is="fatTweet" :tweet="base" :username="username" :now="now"></component>' +
    '<component is="tweetComponent" v-for="tweet in replies"  :username="username" :now="now" track-by="id"></component>' +
  '</ul>';

var Thread = Vue.extend({
  props: ['base', 'pretext', 'replies', 'username', 'now'],
  events: {
    showThread: function (tweet) {
      if (tweet.id !== this.base.id) {
        this.pretext = [];
        this.replies = [];
        this.base = tweet;
        this.findContext();
      }
      return false;
    },
    newPretext: function (tweets) {
      if (tweets.length && tweets[tweets.length - 1].id === this.base.inReplyTo) {
        this.pretext = tweets;
        this.$nextTick(this.scrollToFat);
      }
      return false;
    },
    newReplies: function (tweets) {
      if (tweets.length && tweets[0].inReplyTo === this.base.id) {
        this.replies = tweets;
      }
      return false;
    }
  },
  methods: {
    findContext: function () {
      ipc.send('findContext', this.base.id);
    },
    scrollToFat: function () {
      var el = document.getElementsByClassName('fattweet')[0];
      if (el) {
        el.scrollIntoViewIfNeeded();
      }
    }
  },
  compiled: function () {
    this.findContext();
  },
  attached: function () {
    this.scrollToFat();
  },
  template: template,
  transitions: {
  }
});

Vue.component('thread', Thread);

module.exports = Thread;
