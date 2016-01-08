'use strict';

var _ = require('lodash');

var Timeline = function (screenname) {
  this.screenname = screenname;

  this.friends = {};

  this.users = {};

  this.tweets = {};
  this.hash = {
    home: {},
    mentions: {},
    messages: {}
  };

  this.home = [];
  this.mentions = [];
  this.messages = [];
};

Timeline.prototype.insertGap = function () {
  var gaps = [];

  if (this.home.length > 0) {
    this.home[0].gaps.home = true;
    gaps.push(this.home[0]);
  }
  if (this.mentions.length > 0) {
    this.mentions[0].gaps.mentions = true;
    gaps.push(this.mentions[0]);
  }

  return gaps;
};

Timeline.prototype.closeGap = function (timeline, sinceId, newTweets) {
  var self = this;
  var oldTweets;
  var hash;

  oldTweets = this[timeline];
  hash = this.hash[timeline];

  var local = _.map(newTweets, function (newTweet) {
    return self.saveTweet(newTweet);
  });

  var index = _.findIndex(oldTweets, function (oldTweet) {
    return oldTweet.id === sinceId;
  });

  local.push(oldTweets[index]);
  local[0].gaps[timeline] = true;

  _.each(local.reverse(), function (tweet) {
    if (index >= 0 && tweet.id === oldTweets[index].id) {
      oldTweets[index].gaps[timeline] = false;
      index--;
    } else if (!hash[tweet.id]) {
      if (index < 0) {
        oldTweets.unshift(tweet);
      } else {
        oldTweets.splice(index + 1, 0, tweet);
      }
      hash[tweet.id] = tweet;
    }
  });

  return local;
};

Timeline.prototype.sliceTweets = function (tweets, maxId, sinceId) {
  if (maxId && this.tweets[maxId]) {
    return _.takeRightWhile(tweets, function (tweet) {
      return tweet.id !== maxId;
    });
  } else if (sinceId && this.tweets[sinceId]) {
    return _.dropRightWhile(tweets, function (tweet) {
      return tweet.id !== sinceId;
    });
  } else {
    return [];
  }
};

Timeline.prototype.deleteTweet = function (tweetId) {
  if (this.tweets[tweetId]) {
    delete this.tweets[tweetId];

    if (this.hash.home[tweetId]) {
      delete this.hash.home[tweetId];
      _.remove(this.home, function (tweet) {
        return tweet.id === tweetId;
      });
    }

    if (this.hash.mentions[tweetId]) {
      delete this.hash.mentions[tweetId];
      _.remove(this.mentions, function (tweet) {
        return tweet.id === tweetId;
      });
    }
  }
};

Timeline.prototype.favoriteTweet = function (tweet) {
  tweet = this.saveTweet(tweet);
  tweet.isFavorited = true;

  return tweet;
};

Timeline.prototype.unfavoriteTweet = function (tweet) {
  tweet = this.saveTweet(tweet);
  tweet.isFavorited = false;

  return tweet;
};

Timeline.prototype.unretweetTweet = function (tweet) {
  tweet = this.saveTweet(tweet);
  tweet.isRetweeted = false;
  if (tweet.retweetedBy && tweet.retweetedBy.length === 0) {
    tweet.retweetedBy = null;
  }

  return tweet;
};

Timeline.prototype.findTweet = function (tweetId) {
  return this.tweets[tweetId];
};

Timeline.prototype.findUser = function (screenname) {
  return this.users[screenname];
};

Timeline.prototype.get = function (timeline, maxId, sinceId) {
  if (maxId || sinceId) {
    return this.sliceTweets(this[timeline], maxId, sinceId);
  } else {
    return this[timeline];
  }
};

Timeline.prototype.setFriends = function (friendIds) {
  var self = this;
  _.each(friendIds, function (friendId) {
    self.friends[friendId] = true;
  });
};

Timeline.prototype.mergeTweet = function (dstTweet, srcTweet) {
  // Retweet status
  dstTweet.retweetId = srcTweet.retweetId || dstTweet.retweetId;
  dstTweet.isRetweeted = srcTweet.isRetweeted || dstTweet.isRetweeted;
  if (dstTweet.retweetedBy && srcTweet.retweetedBy) {
    var retweetedBy = (dstTweet.retweetedBy || [])
      .concat(srcTweet.retweetedBy || []);
    dstTweet.retweetedBy = _.uniq(retweetedBy);
  } else if (dstTweet.retweetedBy || srcTweet.retweetedBy) {
    dstTweet.retweetedBy = srcTweet.retweetedBy || dstTweet.retweetedBy;
  }

  return dstTweet;
};

Timeline.prototype.saveUser = function (user) {
  if (this.users[user.screenname]) {
    _.assign(this.users[user.screenname], user);
  } else {
    this.users[user.screenname] = user;
  }

  return this.users[user.screenname];
};

Timeline.prototype.saveTweet = function (tweet) {
  if (tweet.quote) {
    tweet.quote = this.saveTweet(tweet.quote);
  }
  tweet.user = this.saveUser(tweet.user);

  var oldTweet = this.tweets[tweet.id];
  if (oldTweet) {
    return this.mergeTweet(oldTweet, tweet);
  } else {
    this.tweets[tweet.id] = tweet;
    return tweet;
  }
};

Timeline.prototype.saveTweets = function (tweets) {
  var self = this;
  return _.map(tweets, function (tweet) {
    return self.saveTweet(tweet);
  });
};

Timeline.prototype.saveMessage = function (message) {
  message.sender = this.saveUser(message.sender);
  message.recipient = this.saveUser(message.recipient);

  var oldMessage = this.hash.messages[message.id];
  if (!oldMessage) {
    this.hash.messages[message.id] = message;
    this.messages.push(message);
  }

  return this.hash.messages[message.id];
};

Timeline.prototype.saveMessages = function (messages) {
  var self = this;
  _.each(messages, function (message) {
    return self.saveMessage(message);
  });

  return this.messages;
};

Timeline.prototype.getMessages = function () {
  return this.messages;
};

Timeline.prototype.addTweet = function (newTweet) {
  var tweet = this.saveTweet(newTweet);

  if (!this.hash.home[tweet.id]) {
    this.home.unshift(tweet);
    this.hash.home[tweet.id] = tweet;
  }

  if (!this.hash.mentions[tweet.id] &&
    tweet.mentionsScreenname(this.screenname)) {
    this.mentions.unshift(tweet);
    this.hash.mentions[tweet.id] = tweet;
  }

  return tweet;
};

Timeline.prototype.push = function (timeline, newTweets) {
  var self = this;
  _.each(newTweets, function (newTweet) {
    var tweet = self.saveTweet(newTweet);

    if (!self.hash[timeline][tweet.id]) {
      self[timeline].push(tweet);
      self.hash[timeline][tweet.id] = tweet;
    }
  });
};

Timeline.prototype.findPretext = function (tweet) {
  var pretext = [];

  tweet = this.tweets[tweet.inReplyTo];
  while (tweet) {
    pretext.unshift(tweet);
    tweet = this.tweets[tweet.inReplyTo];
  }

  return pretext;
};

Timeline.prototype.findReplies = function (tweet) {
  var replies;

  replies = _.filter(this.tweets, function (reply) {
    return reply.inReplyTo === tweet.id;
  });

  return replies;
};

module.exports = Timeline;
