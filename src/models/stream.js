'use strict';

var Twit = require('../../lib/twit');
var _ = require('lodash');
var config = require('../config');

var Tweet = require('./tweet');
var Message = require('./message');
var User = require('./user');
var Timeline = require('./timeline');

function Stream(oauthToken, oauthTokenSecret, screenname) {
  var self = this;

  this.T = new Twit({
    consumer_key: config.consumerKey,
    consumer_secret: config.consumerSecret,
    access_token: oauthToken,
    access_token_secret: oauthTokenSecret
  });

  this.screenname = screenname;
  this.timeline = new Timeline(screenname);

  this.stream = this.T.stream('user', {
    stringify_friend_ids: true
  });

  this.stream.on('friends', function (friendsMsg) {
    self.timeline.setFriends(friendsMsg.friends_str);

    // We just connected or we are reconnected
    self.insertGap();
  });

  this.stream.on('direct_message', function (rawMessage) {
    // Because perspectival attributes (following, follow_request_sent, and notifications) always return false.
    // https://dev.twitter.com/streaming/overview/messages-types#Direct_Messages
    delete rawMessage.direct_message.sender.following;
    delete rawMessage.direct_message.sender.follow_request_sent;
    delete rawMessage.direct_message.recipient.following;
    delete rawMessage.direct_message.recipient.follow_request_sent;

    var newMessage = new Message(rawMessage.direct_message);
    var payload = self.timeline.saveMessages([newMessage]);

    self.send('newMessage', self.screenname, newMessage);
    self.send('newMessages', self.screenname, payload);
  });

  this.stream.on('follow', function (followMsg) {
    var source = new User(followMsg.source);
    var target = new User(followMsg.target);

    if (source.screenname === self.screenname) {
      target.isFollowing = true;
      target = self.timeline.saveUser(target);
      self.send('newProfileUser', self.screenname, target);
    }
  });

  this.stream.on('unfollow', function (unfollowMsg) {
    var source = new User(unfollowMsg.source);
    var target = new User(unfollowMsg.target);

    if (source.screenname === self.screenname) {
      target.isFollowing = false;
      target = self.timeline.saveUser(target);
      self.send('newProfileUser', self.screenname, target);
    }
  });

  this.stream.on('tweet', function (rawTweet) {
    var tweet = new Tweet(rawTweet, self.screenname);

    tweet = self.timeline.addTweet(tweet);

    if (true || self.timeline.isFriend(tweet.user) || tweet.user.screenname === self.screenname) {
      self.send('newTweet', self.screenname, 'home', tweet);
    }

    if (tweet.mentionsScreenname(screenname)) {
      self.send('newTweet', self.screenname, 'mentions', tweet);
    }
  });

  this.stream.on('delete', function (deleteMessage) {
    var deleteId = deleteMessage.delete.status.id_str;
    self.timeline.deleteTweet(deleteId);
    self.send('deleteTweet', self.screenname, deleteId);
  });

  this.stream.on('favorite', function (favoriteMessage) {
    if (favoriteMessage.source.screen_name === self.screenname) {
      // user favorites a tweet
      var tweet = self.timeline.favoriteTweet(
        new Tweet(favoriteMessage.target_object, self.screenname)
      );
      if (tweet) {
        self.send('updateTweet', self.screenname, tweet);
      }
    } else {
      // user's tweet is favorited
    }
  });

  this.stream.on('unfavorite', function (unfavoriteMessage) {
    if (unfavoriteMessage.source.screen_name === self.screenname) {
      // user favorites a tweet
      var tweet = self.timeline.unfavoriteTweet(
        new Tweet(unfavoriteMessage.target_object, self.screenname)
      );
      if (tweet) {
        self.send('updateTweet', self.screenname, tweet);
      }
    } else {
      // user's tweet is unfavorited
    }
  });

  this.stream.on('error', function (err) {
    console.log('Stream: critical error');
    console.log(err);
  });

  this.stream.on('internet_error', function (err) {
    console.log('Stream: internet is down.');
    console.log(err);
  });
}

Stream.prototype.insertGap = function () {
  var self = this;
  var gaps = this.timeline.insertGap();
  _.each(gaps, function (tweet) {
    self.send('updateTweet', self.screenname, tweet);
  });
};

Stream.prototype.subscribe = function (window) {
  this.subscriber = window;
};

Stream.prototype.unsubscribe = function () {
  this.subscriber = null;
};

Stream.prototype.close = function () {
  console.log('Stream: close');
  this.stream.stop();
  this.stream.removeAllListeners();
};

