'use strict';

var notifier = require('node-notifier');
var ipc = require('ipc');
var Vue = require('vue');
require('../view/components/profile');
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
        if (this.currentNest !== 'userProfile') {
          ipc.send('loadMore', this.currentView);
        } else {
          ipc.send('loadUser', this.profile.user.screenName);
        }
      },
      showThread: function (threadbase) {
        console.log('Timeline: show thread');
        this.nest = true;
        this.currentNest = 'thread';
        this.threadbase = threadbase;
      },
      showProfile: function (user) {
        console.log('Timeline: show profile');
        this.nest = true;
        this.currentNest = 'userProfile';
        this.profile.user = user;
        this.profile.tweets = [];
      }
    },
    data: {
      screenName: screenName,
      tweets: {
        home: home,
        mentions: mentions,
      },
      profile: {
        user: {},
        tweets: []
      },
      currentView: 'home',
      currentNest: null,
      nest: false,
      now: moment()
    },
    methods: {
      compose: function () {
        ipc.send('compose');
      },
      back: function () {
        this.nest = false;
        this.currentNest = null;
      },
      changeTimeline: function (timeline) {
        this.back();
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
            sound: false,
            wait: false,
            // TODO: Should show main window after gaining focus
            activate: 'com.lab704.dtcp'
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
        inherit: true,
        template: '<component is="timeline" tweets="{{tweets.home}}" username="{{screenName}}" now="{{now}}"></component>'
      },
      mentions: {
        inherit: true,
        template: '<component is="timeline" tweets="{{tweets.mentions}}" username="{{screenName}}" now="{{now}}"></component>'
      },
      userProfile: {
        props: ['profile', 'tweets', 'username', 'now', 'user'],
        template: '<component is="profile" tweets="{{profile.tweets}}" user="{{profile.user}}" username="{{username}}" now="{{now}}"></component>'
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

      ipc.on('newUserTweets', function (screenName, tweets) {
        if (!tweets || !tweets.length) {
          return;
        }
        console.log('Renderer: newUserTweets on ' + screenName);
        self.now = moment();
        self.profile.tweets = _.map(tweets, function (tweet) {
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
