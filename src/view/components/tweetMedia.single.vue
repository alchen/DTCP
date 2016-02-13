<style lang="sass">
@import '../assets/const';
.tweetmedia {
  margin-top: $tweet-internal-margin-top;
  width: 100%;
  padding-bottom: calc(66% + 1rem);
  position: relative;

  @at-root .tweetmediaimage {
    flex-grow: 1;
    width: calc(50% - .5rem);
    height: calc(50% - .5rem);
    border-radius: .25rem;
    border: 1px solid #f0f0f0;
    margin: .25rem;
    cursor: pointer;
    overflow: hidden;

    img {
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
  }

  &.one .tweetmediaimage {
    width: auto;
    height: auto;
  }

  &.two {
    padding-bottom: calc(50% + .5rem);

    .tweetmediaimage {
      height: calc(100% - .5rem);
    }
  }

  &.three .tweetmediaimage:first-child {
    height: calc(100% - .5rem);
  }
}

.inflatecontainer {
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
}
</style>

<template lang="html">
  <section class="tweetmedia" :class="{ one: media.length === 1, two: media.length === 2, three: media.length === 3, four: media.length === 4}">
    <div class="inflatecontainer">
      <picture class="tweetmediaimage" v-for="image in media" @click="debouncedClick($index)">
        <source :srcset="image.url" media="(min-width: 400px)" />
        <img  :src="image.url + ':small'" />
      </picture>
    </div>
  </section>
</template>

<script>
'use strict';

var _ = require('lodash');
var Vue = require('vue');
var ipc = require('electron').ipcRenderer;
require('./tweetMedia.single.vue');

var TweetMedia = Vue.extend({
  replace: true,
  props: ['media'],
  methods: {
    debouncedClick: function (index) {
      if (!this._debouncedClick) {
        this._debouncedClick = _.debounce(this.leftClick, 500, {
          'leading': true,
          'trailing': false
        });
      }
      this._debouncedClick(index);
    },
    leftClick: function (index) {
      var media = _.map(this.media, function (m) {
        return _.cloneDeep(m);
      });
      ipc.send('showViewer', media, index);
    }
  }
});

Vue.component('tweetMedia', TweetMedia);

module.exports = TweetMedia;
</script>
