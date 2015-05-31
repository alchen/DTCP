'use strict';

var _ = require('lodash');
var ipc = require('ipc');
var Tweet = require('../models/tweet');
var Vue = require('Vue');
var detectViewport = require('../directives/detectViewport');
Vue.use(detectViewport);
require('./tweet');

var template = '<ul class="thread timeline">'
    + '<li class="tweetcontainer" v-repeat="pretext" v-component="tweet" username="{{ username }}" now="{{ now }}" track-by="id" v-transition="keepScroll"></li>'
    + '<li class="tweetcontainer" v-with="threadbase" v-component="tweet" username="{{ username }}" now="{{ now }}"></li>'
    + '<li class="tweetcontainer" v-repeat="replies" v-component="tweet" username="{{ username }}" now="{{ now }}" track-by="id"></li>'
  + '</ul>';

var Thread = Vue.extend({
  paramAttributes: ['threadbase', 'username', 'now'],
  events: {
    newPrecontext: function (tweets) {
      this.pretext = tweets;
      return false;
    },
    newPostcontext: function (tweets) {
      this.replies = tweets;
      return false;
    }
  },
  compiled: function () {
    var id, inReplyTo;
    var tweet = this.threadbase.retweet || this.threadbase;
    id = tweet.id;
    inReplyTo = tweet.inReplyTo;

    ipc.send('findContext', id, inReplyTo);
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
    }
  }
});

Vue.component('thread', Thread);

module.exports = Thread;
