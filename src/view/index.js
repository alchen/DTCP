/*jslint browser:true*/
'use strict';

const ipc = require('electron').ipcRenderer;
var _ = require('lodash');
var Vue = require('vue');
require('../view/components/frames.vue');

Vue.config.debug = process.env.NODE_ENV !== 'production';
Vue.config.strict = true;

var defaultLength = 50;
var scrollThrottleRate = 140;

var timeline = new Vue({
  el: 'html',
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
    fontSize: 16,
    screenname: '',
    lastScreenname: undefined,
    frames: [],
    bundle: {},
    currentUser: undefined,
    availableUsers: {},
    update: false,
    now: Math.floor(Date.now() / 1000)
  },
  methods: {
    showSwitches: function () {
      this.$broadcast('showSwitches', this.availableUsers);
    },
    rewind: function () {
      if (_.isEmpty(this.frames)) {
        return;
      }
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
    findTweet: function (tweetId) {
      var target;
      if (this.topFrame.is === 'profile' || this.topFrame.is === 'timeline') {
        target = _.find(this.topFrame.tweets, function (tweet) {
          return tweetId === tweet.id;
        });
        return target;
      } else if (this.topFrame.is === 'thread') {
        if (tweetId === this.topFrame.base.id) {
          target = this.topFrame.base;
        } else {
          target = _.find(this.topFrame.pretext, function (tweet) {
            return tweetId === tweet.id;
          }) || _.find(this.topFrame.replies, function (tweet) {
            return tweetId === tweet.id;
          });
        }
        return target;
      } else if (this.topFrame.is === 'messages') {
        target = _.find(this.topFrame.messages, function (messageGroup) {
          return messageGroup.id === tweetId;
        });
        return target;
      }
    },
    getActiveTweet: function () {
      var frames = document.getElementsByClassName('frame');
      var currentFrame = frames[frames.length - 1];
      var activeTweets = currentFrame.getElementsByClassName('activetweet');

      if (!activeTweets.length) {
        return;
      }

      var tweetId = activeTweets[0].getAttribute('data-tweet-id');
      var tweet = this.findTweet(tweetId)

      return tweet;
    },
    dive: function () {
      var tweet = this.getActiveTweet();
      if (!tweet) {
        return;
      }

      if (this.topFrame.is === 'profile' || this.topFrame.is === 'timeline') {
        this.$broadcast('showThread', tweet);
      } else if (this.topFrame.is === 'thread') {
        if (tweet.id === this.topFrame.base.id) {
          this.$broadcast('showProfile', this.topFrame.base.user);
        } else {
          this.$broadcast('showThread', tweet);
        }
      } else if (this.topFrame.is === 'messages') {
        this.$broadcast('showMessageGroup', tweet.messages);
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
          is: 'profile',
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
        if (this.isRelevantMessage(screenname, message)) {
          return;
        }
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
    addSinceFiller: function (screenname, target, tweets) {
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
    addMaxFiller: function (screenname, target, tweets) {
      if (!(screenname in this.bundle)) {
        return;
      }
      var self = this;
      var oldTweet;
      var timeline = this.bundle[screenname][target];
      var maxTweet = tweets[0];

      var index = _.findIndex(timeline, function (tweet) {
        return tweet.id === maxTweet.id;
      });

      _.each(tweets, function (tweet) {
        tweet = self.updateTweet(screenname, tweet);
        if (index >= 0 && index < timeline.length && tweet.id === timeline[index].id) { // tweet already included
          // let update take care of the gap
        } else {
          // new (previously missing) tweet
          // place the new tweet behind the current exisiting element
          oldTweet = _.find(timeline, function (old) {
            return old.id === tweet.id;
          });
          if (!oldTweet) {
            timeline.splice(index, 0, tweet);
          }
        }
        index++;
      });
    },
    switchUser: function (screenname) {
      this.rewind();

      if (screenname === this.screenname) {
        return;
      }

      this.screenname = screenname;
      this.frames = [{
        is: 'timeline',
        view: 'home',
        tweets: this.bundle[screenname].home
      }];
      ipc.send('setLastScreenname', screenname);
    },
    addAvailableUser: function (screenname) {
      this.$set('bundle["' + screenname + '"]', {
        home: [],
        mentions: [],
        messages: [],
        profile: [],
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

      if (_.isEmpty(this.screenname) || this.lastScreenname === screenname) {
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
    isRelevantMessage: function (screenname, message) {
      var messageSender = message.sender.screenname;
      var messageRecipient = message.recipient.screenname;
      var targetSender = this.topFrame.messages[0].sender.screenname;
      var targetRecipient = this.topFrame.messages[0].recipient.screenname;
      var correspondent = messageSender === screenname ? messageRecipient : messageSender;

      if ((messageSender === messageRecipient && targetSender === targetRecipient) // message to self
        || (messageSender !== messageRecipient // message to/from others
          && (correspondent === targetSender || correspondent === targetRecipient))) {
        return true;
      }

      return false;
    },
    saveMessage: function (screenname, message) {
      if (this.isRelevantMessage(screenname, message)) {
        this.topFrame.messages.unshift(message);
        this.$nextTick(function () {
          // move to bottom
          this.scrollToBottom();
        });
      }
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
      var toBottom =  el.scrollTop < 16 ? 0 : el.scrollHeight - el.scrollTop;
      var tweets = el.getElementsByClassName('box');
      var lastTweetHeight = tweets.length > 1 ? tweets[tweets.length - 2].scrollHeight : 0;
      var loaderHeight = tweets.length > 0 ? tweets[tweets.length - 1].scrollHeight : 0;

      this.$nextTick(function () {
        var target = el.scrollHeight - Math.max(toBottom, 8 + loaderHeight + lastTweetHeight + el.getBoundingClientRect().top + el.getBoundingClientRect().height) + (offset || 0);
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
    },
    scrollToBottom: function () {
      this.$broadcast('scrollToBottom');
    },
    scrollPageDown: function () {
      this.$broadcast('scrollPageDown');
    },
    scrollPageUp: function () {
      this.$broadcast('scrollPageUp');
    },
    updateNow: function () {
      this.now = Math.floor(Date.now() / 1000);
    }
  },
  compiled: function () {
    var self = this;
    setInterval(this.updateNow, 60 * 1000);

    var throttledScrollToNextTweet = _.throttle(self.scrollToNextTweet, scrollThrottleRate);
    var throttledScrollToPreviousTweet = _.throttle(self.scrollToPreviousTweet, scrollThrottleRate);

    document.onkeydown = function (event) {
      if (event.keyCode === 8 || event.keyCode === 27 || event.keyCode === 72 || event.keyCode === 37) { // Backspace or ESC or h or left
        self.back();
      } else if (event.keyCode === 74 || event.keyCode === 40) { // j or down
        throttledScrollToNextTweet();
      } else if (event.keyCode === 75 || event.keyCode === 38) { // k or up
        throttledScrollToPreviousTweet();
      } else if (event.keyCode === 76 || event.keyCode === 39) { // l or right
        self.dive();
      } else if (event.keyCode === 32) { // space
        if (event.shiftKey) {
          self.scrollPageUp();
        } else {
          self.scrollPageDown();
        }
      } else if (event.keyCode === 33) { // page up
        self.scrollPageUp();
      } else if (event.keyCode === 34) { // page down
        self.scrollPageDown();
      } else if (event.keyCode === 35) { // end
        self.scrollToBottom();
      } else if (event.keyCode === 36) { // home
        self.scrollToTop();
      } else if (event.keyCode === 82) { // R
        if (event.metaKey || event.ctrlKey) {
          return;
        }

        var tweet = self.getActiveTweet();
        if (!tweet) {
          return;
        }

        var mentions = _.filter(tweet.mentions, function (k) {
          return k !== self.screenname;
        });
        mentions.unshift(tweet.user.screenname);
        if (tweet.quote) {
          mentions.push(tweet.quote.user.screenname);
        }
        mentions = _.map(_.uniq(mentions), function (m) {
          return '@' + m;
        }).join(' ');

        self.$emit('compose', self.screenname, tweet.id, mentions);
      } else if (event.keyCode === 84 && event.altKey) { // Alt + T
        var tweet = self.getActiveTweet();
        if (!tweet) {
          return;
        }

        var tweetUrl = 'https://twitter.com/' +
          tweet.user.screenname +
          '/status/' +
          tweet.id;

        self.$emit('compose', self.screenname, tweet.id, tweetUrl, {
          frontFocus: true
        });
      } else if (event.keyCode === 70) { // F
        var tweet = self.getActiveTweet();
        if (!tweet) {
          return;
        }

        ipc.send('favorite', self.screenname, tweet.id, !tweet.isFavorited);
      } else if (event.keyCode === 84) { // T
        var tweet = self.getActiveTweet();
        if (!tweet) {
          return;
        }

        ipc.send('retweet', self.screenname, tweet.id, !tweet.isRetweeted);
      } else if (event.keyCode === 73) { // I
        var tweet = self.getActiveTweet();
        if (!tweet) {
          return;
        }
        var media;
        if (event.shiftKey && tweet.quote && tweet.quote.media) {
          media = _.map(tweet.quote.media, function (m) {
            return _.cloneDeep(m);
          });
          ipc.send('showViewer', media, 0);
        } else if (tweet.media || (tweet.quote && tweet.quote.media)) {
          media = _.map(tweet.media || tweet.quote.media, function (m) {
            return _.cloneDeep(m);
          });
          ipc.send('showViewer', media, 0);
        }
      }

      switch (event.keyCode) {
        case 8:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
        case 38:
        case 39:
        case 40:
          event.preventDefault();
          break;
        default:
          break;
      }
    };

    ipc.on('initialLoad', function (event, screenname) {
      self.addAvailableUser(screenname);
    });

    ipc.on('deleteTweet', function (event, screenname, tweetId) {
      self.updateNow();
      self.deleteTweet(screenname, tweetId);
    });

    ipc.on('updateTweet', function (event, screenname, tweet) {
      self.updateNow();
      self.updateTweet(screenname, tweet);
    });

    ipc.on('newTweet', function (event, screenname, timeline, tweet) {
      self.updateNow();
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
      self.updateNow();
      _.each(tweets, function (tweet) {
        self.addTweet(screenname, timeline, tweet, true);
      });
    });

    ipc.on('newSinceFiller', function (event, screenname, timeline, tweets) {
      if (!tweets || !tweets.length) {
        return;
      }
      self.updateNow();
      self.addSinceFiller(screenname, timeline, tweets);
      if (self.screenname === screenname) {
        self.keepPosition();
      }
    });

    ipc.on('newMaxFiller', function (event, screenname, timeline, tweets) {
      if (!tweets || !tweets.length) {
        return;
      }
      self.updateNow();
      self.addMaxFiller(screenname, timeline, tweets);
      if (self.screenname === screenname) {
        self.keepPosition();
      }
    });

    // New user object
    ipc.on('newProfileUser', function (event, screenname, user) {
      self.updateNow();
      user = self.updateProfile(screenname, user);
      if (self.screenname === screenname && self.topFrame.profile &&
        self.topFrame.profile.screenname === user.screenname) {
        self.topFrame.profile = user;
      }
    });

    // New user object and tweets
    ipc.on('newProfile', function (event, screenname, user, tweets) {
      self.updateNow();
      user = self.updateProfile(screenname, user);
      if (self.screenname === screenname && self.topFrame.profile &&
        self.topFrame.profile.screenname === user.screenname) {
        self.topFrame.profile = user;
        if (self.topFrame.tweets.length) {
          // first tweet will be duplicate because we didn't decrement tweet id in api request
          self.topFrame.tweets = self.topFrame.tweets.concat(_.tail(tweets));
        } else {
          self.topFrame.tweets = self.topFrame.tweets.concat(tweets);
        }
      }
    });

    ipc.on('newMessages', function (event, screenname, messages) {
      self.saveMessages(screenname, messages);
    });

    ipc.on('newMessage', function (event, screenname, message) {
      if (message.sender.screenname !== screenname || message.sender.screenname === message.recipient.screenname) {
        self.notify(screenname, 'messages', message);
      }
      self.saveMessage(screenname, message);
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

    ipc.on('fontSize', function (event, fontSize) {
      self.fontSize = fontSize;
    });

    ipc.on('lastScreenname', function (event, screenname) {
      self.lastScreenname = screenname;
      if (screenname in self.bundle) {
        self.switchUser(screenname);
      }
    });

    ipc.on('update', function (event, hasUpdate) {
      self.update = hasUpdate;
    });

    ipc.send('getFontSize');
    ipc.send('getLastScreenname');
    ipc.send('initialLoad');
    ipc.send('checkUpdate');

    setInterval(function () {
      ipc.send('checkUpdate');
    }, 1000 * 60 * 60 * 6); // Check update every six hours
  }
});

module.exports = timeline;
