/*jslint browser:true*/
'use strict';

var ipc = require('electron').ipcRenderer;
var _ = require('lodash');
var Vue = require('vue');
require('../view/components/frames');
var moment = require('moment');

Vue.config.debug = true;
Vue.config.strict = true;

var defaultLength = 50;
var scrollThrottleRate = 60;

var timeline = new Vue({
  el: '#content',
  computed: {
    topFrame: function () {
      return this.frames[this.frames.length - 1] || {};
    }
  },
  events: {
    rewind: function () {
      this.rewind();
    },
    switchUser: function (screenname) {
      this.switchUser(screenname);
    }
  },
  data: {
    screenname: '',
    frames: [],
    bundle: {},
    currentUser: undefined,
    availableUsers: {},
    now: moment()
  },
  methods: {
    showSwitches: function () {
      this.$broadcast('showSwitches', this.availableUsers);
    },
    rewind: function () {
      var bottomFrame = this.frames[0];
      var timeline = bottomFrame.view;
      this.bundle[this.screenname][timeline] = this.bundle[this.screenname][timeline].slice(0, defaultLength);
      bottomFrame.tweets = this.bundle[this.screenname][timeline];
    },
    popTweet: function (screenname, timeline) {
      return this.bundle[screenname][timeline].pop();
    },
    compose: function () {
      ipc.send('compose', this.screenname);
    },
    back: function () {
      if (this.frames.length > 1) {
        this.frames.pop();
      }
    },
    changeTimeline: function (timeline) {
      if (this.frames.length === 1 && this.frames[0].view === timeline) {
        this.scrollToTop();
      } else if (timeline === 'user') {
        this.frames = [{
          is: 'profileComponent',
          view: 'profile',
          profile: this.bundle[this.screenname].users[this.screenname] || {screenname: this.screenname},
          tweets: []
        }];
        ipc.send('loadScreenname', this.screenname, this.screenname);
      } else if (timeline === 'messages') {
        this.frames = [{
          is: 'messages',
          view: 'messages',
          messages: this.bundle[this.screenname].messages
        }];
        ipc.send('loadMessages', this.screenname);
      } else if (this.topFrame.view !== timeline) {
        this.frames = [{
          is: 'timeline',
          view: timeline,
          tweets: this.bundle[this.screenname][timeline]
        }];
        this.rewind();
      }
    },
    notify: function (screenname, timeline, tweet) {
      if (timeline === 'mentions') {
        // notification
      }
    },
    mergeTweet: function (dstTweet, srcTweet) {
      _.assign(dstTweet, srcTweet);
    },
    addTweet: function (screenname, target, tweet, push) {
      if (!(screenname in this.bundle)) {
        return;
      }
      var self = this;

      tweet = this.updateTweet(screenname, tweet);

      var oldTweet = _.find(this.bundle[screenname][target], function (old) {
        return old.id === tweet.id;
      });

      if (!oldTweet) {
        if (push) {
          self.bundle[screenname][target].push(tweet);
        } else {
          self.bundle[screenname][target].unshift(tweet);
        }
      }
    },
    addFiller: function (screenname, target, tweets) {
      if (!(screenname in this.bundle)) {
        return;
      }
      var self = this;

      var oldTweet;
      var timeline = this.bundle[screenname][target];
      var sinceTweet = tweets[0];

      var index = _.findIndex(timeline, function (tweet) {
        return tweet.id === sinceTweet.id;
      });

      // tweets is already reversed
      _.each(tweets, function (tweet) {
        tweet = self.updateTweet(screenname, tweet);
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
    switchUser: function (screenname) {
      this.screenname = screenname;
      this.frames = [{
        is: 'timeline',
        view: 'home',
        tweets: this.bundle[screenname].home
      }];
    },
    addAvailableUser: function (screenname) {
      this.$set('bundle["' + screenname + '"]', {
        home: [],
        mentions: [],
        messages: [],
        users: {}
      });
      this.$set('bundle["' + screenname + '"].users["' + screenname + '"]', {
        screenname: screenname,
        biggerIcon: undefined
      });
      this.$set('availableUsers["' + screenname + '"]', this.bundle[screenname].users[screenname]);

      if (_.isEmpty(this.screenname)) {
        this.switchUser(screenname);
      }

      ipc.send('loadScreenname', screenname, screenname);
    },
    sort: function (items) { // sort items with createdAt attribute
      return _.sortBy(items, function (item) {
          return new Date(item.createdAt);
        }).reverse();
    },
    updateTweet: function (screenname, tweet) {
      if (!(screenname in this.bundle)) {
        return;
      }
      var self = this;

      var updateTimeline = function (timeline) {
        var oldTweet = _.find(timeline, function (old) {
          return old.id === tweet.id;
        });

        if (oldTweet) {
          self.mergeTweet(oldTweet, tweet);
        }
      };

      _.each(this.bundle[screenname], updateTimeline);

      if (this.screenname === screenname) {
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
      }

      tweet.user = this.updateProfile(screenname, tweet.user);
      if (tweet.quote) {
        tweet.quote.user = this.updateProfile(screenname, tweet.quote.user);
      }

      return tweet;
    },
    saveMessages: function (screenname, messages) {
      if (!(screenname in this.bundle)) {
        return;
      }
      var self = this;
      var sortedMessages = this.sort(messages);
      var correspondents = {};
      var counter = 0;
      var messagesByUser = [];
      _.each(sortedMessages, function (message) {
        var grouper = message.sender.screenname;
        if (message.sender.screenname === self.screenname) {
          grouper = message.recipient.screenname;
        }

        var index = correspondents[grouper];
        if (index !== undefined) {
          messagesByUser[index].messages.push(message);
        } else {
          index = counter;
          correspondents[grouper] = index;
          var newGroup = {
            id: message.id,
            messages: [message]
          };
          messagesByUser.push(newGroup);
          counter = counter + 1;
        }
      });
      this.bundle[screenname].messages = messagesByUser;
      var bottomFrame = this.frames[0];
      if (this.screenname === screenname && bottomFrame.view === 'messages') {
        bottomFrame.messages = this.bundle[screenname].messages;
      }
    },
    updateProfile: function (screenname, user) {
      if (!(screenname in this.bundle)) {
        return;
      }
      if (this.bundle[screenname].users[user.screenname]) {
        _.assign(this.bundle[screenname].users[user.screenname], user);
      } else {
        this.bundle[screenname].users[user.screenname] = user;
      }

      if (user.screenname === this.screenname) {
        this.currentUser = this.bundle[screenname].users[user.screenname];
      }

      return this.bundle[screenname].users[user.screenname];
    },
    deleteTweet: function (screenname, tweetId) {
      if (!(screenname in this.bundle)) {
        return;
      }
      var self = this;
      var removeTweet = function (timeline) {
        var index = _.findIndex(timeline, function (old) {
          return old.id === tweetId;
        });

        if (index !== -1) {
          timeline.splice(index, 1);
        }
      };

      _.each(this.bundle[screenname], removeTweet);

      if (this.screenname === screenname) {
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
      }
    },
    keepPosition: function (offset) {
      var el = document.getElementsByClassName('frame')[0];
      var toBottom =  el.scrollTop < 64 ? 0 : el.scrollHeight - el.scrollTop;
      this.$nextTick(function () {
        el.scrollTop = toBottom ?
          el.scrollHeight - toBottom + (offset || 0) : 0;
      });
    },
    scrollToNextTweet: function () {
      this.$broadcast('scrollToNextTweet');
    },
    scrollToPreviousTweet: function () {
      this.$broadcast('scrollToPreviousTweet');
    },
    scrollToTop: function () {
      this.$broadcast('scrollToTop');
    }
  },
  compiled: function () {
    var self = this;
    setInterval(function () {
      self.now = moment();
    }, 60 * 1000);

    var throttledScrollToNextTweet = _.throttle(self.scrollToNextTweet, scrollThrottleRate);
    var throttledScrollToPreviousTweet = _.throttle(self.scrollToPreviousTweet, scrollThrottleRate);

    document.onkeydown = function (event) {
      if (event.keyCode === 27 || event.keyCode === 72) { // ESC or h
        self.back();
      } else if (event.keyCode === 74) { // j
        throttledScrollToNextTweet();
      } else if (event.keyCode === 75) { // k
        throttledScrollToPreviousTweet();
      }
    };

    ipc.on('initialLoad', function (event, screenname) {
      self.addAvailableUser(screenname);
    });

    ipc.on('deleteTweet', function (event, screenname, tweetId) {
      self.now = moment();
      self.deleteTweet(screenname, tweetId);
    });

    ipc.on('updateTweet', function (event, screenname, tweet) {
      self.now = moment();
      self.updateTweet(screenname, tweet);
    });

    ipc.on('newTweet', function (event, screenname, timeline, tweet) {
      self.now = moment();
      self.addTweet(screenname, timeline, tweet);
      self.notify(screenname, timeline, tweet);
      self.keepPosition();
      self.$nextTick(function () {
        self.popTweet(screenname, timeline);
      });
    });

    ipc.on('newTweets', function (event, screenname, timeline, tweets) {
      if (!tweets || !tweets.length) {
        return;
      }
      self.now = moment();
      _.each(tweets, function (tweet) {
        self.addTweet(screenname, timeline, tweet, true);
      });
    });

    ipc.on('newFiller', function (event, screenname, timeline, tweets) {
      if (!tweets || !tweets.length) {
        return;
      }
      self.now = moment();
      self.addFiller(screenname, timeline, tweets);
      self.keepPosition();
    });

    ipc.on('newProfileUser', function (event, screenname, user) {
      self.now = moment();
      user = self.updateProfile(screenname, user);
      if (self.screenname === screenname && self.topFrame.profile &&
        self.topFrame.profile.screenname === user.screenname) {
        self.topFrame.profile = user;
      }
    });

    ipc.on('newProfile', function (event, screenname, user, tweets) {
      self.now = moment();
      user = self.updateProfile(screenname, user);
      if (self.screenname === screenname && self.topFrame.profile &&
        self.topFrame.profile.screenname === user.screenname) {
        self.topFrame.profile = user;
        self.topFrame.tweets = self.topFrame.tweets.concat(tweets);
      }
    });

    ipc.on('newMessages', function (event, screenname, messages) {
      self.saveMessages(screenname, messages);
    });

    ipc.on('newPretext', function (event, screenname, tweets) {
      self.$broadcast('newPretext', tweets);
    });

    ipc.on('newReplies', function (event, screenname, tweets) {
      self.$broadcast('newReplies', tweets);
    });

    ipc.on('requestComposer', function (event) {
      self.compose();
    });

    ipc.send('initialLoad');
  }
});

module.export = timeline;
