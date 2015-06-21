'use strict';

var Vue = require('vue');
var detectViewport = require('../directives/detectViewport');
Vue.use(detectViewport);
require('./tweet');

var defaultLength = 50;

var template = '<ul class="tweets timeline" v-on="scroll: scroll">'
    + '<component is="tweet" v-repeat="tweet: tweets" username="{{ username }}" now="{{ now }}" track-by="id" v-transition="keepScroll"></component>'
    + '<div class="loader loader-inner ball-clip-rotate" v-detect-viewport><div></div></div>'
  + '</ul>';

var Timeline = Vue.extend({
  replace: true,
  props: ['tweets', 'username', 'now'],
  events: {
    'viewportenter': function (el) {
      el.style.height = 'auto';
      var oldestTweet = this.tweets[this.tweets.length - 1];
      this.$dispatch('loadMore',  oldestTweet ? oldestTweet.id : undefined);
      this.loaderTimer = setTimeout(function () {
        el.style.opacity = '0';
      }, 1 * 1000);
    },
    'viewportleave': function (el) {
      clearTimeout(this.loaderTimer);
      el.style.opacity = '1';
    },
    'hook:detached': function () {
      this.rewind();
    }
  },
  template: template,
  methods: {
    rewind: function () {
      this.tweets = this.tweets.slice(0, defaultLength);
    },
    scroll: function (event) {
      if (event.target.scrollTop < 64) {
        this.rewind();
      }
    }
  },
  transitions: {
    keepScroll: {
      enter: function (el, done) {
        var timelineEl = document.getElementsByClassName('timeline')[0];
        if (el.offsetTop < 64 && timelineEl.scrollTop >= 64) {
          timelineEl.scrollTop += el.scrollHeight;
        }
        done();
      },
      css: false
    }
  }
});

Vue.component('timeline', Timeline);

module.exports = Timeline;
