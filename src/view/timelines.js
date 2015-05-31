'use strict';

var notifier = require('node-notifier');
var ipc = require('ipc');
var Vue = require('Vue');
require('../view/components/timeline');
require('../view/components/thread');
var Tweet = require('../view/models/tweet');
var _ = require('lodash');
var moment = require('moment');

var timelines;

ipc.on('initialLoad', function (data) {
  var home = _.map(data.home, function (tweet) {
    return new Tweet(tweet);
  });
  var mentions = _.map(data.mentions, function (tweet) {
    return new Tweet(tweet);
  });
  var screenName = data.screenName;

  timelines = new Vue({
    el: '#content',
    events: {
      loadMore: function () {
        ipc.send('loadMore', this.currentView);
      },
      showThread: function (threadbase) {
        this.nest = true;
        this.threadbase = threadbase;
      }
    },
    data: {
      screenName: screenName,
      tweets: {
        home: home,
        mentions: mentions
      },
      currentView: 'home',
      nest: false,
      now: moment()
    },
    methods: {
      back: function () {
        this.nest = false;
        this.threadbase = null;
      },
      changeTimeline: function (timeline) {
        if (this.currentView === timeline) {
          this.scrollToTop();
        } else {
          this.currentView = timeline;
        }
      },
      notify: function (timeline, tweet) {
        if (timeline === 'mentions') {
          notifier.notify({
            title: 'Mention from ' + tweet.user.screen_name,
            message: tweet.text,
            sound: false, // Only Notification Center or Windows Toasters
            wait: false // wait with callback until user action is taken on notification
          });
        }
      },
      scrollToTop: function () {
        var target = document.getElementsByClassName('timeline')[0];
        var duration = 210;
        var animationDelay = 30;
        var scrollHeight = target.scrollTop;
        var scrollStep = scrollHeight / (duration / animationDelay);

        function step() {
          setTimeout(function () {
            if (target.scrollTop > scrollStep) {
              target.scrollTop -= scrollStep;
              requestAnimationFrame(step);
            } else {
              target.scrollTop = 0;
            }
          }, animationDelay);
        }

        // Set things in motion
        requestAnimationFrame(step); 
      }
    },
    components: {
      home: {
        paramAttributes: ['tweets', 'username', 'now'],
        template: '<div v-component="timeline" tweets="{{tweets.home}}" username="{{username}}" now="{{now}}"></div>'
      },
      mentions: {
        paramAttributes: ['tweets', 'username', 'now'],
        template: '<div v-component="timeline" tweets="{{tweets.mentions}}" username="{{username}}" now="{{now}}"></div>'
      }
    },
    compiled: function () {
      var self = this;
      setInterval(function () {
        self.now = moment();
      }, 60 * 1000);

      ipc.on('newTweet', function (timeline, tweet) {
        console.log('Renderer: newTweet on ' + timeline);
        self.now = moment();
        self.tweets[timeline].unshift(new Tweet(tweet));
        self.notify(timeline, tweet);
      });

      ipc.on('newTweets', function (timeline, tweets) {
        if (!tweets || !tweets.length) {
          return;
        }
        console.log('Renderer: newTweets on ' + timeline);
        self.now = moment();
        self.tweets[timeline] = _.map(tweets, function (tweet) {
          return new Tweet(tweet);
        });
      });

      ipc.on('newPrecontext', function (tweets) {
        tweets = _.map(tweets, function (tweet) {
          return new Tweet(tweet);
        });
        self.$broadcast('newPrecontext', tweets);
      });

      ipc.on('newPostcontext', function (tweets) {
        tweets = _.map(tweets, function (tweet) {
          return new Tweet(tweet);
        });
        self.$broadcast('newPostcontext', tweets);
      });
    }
  });
});

ipc.send('initialLoad');
