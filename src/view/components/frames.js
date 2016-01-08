/*jslint browser:true*/
'use strict';

var _ = require('lodash');
var ipc = require('electron').ipcRenderer;
var Vue = require('vue');
require('../../view/components/profile');
require('../../view/components/timeline');
require('../../view/components/thread');
require('../../view/components/messages');
require('../../view/components/switches');
require('../../view/components/login');

var template = '<section class="frames">' +
               '<div class="frame" v-for="frame in frames" :style="{ zIndex: ($index + 1) }" @scroll="scroll" transition="frame">' +
               '  <component' +
               '    :is="frame.is"' +
               '    :view="frame.view"' +
               '    :tweets="frame.tweets"' +
               '    :messages="frame.messages"' +
               '    :user="frame.profile"' +
               '    :base.sync="frame.base"' +
               '    :pretext.sync="frame.pretext"' +
               '    :replies.sync="frame.replies"' +
               '    :accounts="frame.accounts"' +
               '    :username="screenname"' +
               '    :now="now"' +
               '  ></component>' +
               '</div>' +
               '</section>';

var scrollSpeed = 180;

var Frames = Vue.extend({
  replace: true,
  template: template,
  props: ['frames', 'screenname', 'now'],
  computed: {
    topFrame: function () {
      return this.frames[this.frames.length - 1];
    }
  },
  events: {
    loadSince: function (sinceId) {
      ipc.send('loadSince', this.screenname, this.topFrame.view, sinceId);
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
        is: 'profileComponent',
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
        is: 'profileComponent',
        view: 'profile',
        profile: {screenname: screenname},
        tweets: []
      };
      this.pushFrame(newFrame);
      ipc.send('loadScreenname', this.screenname, screenname);
    },
    scrollToTop: function () {
      var top = 0;
      this.scrollTo(top);
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
        var tweetContainers = currentFrame.getElementsByClassName('tweetcontainer');
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
          this.scrollTo(currentFrame.scrollTop + nextContainer.getBoundingClientRect().top - currentFrame.offsetTop);
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
        var tweetContainers = currentFrame.getElementsByClassName('tweetcontainer');
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
          this.scrollTo(currentFrame.scrollTop + nextContainer.getBoundingClientRect().top - currentFrame.offsetTop);
        }
      }
    }
  },
  methods: {
    scrollTo: function (destination, speed) {
      var self = this;
      var startTime = now();
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      var sy = currentFrame.scrollTop;
      speed = typeof speed !== 'undefined' ? speed : scrollSpeed;

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
        return 0.5 * (1 - Math.cos(Math.PI * k));
      }

      // scroll looping over a frame
      function step() {
        var time = now();
        var value;
        var cy;
        var elapsed = (time - startTime) / speed;

        // avoid elapsed times higher than one
        elapsed = elapsed > 1 ? 1 : elapsed;

        value = ease(elapsed);
        cy = sy + (destination - sy) * value;

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
      if (this.frames.length === 1 && event.target.scrollTop === 0 && (this.topFrame.view === 'home' || this.topFrame.view === 'mentions')) {
        this.$dispatch('rewind');
      }
    }
  }
});

Vue.component('frames', Frames);

module.exports = Frames;
