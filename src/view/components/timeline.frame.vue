<style lang="sass">
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
}

.loader {
  text-align: center;
  padding: 1.5rem;
  transition: all 1s;
}

.ball-clip-rotate > div {
  background-color: #fff;
  border-radius: 100%;
  -webkit-animation-fill-mode: both;
  border: 2px solid #000;
  border-bottom-color: transparent;
  height: 1.5rem;
  width: 1.5rem;
  background: transparent !important;
  display: inline-block;
  -webkit-animation: rotate 0.75s 0s linear infinite;
}

@keyframes rotate {
  0% {
    -webkit-transform: rotate(0deg) scale(1);
  }

  50% {
    -webkit-transform: rotate(180deg) scale(0.6);
  }

  100% {
    -webkit-transform: rotate(360deg) scale(1);
  }
}
</style>

<template lang="html">
  <ul class="timeline">
    <component is="tweetComponent" v-for="tweet in tweets" :tweet="tweet" :view="view" :username="username" :now="now" track-by="id"></component>
    <div class="loader loader-inner ball-clip-rotate box" v-detect-viewport><div></div></div>
  </ul>
</template>

<script>
'use strict';

var Vue = require('vue');
var detectViewport = require('../directives/detectViewport');
Vue.use(detectViewport);
require('./tweet.single.vue');

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
  methods: {
  },
  transitions: {
  }
});

Vue.component('timeline', Timeline);

module.exports = Timeline;
</script>
