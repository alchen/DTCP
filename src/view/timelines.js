'use strict';

var notifier = require('node-notifier');
var ipc = require('ipc');
var _ = require('lodash');
var Vue = require('vue');
require('../view/components/profile');
require('../view/components/timeline');
require('../view/components/thread');
var moment = require('moment');

var timelines;

ipc.on('initialLoad', function (screenname) {
  timelines = new Vue({
    el: '#content',
    events: {
      loadMore: function (maxId) {
        if (this.currentNest !== 'showProfile') {
          ipc.send('loadMore', this.currentView, maxId);
        } else {
          ipc.send('loadUser', this.profile.screenname, maxId);
        }
      },
      showThread: function (threadbase) {
        this.nest = true;
        this.currentNest = 'showThread';
        this.thread.base = threadbase;
      },
      showProfile: function (user) {
        this.nest = true;
        this.currentNest = 'showProfile';
        this.profile = user;
        this.tweets.profile = [];
      },
      showScreenname: function (screenname) {
        this.nest = true;
        this.currentNest = 'showProfile';
        this.profile = {screenname: screenname};
        this.tweets.profile = [];
        ipc.send('loadScreenname', screenname);
      }
    },
    data: {
      screenname: screenname,
      tweets: {
        home: [],
        mentions: [],
        profile: [],
        pretext: [],
        replies: []
      },
      thread: {
      },
      profile: {},
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
            title: 'Mention from ' + tweet.user.screenname,
            message: tweet.rawStatus,
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
      },
      mergeTweet: function (dstTweet, srcTweet) {
        _.assign(dstTweet, srcTweet);
      },
      addTweet: function (target, tweet, push) {
        var self = this;

        _.each(this.tweets, function (timeline, name) {
          var oldTweet = _.find(timeline, function (old) {
            return old.id === tweet.id;
          });

          if (name !== target && oldTweet) {
            self.mergeTweet(oldTweet, tweet);
          } else if (name === target) {
            if (oldTweet) {
              self.mergeTweet(oldTweet, tweet);
            } else if (push) {
              self.tweets[target].push(tweet);
            } else {
              self.tweets[target].unshift(tweet);
            }
          }
        });
      },
      updateTweet: function (tweet) {
        var self = this;
        _.each(this.tweets, function (timeline) {
          var oldTweet = _.find(timeline, function (old) {
            return old.id === tweet.id;
          });

          if (oldTweet) {
            self.mergeTweet(oldTweet, tweet);
          }
        });
      },
      deleteTweet: function (tweetId) {
        _.each(this.tweets, function (timeline) {
          var index = _.findIndex(timeline, function (old) {
            return old.id === tweetId;
          });

          if (index !== -1) {
            timeline.$remove(index);
          }
        });
      }
    },
    components: {
      home: {
        inherit: true,
        template: '<component is="timeline" tweets="{{@ tweets.home}}" username="{{screenname}}" now="{{now}}"></component>'
      },
      mentions: {
        inherit: true,
        template: '<component is="timeline" tweets="{{@ tweets.mentions}}" username="{{screenname}}" now="{{now}}"></component>'
      },
      showProfile: {
        inherit: true,
        template: '<component is="profile" tweets="{{@ tweets.profile}}" user="{{profile}}" username="{{screenname}}" now="{{now}}"></component>'
      },
      showThread: {
        inherit: true,
        template: '<component is="thread" base="{{@ thread.base}}" pretext="{{@ tweets.pretext}}" replies="{{@ tweets.replies}}" username="{{screenname}}" now="{{now}}"></component>'
      }
    },
    compiled: function () {
      var self = this;
      setInterval(function () {
        self.now = moment();
      }, 60 * 1000);

      ipc.on('deleteTweet', function (tweetId) {
        self.now = moment();
        self.deleteTweet(tweetId);
      });

      ipc.on('updateTweet', function (tweet) {
        self.now = moment();
        self.updateTweet(tweet);
      });

      ipc.on('newTweet', function (timeline, tweet) {
        self.now = moment();
        self.addTweet(timeline, tweet);
        self.notify(timeline, tweet);
      });

      ipc.on('newTweets', function (timeline, tweets) {
        if (!tweets || !tweets.length) {
          return;
        }
        self.now = moment();
        _.each(tweets, function (tweet) {
          self.addTweet(timeline, tweet, true);
        });
      });

      ipc.on('newProfileUser', function (user) {
        self.now = moment();
        self.profile = user;
      });

      ipc.on('newProfile', function (user, tweets) {
        self.now = moment();
        self.profile = user;
        self.tweets.profile = self.tweets.profile.concat(tweets);
      });

      ipc.on('newPretext', function (tweets) {
        self.$broadcast('newPretext', tweets);
      });

      ipc.on('newReplies', function (tweets) {
        self.$broadcast('newReplies', tweets);
      });
    }
  });
});

ipc.send('initialLoad');
