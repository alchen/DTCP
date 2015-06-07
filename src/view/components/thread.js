'use strict';

var ipc = require('ipc');
var Vue = require('vue');
var detectViewport = require('../directives/detectViewport');
Vue.use(detectViewport);
require('./fatTweet');
require('./tweet');

var template = '<ul class="thread timeline">'
    + '<component is="tweet" v-repeat="pretext"  username="{{ username }}" now="{{ now }}" track-by="id" v-transition="keepScroll"></component>'
    + '<component is="fatTweet" v-repeat="[threadbase]" username="{{ username }}" now="{{ now }}"></component>'
    + '<component is="tweet" v-repeat="replies"  username="{{ username }}" now="{{ now }}" track-by="id"></component>'
  + '</ul>';

var Thread = Vue.extend({
  props: ['threadbase', 'username', 'now'],
  events: {
    showThread: function (tweet) {
      this.pretext = [];
      this.replies = [];
      this.threadbase = tweet;
      this.findContext();
      return false;
    },
    newPrecontext: function (tweets) {
      this.pretext = tweets;
      return false;
    },
    newPostcontext: function (tweets) {
      this.replies = tweets;
      return false;
    }
  },
  methods: {
    findContext: function () {
      var id, inReplyTo;
      var tweet = this.threadbase.retweet || this.threadbase;
      id = tweet.id;
      inReplyTo = tweet.inReplyTo;

      ipc.send('findContext', id, inReplyTo);
    }
  },
  compiled: function () {
    this.findContext();
  },
  data: function () {
    return {
      pretext: [],
      replies: []
    };
  },
  template: template,
  transitions: {
    keepScroll: {
      enter: function (el, done) {
        var timelineEl = document.getElementsByClassName('thread')[0];
        timelineEl.scrollTop += el.scrollHeight;
        done();
      }
    },
    scrollTo: {
      enter: function (el, done) {
        // el.scrollIntoViewIfNeeded()
        done();
      }
    },
  }
});

Vue.component('thread', Thread);

module.exports = Thread;
