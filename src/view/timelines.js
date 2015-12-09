/*jslint browser:true*/
'use strict';

var notifier = require('node-notifier');
var ipc = require('electron').ipcRenderer;
var _ = require('lodash');
var Vue = require('vue');
require('../view/components/profile');
require('../view/components/timeline');
require('../view/components/thread');
var moment = require('moment');

Vue.config.debug = true;
Vue.config.strict = true;

var timelines;
var defaultLength = 50;

ipc.on('initialLoad', function (event, screenname) {
  timelines = new Vue({
    el: '#content',
    computed: {
      topFrame: function () {
        return this.frames[this.frames.length - 1];
      }
    },
    events: {
      loadSince: function (sinceId) {
        ipc.send('loadSince', this.topFrame.view, sinceId);
      },
      loadMore: function (maxId) {
        if (this.topFrame.view !== 'profile') {
          ipc.send('loadMore', this.topFrame.view, maxId);
        } else {
          ipc.send('loadUser', this.topFrame.profile.screenname, maxId);
        }
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
        ipc.send('loadScreenname', screenname);
      }
    },
    created: function () {
      this.frames.push({
        is: 'timeline',
        view: 'home',
        tweets: this.tweets.home
      });
    },
    data: {
      frames: [],
      screenname: screenname,
      tweets: {
        home: [],
        mentions: []
      },
      users: {},
      now: moment()
    },
    methods: {
      pushFrame: function (newFrame) {
        if ((newFrame.base && newFrame.base !== this.topFrame.base) ||
          (newFrame.profile && newFrame.profile !== this.topFrame.profile)) {
          this.frames.push(newFrame);
        }
      },
      scroll: function (event) {
        if (event.target.scrollTop === 0 &&
          (this.topFrame.view === 'home' ||
          this.topFrame.view === 'mentions')) {
          this.rewind(this.topFrame.view);
        }
      },
      rewind: function () {
        var bottomFrame = this.frames[0];
        var timeline = bottomFrame.view;
        this.tweets[timeline] = this.tweets[timeline].slice(0, defaultLength);
        bottomFrame.tweets = this.tweets[timeline];
      },
      popTweet: function (timeline) {
        return this.tweets[timeline].pop();
      },
      compose: function () {
        ipc.send('compose');
      },
      back: function () {
        if (this.frames.length > 1) {
          this.frames.pop();
        }
      },
      changeTimeline: function (timeline) {
        if (this.frames.length === 1 && this.frames[0].view === timeline) {
          this.scrollToTop();
        } else if (this.topFrame.view !== timeline) {
          this.rewind();
          this.frames = [{
            is: 'timeline',
            view: timeline,
            tweets: this.tweets[timeline]
          }];
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
      scrollTo: function (destination, speed) {
        var self = this;
        var frames = document.getElementsByClassName('frame');
        var currentFrame = frames[frames.length - 1];
        var delay = 16;
        speed = typeof speed !== 'undefined' ? speed : 300;

        var easing = function (time) {
          return time < 0.5 ?
           8 * time * time * time * time :
           1 - 8 * (--time) * time * time * time;
        };

        var startLocation = currentFrame.scrollTop;
        var distance = destination - startLocation;
        var timeLapsed = 0;
        var percentage;
        var position;

        var step = function () {
          timeLapsed += 16;
          percentage = (timeLapsed / speed);
          percentage = (percentage > 1) ? 1 : percentage;
          position = startLocation + (distance * easing(percentage));
          window.requestAnimationFrame(function () {
            currentFrame.scrollTop = Math.floor(position);
          });
          if (currentFrame.scrollTop === destination) {
            clearInterval(self.animation);
          }
        };
        clearInterval(self.animation);
        this.animation = setInterval(step, delay);
      },
      scrollToTop: function () {
        var top = 0;
        this.scrollTo(top);
      },
      scrollToNextTweet: function () {
        var frames = document.getElementsByClassName('frame');
        var currentFrame = frames[frames.length - 1];
        var tweetContainers = currentFrame.getElementsByClassName('tweetcontainer');
        var bottomTweet = _.find(tweetContainers, function (el) {
          return el.getBoundingClientRect().top >= currentFrame.getBoundingClientRect().bottom;
        });
        if (bottomTweet) {
          this.scrollTo(currentFrame.scrollTop  + bottomTweet.getBoundingClientRect().bottom - currentFrame.getBoundingClientRect().bottom);
        }
      },
      scrollToPreviousTweet: function () {
        var frames = document.getElementsByClassName('frame');
        var currentFrame = frames[frames.length - 1];
        var tweetContainers = currentFrame.getElementsByClassName('tweetcontainer');
        var topTweet = _.findLast(tweetContainers, function (el) {
          return el.getBoundingClientRect().top < currentFrame.offsetTop;
        });
        if (topTweet) {
          this.scrollTo(currentFrame.scrollTop + topTweet.getBoundingClientRect().top - currentFrame.offsetTop);
        }
      },
      mergeTweet: function (dstTweet, srcTweet) {
        _.assign(dstTweet, srcTweet);
      },
      addTweet: function (target, tweet, push) {
        var self = this;

        tweet = this.updateTweet(tweet);

        var oldTweet = _.find(this.tweets[target], function (old) {
          return old.id === tweet.id;
        });

        if (!oldTweet) {
          if (push) {
            self.tweets[target].push(tweet);
          } else {
            self.tweets[target].unshift(tweet);
          }
        }
      },
      addFiller: function (target, tweets) {
        var self = this;

        var oldTweet;
        var timeline = this.tweets[target];
        var sinceTweet = tweets[0];

        var index = _.findIndex(timeline, function (tweet) {
          return tweet.id === sinceTweet.id;
        });

        // tweets is already reversed
        _.each(tweets, function (tweet) {
          tweet = self.updateTweet(tweet);
          if (index >= 0 && tweet.id === timeline[index].id) {
            index--;
          } else {
            oldTweet = _.find(timeline, function (old) {
              return old.id === tweet.id;
            });
            if (!oldTweet) {
              if (index < 0) {
                timeline.unshift(tweet);
              } else {
                timeline.splice(index + 1, 0, tweet);
              }
            }
          }
        });
      },
      sort: function (timeline) {
        this.tweets[timeline] = _.sortBy(this.tweets[timeline], function (tweet) {
            return new Date(tweet.createdAt);
          }).reverse();
      },
      updateTweet: function (tweet) {
        var self = this;

        var updateTimeline = function (timeline) {
          var oldTweet = _.find(timeline, function (old) {
            return old.id === tweet.id;
          });

          if (oldTweet) {
            self.mergeTweet(oldTweet, tweet);
          }
        };

        _.each(this.tweets, updateTimeline);

        _.each(this.frames, function (frame) {
          if (frame.base) {
            updateTimeline(frame.pretext);
            updateTimeline(frame.replies);
            if (frame.base.id === tweet.id) {
              self.mergeTweet(frame.base, tweet);
            }
          } else if (frame.profile) {
            updateTimeline(frame.tweets);
          }
        });

        tweet.user = this.updateProfile(tweet.user);
        if (tweet.quote) {
          tweet.quote.user = this.updateProfile(tweet.quote.user);
        }

        return tweet;
      },
      updateProfile: function (user) {
        if (this.users[user.screenname]) {
          _.assign(this.users[user.screenname], user);
        } else {
          this.users[user.screenname] = user;
        }

        return this.users[user.screenname];
      },
      deleteTweet: function (tweetId) {
        var self = this;
        var removeTweet = function (timeline) {
          var index = _.findIndex(timeline, function (old) {
            return old.id === tweetId;
          });

          if (index !== -1) {
            timeline.splice(index, 1);
          }
        };

        _.each(this.tweets, removeTweet);

        _.each(this.frames, function (frame) {
          if (frame.base) {
            removeTweet(frame.pretext);
            removeTweet(frame.replies);
            if (frame.base.id === tweetId) {
              self.back();
            }
          } else if (frame.profile) {
            removeTweet(frame.tweets);
          }
        });
      },
      keepPosition: function (offset) {
        var el = document.getElementsByClassName('frame')[0];
        var toBottom =  el.scrollTop < 64 ? 0 : el.scrollHeight - el.scrollTop;
        this.$nextTick(function () {
          el.scrollTop = toBottom ?
            el.scrollHeight - toBottom + (offset || 0) : 0;
        });
      }
    },
    components: {
    },
    compiled: function () {
      var self = this;
      setInterval(function () {
        self.now = moment();
      }, 60 * 1000);

      var throttledScrollToNextTweet = _.throttle(self.scrollToNextTweet, 350);
      var throttledScrollToPreviousTweet = _.throttle(self.scrollToPreviousTweet, 350);

      document.onkeydown = function (event) {
        if (event.keyCode === 27) { // ESC
          self.back();
        } else if (event.keyCode === 74) { // j
          throttledScrollToNextTweet();
        } else if (event.keyCode === 75) { // k
          throttledScrollToPreviousTweet();
        }
      };

      ipc.on('deleteTweet', function (event, tweetId) {
        self.now = moment();
        self.deleteTweet(tweetId);
      });

      ipc.on('updateTweet', function (event, tweet) {
        self.now = moment();
        self.updateTweet(tweet);
      });

      ipc.on('newTweet', function (event, timeline, tweet) {
        self.now = moment();
        self.addTweet(timeline, tweet);
        self.notify(timeline, tweet);
        self.keepPosition();
        self.$nextTick(function () {
          self.popTweet(timeline);
        });
      });

      ipc.on('newTweets', function (event, timeline, tweets) {
        if (!tweets || !tweets.length) {
          return;
        }
        self.now = moment();
        _.each(tweets, function (tweet) {
          self.addTweet(timeline, tweet, true);
        });
      });

      ipc.on('newFiller', function (event, timeline, tweets) {
        if (!tweets || !tweets.length) {
          return;
        }
        self.now = moment();
        self.addFiller(timeline, tweets);
        self.keepPosition();
      });

      ipc.on('newProfileUser', function (event, user) {
        self.now = moment();
        user = self.updateProfile(user);
        if (self.topFrame.profile &&
          self.topFrame.profile.screenname === user.screenname) {
          self.topFrame.profile = user;
        }
      });

      ipc.on('newProfile', function (event, user, tweets) {
        self.now = moment();
        user = self.updateProfile(user);
        if (self.topFrame.profile &&
          self.topFrame.profile.screenname === user.screenname) {
          self.topFrame.profile = user;
          self.topFrame.tweets = self.topFrame.tweets.concat(tweets);
        }
      });

      ipc.on('newPretext', function (event, tweets) {
        self.$broadcast('newPretext', tweets);
      });

      ipc.on('newReplies', function (event, tweets) {
        self.$broadcast('newReplies', tweets);
      });
    },
    transitions: {
    }
  });
});

ipc.send('initialLoad');