Stream.prototype.send = function () {
  var cloneTweet = function (tweet) {
    var newTweet = _.cloneDeep(tweet);
    newTweet.user = _.cloneDeep(tweet.user);
    if (tweet.quote) {
      newTweet.quote.user = _.cloneDeep(tweet.quote.user);
    }
    return newTweet;
  };

  var cloneMessage = function (message) {
    var newMessage = _.cloneDeep(message);
    newMessage.sender = _.cloneDeep(message.sender);
    newMessage.recipient = _.cloneDeep(message.recipient);

    return newMessage;
  };

  if (this.subscriber) {
    var payload = _.map(arguments, function (part) {
      return _.cloneDeepWith(part, function (i) {
        if (_.isArray(i)) {
          return _.map(i, function (j) {
            return _.cloneDeepWith(j, function (k) {
              if (k && k.isTweet) {
                return cloneTweet(k);
              } else if (k && k.isMessage) {
                return cloneMessage(k);
              }
            });
          });
        } else if (i && i.isTweet) {
          return cloneTweet(i);
        } else if (i && i.isMessage) {
          return cloneMessage(i);
        }
      });
    });

    this.subscriber.webContents.send.apply(
      this.subscriber.webContents,
      payload
    );
  }
};

Stream.prototype.initialLoad = function initialLoad() {
  this.send('initialLoad', this.screenname);
};

// Save tweets to a timeline
Stream.prototype.saveTweetsToTimeline = function (timeline, rawTweets) {
  var self = this;
  var tweets = _.map(rawTweets, function (rawTweet) {
    return new Tweet(rawTweet, self.screenname);
  });

  this.timeline.push(timeline, tweets);
};

Stream.prototype.sendTweets = function (timeline, maxId) {
  var tweets = this.timeline.get(timeline, maxId);
  var payload = tweets.slice(0, config.sendThreshold);

  this.send('newTweets', this.screenname, timeline, payload);
};

Stream.prototype.sendFiller = function (timeline, filler) {
  this.send('newFiller', this.screenname, timeline, filler);
};

Stream.prototype.loadSince = function (timeline, sinceId) {
  var self = this;
  var options = {
    count: config.loadThreshold,
    since_id: sinceId
  };

  this.T.get('statuses/' + timeline + '_timeline', options,
  function (err, rawTweets, response) {
    if (!err) {
      var tweets = _.map(rawTweets, function (rawTweet) {
        return new Tweet(rawTweet, self.screenname);
      });
      var filler = self.timeline.closeGap(timeline, sinceId, tweets);
      self.sendFiller(timeline, filler);
    }
  });
};

Stream.prototype.loadMore = function (timeline, maxId) {
  var self = this;

  var payload = this.timeline.get(timeline, maxId);
  var payloadSize = _.size(payload);
  var options = {count: config.loadThreshold};

  if (payloadSize > config.loadThreshold) {
    this.send('newTweets', this.screenname, timeline, payload.slice(0, config.sendThreshold));
  } else {
    var immediate = payloadSize < config.sendThreshold ? false : true;
    if (immediate) {
      this.send('newTweets', this.screenname, timeline, payload.slice(0, config.sendThreshold));
    }
    if (payloadSize > 0) {
      options.max_id = payload[payloadSize - 1].id;
    }
    this.T.get('statuses/' + timeline + '_timeline', options,
    function (err, rawTweets, response) {
      if (!err) {
        self.saveTweetsToTimeline(timeline, rawTweets);
        if (!immediate) { // hasn't been sent
          self.sendTweets(timeline, maxId);
        }
      }
    });
  }
};

Stream.prototype.loadScreenname = function (screenname) {
  var self = this;
  var options = {screen_name: screenname};
  var user = self.timeline.findUser(screenname);

  if (user) {
    this.send('newProfileUser', this.screenname, user);
  }
  this.T.get('users/show', options, function (err, rawUser, response) {
    if (!err) {
      var user = self.timeline.saveUser(new User(rawUser));
      self.send('newProfileUser', self.screenname, user);
    } else {
      // because user has been suspended and etc.
    }
  });
};

Stream.prototype.loadUser = function loadUser(screenname, maxId) {
  var self = this;
  var options = {screen_name: screenname, count: config.loadThreshold};

  if (maxId) {
    options.max_id = maxId;
  }

  this.T.get('statuses/user_timeline', options,
  function (err, rawTweets, response) {
    if (!err) {
      var tweets = _.map(rawTweets, function (rawTweet) {
        return new Tweet(rawTweet, self.screenname);
      });
      var payload = self.timeline.saveTweets(tweets);

      var user = self.timeline.findUser(screenname);
      if (!user) {
        self.loadScreenname(screenname);
      } else {
        self.send('newProfile', self.screenname, user, payload);
      }
    }
  });
};

