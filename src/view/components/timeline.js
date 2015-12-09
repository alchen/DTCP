'use strict';

var Vue = require('vue');
var detectViewport = require('../directives/detectViewport');
Vue.use(detectViewport);
require('./tweet');

var template = '<ul class="tweets timeline">' +
    '<component is="tweetComponent" v-for="tweet in tweets" :tweet="tweet" :view="view" :username="username" :now="now" track-by="id"></component>' +
    '<div class="loader loader-inner ball-clip-rotate" v-detect-viewport><div></div></div>' +
  '</ul>';

var Timeline = Vue.extend({
  replace: true,
  props: ['tweets', 'username', 'now', 'view'],
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
    }
  },
  template: template,
  methods: {
  },
  transitions: {
  }
});

Vue.component('timeline', Timeline);

module.exports = Timeline;
