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
    },
    unreadFromOtherUser: function () {
      var self = this;
      return _.reduce(this.availableUsers, function (result, user) {
        if (user.screenname === self.screenname) {
          return result;
        } else {
          return result || self.bundle[user.screenname].unread.home || self.bundle[user.screenname].unread.messages || self.bundle[user.screenname].unread.mentions;
        }
      }, false);
    }
  },
  events: {
    rewind: function () {
      this.rewind();
    },
    switchUser: function (screenname) {
      this.switchUser(screenname);
    },
    back: function () {
      this.back();
    },
    compose: function (screenname, inReplyTo, pretext, options) {
      this.compose(screenname, inReplyTo, pretext, options);
    }
  },
  data: {
    blur: false,
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
      if (!(screenname in this.bundle)) {
        return;
      }
      return this.bundle[screenname][timeline].pop();
    },
    compose: function (screenname, inReplyTo, pretext, options) {
      var self = this;

      var availableUsers = _.reduce(this.availableUsers, function (result, user, screenname) {
        result[screenname] = _.cloneDeep(self.availableUsers[screenname]);
        return result;
      }, {});

      if (!pretext) {
        if (this.topFrame.view === 'profile') {
          pretext = '@' + this.topFrame.profile.screenname;
        } else if (this.topFrame.view === 'messageGroup' && !_.isEmpty(this.topFrame.messages)) {
          if (this.topFrame.messages[0].sender.screenname !== this.screenname) {
            pretext = 'd ' + this.topFrame.messages[0].sender.screenname;
          } else {
            pretext = 'd ' + this.topFrame.messages[0].recipient.screenname;
          }
        }
      }

      ipc.send('compose', screenname, availableUsers, inReplyTo, pretext, options);
    },
    back: function () {
      if (this.frames.length > 1) {
        this.frames.pop();
      }
    },
    updateBadge: function () {
      var self = this;
      var unreadNum = 0;
      _.each(this.availableUsers, function (user) {
        unreadNum += self.bundle[user.screenname].unread.home +
          self.bundle[user.screenname].unread.mentions +
          self.bundle[user.screenname].unread.messages;
      });
      ipc.send('updateBadge', '' + unreadNum);
    },
    changeTimeline: function (timeline) {
      if (timeline in this.bundle[this.screenname].unread) {
        this.bundle[this.screenname].unread[timeline] = 0;
        this.bundle[this.screenname].users[this.screenname].unread =
          this.bundle[this.screenname].unread.home ||
          this.bundle[this.screenname].unread.mentions ||
          this.bundle[this.screenname].unread.messages;
        this.updateBadge();
      }

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
      var self = this;
      var newNotification;

      if ((this.screenname !== screenname || this.topFrame.view !== timeline) && (timeline === 'mentions' || timeline === 'messages')) {
        this.bundle[screenname].unread[timeline] += 1;
        this.bundle[screenname].users[screenname].unread = true;
        this.updateBadge();
      }

      if (timeline === 'mentions') {
        newNotification = new Notification('Mention from ' + tweet.user.screenname, {
          body: tweet.rawStatus,
          icon: tweet.user.biggerIcon,
          data: {
            screenname: screenname,
            tweet: tweet
          }
        });

        newNotification.onclick = function () {
          self.switchUser(this.data.screenname);
          self.$broadcast('showThread', this.data.tweet);
          ipc.send('focus');
        };
      } else if (timeline === 'messages') {
        newNotification = new Notification('Message from ' + tweet.sender.screenname, {
          body: tweet.rawStatus,
          icon: tweet.sender.biggerIcon,
          data: {
            screenname: screenname
          }
        });

        newNotification.onclick = function () {
          self.switchUser(this.data.screenname);
          self.changeTimeline('messages');
          ipc.send('focus');
        };
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
        users: {},
        unread: {
          home: 0,
          mentions: 0,
          messages: 0
        }
      });
      this.$set('bundle["' + screenname + '"].users["' + screenname + '"]', {
        screenname: screenname,
        biggerIcon: undefined,
        unread: false
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
      var tweets = el.getElementsByClassName('tweetcontainer');
      var lastTweetHeight = tweets.length > 1 ? tweets[tweets.length - 2].scrollHeight : 0;

      this.$nextTick(function () {
        var target = el.scrollHeight - Math.max(toBottom, 36 + 45 + el.getBoundingClientRect().height + lastTweetHeight) + (offset || 0);
        el.scrollTop = toBottom ? target : 0;
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
      if (self.screenname === screenname) {
        self.keepPosition();
      }
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
      if (self.screenname === screenname) {
        self.keepPosition();
      }
    });

    // New user object
    ipc.on('newProfileUser', function (event, screenname, user) {
      self.now = moment();
      user = self.updateProfile(screenname, user);
      if (self.screenname === screenname && self.topFrame.profile &&
        self.topFrame.profile.screenname === user.screenname) {
        self.topFrame.profile = user;
      }
    });

    // New user object and tweets
    ipc.on('newProfile', function (event, screenname, user, tweets) {
      self.now = moment();
      user = self.updateProfile(screenname, user);
      if (self.screenname === screenname && self.topFrame.profile &&
        self.topFrame.profile.screenname === user.screenname) {
        self.topFrame.profile = user;
        if (self.topFrame.tweets.length) {
          // first tweet will be duplicate because we didn't decrement tweet id in api request
          self.topFrame.tweets = self.topFrame.tweets.concat(_.rest(tweets));
        } else {
          self.topFrame.tweets = self.topFrame.tweets.concat(tweets);
        }
      }
    });

    ipc.on('newMessages', function (event, screenname, messages) {
      self.saveMessages(screenname, messages);
    });

    ipc.on('newMessage', function (event, screenname, message) {
      if (message.sender.screenname !== screenname) {
        self.notify(screenname, 'messages', message);
      }
    });

    ipc.on('newPretext', function (event, screenname, tweets) {
      self.$broadcast('newPretext', tweets);
    });

    ipc.on('newReplies', function (event, screenname, tweets) {
      self.$broadcast('newReplies', tweets);
    });

    ipc.on('requestComposer', function (event) {
      self.compose(self.screenname);
    });

    ipc.send('initialLoad');
  }
});

module.export = timeline;