Stream.prototype.loadMessages = function () {
  var self = this;
  var options = {count: config.loadThreshold};

  self.send('newMessages', self.screenname, self.timeline.getMessages());

  var loadMessagesFromRemote = function () {
    this.T.get('direct_messages', options,
    function (err, rawMessages, response) {
      if (!err) {
        var messages = _.map(rawMessages, function (rawMessage) {
          return new Message(rawMessage);
        });
        var payload = self.timeline.saveMessages(messages);

        self.send('newMessages', self.screenname, payload);
      }
    });

    this.T.get('direct_messages/sent', options,
    function (err, rawMessages, response) {
      if (!err) {
        var messages = _.map(rawMessages, function (rawMessage) {
          return new Message(rawMessage);
        });
        var payload = self.timeline.saveMessages(messages);

        self.send('newMessages', self.screenname, payload);
      }
    });
  };

  if (this.debouncedLoadMessages === undefined) {
    this.debouncedLoadMessages = _.debounce(loadMessagesFromRemote, 30 * 1000, {
      'leading': true,
      'trailing': false
    });
  }

  this.debouncedLoadMessages();
};

Stream.prototype.findContext = function findContext(tweetId) {
  var self = this;
  var tweet = this.timeline.findTweet(tweetId);
  var pretext = this.timeline.findPretext(tweet);
  var replies = this.timeline.findReplies(tweet);
  if (_.size(pretext) === 0 && tweet.inReplyTo) {
    this.T.get('statuses/show/' + tweet.inReplyTo, {include_my_retweet: true},
    function (err, data, response) {
      if (!err) {
        var tweet = new Tweet(data, self.screenname);
        self.timeline.saveTweet(tweet);

        self.send('newPretext', self.screenname, [tweet]);
      }
    });
  } else {
    this.send('newPretext', this.screenname, pretext);
  }
  this.send('newReplies', this.screenname, replies);
};

Stream.prototype.sendTweet = function sendTweet(tweet, replyTo, sender) {
  var options = {status: tweet};

  if (replyTo) {
    options.in_reply_to_status_id = replyTo;
  }

  this.T.post('statuses/update', options, function (err, data, response) {
    if (!err) {
      sender.close();
    } else {
      sender.show();
    }
  });
};

Stream.prototype.favorite = function favorite(tweetId) {
  this.T.post('favorites/create', {id: tweetId}, function (err, data, response) {
    if (!err) {
      console.log('REST: favorited');
    } else {
      console.log(err);
    }
  });
};

Stream.prototype.unfavorite = function unfavorite(tweetId) {
  this.T.post('favorites/destroy', {id: tweetId},
  function (err, data, response) {
    if (!err) {
      console.log('REST: unfavorited');
    }
  });
};

Stream.prototype.retweet = function retweet(tweetId) {
  this.T.post('statuses/retweet/' + tweetId, function (err, data, response) {
    if (!err) {
      console.log('REST: retweeted and got ' + data.id_str);
    } else {
      console.log(err);
    }
  });
};

Stream.prototype.unretweet = function unretweet(tweetId) {
  var self = this;

  var destroyRetweet = function (retweetId) {
    self.T.post('statuses/destroy/' + retweetId, function (err, data, response) {
      if (!err) {
        console.log('REST: unretweeted');
        tweet = self.timeline.unretweetTweet(new Tweet(data, self.screenname));
        self.send('updateTweet', self.screenname, tweet);
      }
    });
  };

  var tweet = this.timeline.findTweet(tweetId);
  if (tweet && tweet.retweetId) {
    console.log('REST: known retweet');
    destroyRetweet(tweet.retweetId);
  } else {
    console.log('REST: retrieve unknown retweet');
    this.T.get('statuses/show/' + tweetId, {include_my_retweet: true},
    function (err, data, response) {
      if (!err) {
        console.log('REST: retrieved retweetId');

        tweet = new Tweet(data, self.screenname);
        self.timeline.saveTweet(tweet);
        destroyRetweet(tweet.retweetId);
      }
    });
  }
};

Stream.prototype.deleteTweet = function deleteTweet(tweetId) {
  var self = this;
  this.T.post('statuses/destroy/' + tweetId, function (err, data, response) {
    if (!err) {
      console.log('REST: deleted');
      var deleteId = data.id_str;
      self.timeline.deleteTweet(deleteId);
      self.send('deleteTweet', self.screenname, deleteId);
    } else {
      console.log(err);
    }
  });
};

Stream.prototype.follow = function (screenname) {
  var self = this;
  this.T.post('friendships/create', {screen_name: screenname},
  function (err, data, response) {
    if (!err) {
      console.log('REST: followed');
      var user = new User(data);
      if (user.isProtected) {
        user.isFollowing = false;
        user.isPending = true;
      } else {
        user.isFollowing = true;
      }
      user = self.timeline.saveUser(user);
      self.send('newProfileUser', self.screenname, user);
    } else {
      console.log(err);
    }
  });
};

Stream.prototype.unfollow = function (screenname) {
  var self = this;
  this.T.post('friendships/destroy', {screen_name: screenname},
  function (err, data, response) {
    if (!err) {
      console.log('REST: unfollowed');
      var user = new User(data);
      user.isFollowing = false;
      user = self.timeline.saveUser(user);
      self.send('newProfileUser', self.screenname, user);
    } else {
      console.log(err);
    }
  });
};

module.exports = Stream;
