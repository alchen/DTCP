<style lang="sass">
.frame-enter {
  -webkit-animation: slideInLeft .2s;
}
.frame-leave {
  -webkit-animation: slideOutRight .2s;
}
</style>

<template lang="html">
  <section class="frames">
    <div class="frame" v-for="frame in frames" :style="{ zIndex: ($index + 1) }" @scroll="scroll" transition="frame">
      <component
        :is="frame.is"
        :view="frame.view"
        :tweets="frame.tweets"
        :messages="frame.messages"
        :user="frame.profile"
        :base.sync="frame.base"
        :pretext.sync="frame.pretext"
        :replies.sync="frame.replies"
        :accounts="frame.accounts"
        :update="update"
        :username="screenname"
        :now="now"
      ></component>
    </div>
  </section>
</template>

<script>
/*jslint browser:true*/
'use strict';

var _ = require('lodash');
var ipc = require('electron').ipcRenderer;
var Vue = require('vue');
require('./profile.frame.vue');
require('./timeline.frame.vue');
require('./thread.frame.vue');
require('./messageByAll.frame.vue');
require('./messageByOne.frame.vue');
require('./switches.frame.vue');
require('./login.frame.vue');

var Frames = Vue.extend({
  replace: true,
  props: ['frames', 'screenname', 'now', 'update'],
  computed: {
    topFrame: function () {
      return this.frames[this.frames.length - 1];
    }
  },
  events: {
    loadMissing: function (sinceId) {
      ipc.send('loadMissing', this.screenname, this.topFrame.view, sinceId);
    },
    loadMore: function (maxId) {
      if (this.topFrame.view !== 'profile') {
        ipc.send('loadMore', this.screenname, this.topFrame.view, maxId);
      } else {
        ipc.send('loadUser', this.screenname, this.topFrame.profile.screenname, maxId);
      }
    },
    showSwitches: function (accounts) {
      var newFrame = {
        is: 'switches',
        view: 'switches',
        accounts: accounts
      };
      this.pushFrame(newFrame);
    },
    addAccount: function () {
      var newFrame = {
        is: 'login',
        view: 'login'
      };
      this.pushFrame(newFrame);
    },
    showMessageGroup: function (messageGroup) {
      var newFrame = {
        is: 'messageGroup',
        view: 'messageGroup',
        messages: messageGroup
      };
      this.pushFrame(newFrame);
    },
    showThread: function (threadbase) {
      var newFrame = {
        is: 'thread',
        view: 'thread',
        base: threadbase,
        pretext: [],
        replies: []
      };
      this.pushFrame(newFrame);
    },
    showProfile: function (user) {
      if (this.topFrame.profile &&
        this.topFrame.profile.screenname === user.screenname) {
        return;
      }
      var newFrame = {
        is: 'profile',
        view: 'profile',
        profile: user,
        tweets: []
      };
      this.pushFrame(newFrame);
    },
    showScreenname: function (screenname) {
      if (this.topFrame.profile &&
        this.topFrame.profile.screenname === screenname) {
        return;
      }
      var newFrame = {
        is: 'profile',
        view: 'profile',
        profile: {screenname: screenname},
        tweets: []
      };
      this.pushFrame(newFrame);
      ipc.send('loadScreenname', this.screenname, screenname);
    },
    scrollToBottom: function () {
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      var bottom = currentFrame.scrollHeight;
      this.scrollTo(bottom, 300);
    },
    scrollToTop: function () {
      var top = 0;
      this.scrollTo(top, 300);
    },
    scrollToNextTweet: function () {
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      var currentFrameRect = currentFrame.getBoundingClientRect();
      var nextContainer = null;

      var activeTweets = currentFrame.getElementsByClassName('activetweet');
      if (activeTweets.length === 1) {
        var activeTweet = activeTweets[0];
        nextContainer = activeTweet.nextElementSibling;

        if (nextContainer && !nextContainer.classList.contains('loader')) {
          activeTweet.classList.remove('activetweet');
          nextContainer.classList.add('activetweet');
        }
      } else {
        var tweetContainers = currentFrame.getElementsByClassName('box');
        nextContainer = _.find(tweetContainers, function (el) {
          return el.getBoundingClientRect().top >= currentFrameRect.top;
        });
        if (nextContainer) {
          nextContainer.classList.add('activetweet');
        }
      }

      if (nextContainer) {
        if (nextContainer.getBoundingClientRect().bottom >= currentFrameRect.bottom) {
          this.scrollTo(currentFrame.scrollTop  + nextContainer.getBoundingClientRect().bottom - currentFrameRect.bottom);
        } else if (nextContainer.getBoundingClientRect().top <= currentFrameRect.top) {
          this.scrollTo(currentFrame.scrollTop + nextContainer.getBoundingClientRect().top - currentFrameRect.top);
        }
      }
    },
    scrollToPreviousTweet: function () {
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      var currentFrameRect = currentFrame.getBoundingClientRect();
      var nextContainer = null;

      var activeTweets = currentFrame.getElementsByClassName('activetweet');
      if (activeTweets.length === 1) {
        var activeTweet = activeTweets[0];
        nextContainer = activeTweet.previousElementSibling;

        if (nextContainer) {
          activeTweet.classList.remove('activetweet');
          nextContainer.classList.add('activetweet');
        }
      } else {
        var tweetContainers = currentFrame.getElementsByClassName('box');
        nextContainer = _.find(tweetContainers, function (el) {
          return el.getBoundingClientRect().top >= currentFrameRect.top;
        });
        if (nextContainer) {
          nextContainer.classList.add('activetweet');
        }
      }

      if (nextContainer) {
        if (nextContainer.getBoundingClientRect().bottom >= currentFrameRect.bottom) {
          this.scrollTo(currentFrame.scrollTop  + nextContainer.getBoundingClientRect().bottom - currentFrameRect.bottom);
        } else if (nextContainer.getBoundingClientRect().top <= currentFrameRect.top) {
          this.scrollTo(currentFrame.scrollTop + nextContainer.getBoundingClientRect().top - currentFrameRect.top);
        }
      } else {
        this.scrollTo(0); // scroll to top
      }
    },
    scrollPageDown: function () {
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      this.scrollTo(currentFrame.scrollTop + currentFrame.getBoundingClientRect().height * 0.9, 300);
    },
    scrollPageUp: function () {
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      this.scrollTo(currentFrame.scrollTop - currentFrame.getBoundingClientRect().height * 0.9, 300);
    }
  },
  methods: {
    scrollTo: function (destination, speed) {
      var self = this;
      var startTime = now();
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      var sy = currentFrame.scrollTop;
      var changed = false;

      // cancel frame is there is an scroll event happening
      if (this.animation) {
        window.cancelAnimationFrame(this.animation);
      }

      function now() {
        if (window.performance !== undefined && window.performance.now !== undefined) {
          return window.performance.now();
        }

        return Date.now();
      }

      function ease(k) {
        return Math.sin(k * Math.PI / 2);
      }

      // scroll looping over a frame
      function step() {
        var time = now();
        var value;
        var cy;
        var elapsed = (time - startTime) / speed;

        // avoid elapsed times higher than one
        elapsed = elapsed > 1 ? 1 : elapsed;

        var threshold = 96;
        if (speed || changed || elapsed == 1 || Math.abs(destination - sy) < threshold) {
          elapsed = (time - startTime) / (speed || threshold);
          elapsed = elapsed > 1 ? 1 : elapsed;
          value = ease(elapsed);
          cy = sy + (destination - sy) * value;
        } else {
          cy = sy + Math.sign(destination - sy) * (time - startTime) * 2;

          if ((destination > sy && cy > destination) || (destination < sy && cy < destination)) {
            cy = destination;
          }

          if (!changed && Math.abs(destination - cy) < threshold) {
            startTime = now();
            sy = currentFrame.scrollTop;
            changed = true;
          }
        }

        currentFrame.scrollTop = Math.floor(cy);

        // return if end points have been reached
        if (cy === destination) {
          sy = startTime = null;
          window.cancelAnimationFrame(self.animation);
          return;
        }

        self.animation = window.requestAnimationFrame(step);
      }

      this.animation = window.requestAnimationFrame(step);
    },
    pushFrame: function (newFrame) {
      var switched = _.find(this.frames, function (frame) {
        return frame.is === 'switches';
      });

      if ((newFrame.base && newFrame.base !== this.topFrame.base) ||
        (newFrame.profile && newFrame.profile !== this.topFrame.profile) ||
        (newFrame.is === 'switches' && !switched) ||
        (newFrame.is !== 'switches' && newFrame.view !== this.topFrame.view)) {
        this.frames.push(newFrame);
      }
    },
    scroll: function (event) {
      // TODO: Add a debounced check for activetweet visibility
      this.userScrollHandler();
      if (this.frames.length === 1 && event.target.scrollTop === 0 && (this.topFrame.view === 'home' || this.topFrame.view === 'mentions')) {
        this.$dispatch('rewind');
      }
    }
  },
  compiled: function () {
    this.userScrollHandler = _.debounce(function () {
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      var currentFrameRect = currentFrame.getBoundingClientRect();
      var activeTweets = currentFrame.getElementsByClassName('activetweet');

      if (activeTweets.length > 0) {
        var activeTweet = activeTweets[0];
        var tweetRect = activeTweet.getBoundingClientRect();
        if (!((Math.floor(tweetRect.top) >= Math.floor(currentFrameRect.top) && Math.floor(tweetRect.top) <= Math.floor(currentFrameRect.bottom)) ||
              (Math.floor(tweetRect.bottom) >= Math.floor(currentFrameRect.top) && Math.floor(tweetRect.bottom) <= Math.floor(currentFrameRect.bottom)))) {
          activeTweet.classList.remove('activetweet');
        }
      }
    }, 500);
  }
});

Vue.component('frames', Frames);

module.exports = Frames;
</script>
