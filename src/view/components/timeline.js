'use strict';

var Vue = require('Vue');
var detectViewport = require('../directives/detectViewport');
Vue.use(detectViewport);
require('./tweet');

var scrollStep = 100;

var template = '<ul class="tweets timeline" v-on="scroll: scroll">'
    + '<li class="tweetcontainer" v-repeat="tweets | throttle" v-component="tweet" username="{{ username }}" now="{{ now }}" track-by="id" v-transition="keepScroll"></li>'
    + '<div class="loader loader-inner ball-clip-rotate" on-viewport="loadMore" v-detect-viewport><div></div></div>'
  + '</ul>';

var Timeline = Vue.extend({
  paramAttributes: ['tweets', 'username', 'now'],
  filters: {
    throttle: function (tweets) {
      return tweets.slice(0, this.scrollLength);
    }
  },
  events: {
    'viewportenter': function () {
      this.scrollLength = this.scrollLength + scrollStep;
      if (this.scrollLength >= this.tweets.length) {
        this.$dispatch('loadMore');
      }
    },
    'hook:detached': function () {
      this.scrollLength = scrollStep;
    },
    rewind: function () {
      this.scrollLength = scrollStep;
      return false;
    }
  },
  data: function () {
    return { scrollLength: scrollStep };
  },
  template: template,
  methods: {
    scroll: function (event) {
      if (event.target.scrollTop === 0) {
        this.scrollLength = scrollStep;
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
      }
    }
  }
});

Vue.component('timeline', Timeline);

module.exports = Timeline;
