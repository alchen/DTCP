'use strict';

var _ = require('lodash');

var Timeline = function (screenname) {
  this.screenname = screenname;

  this.friends = {};

  this.users = {};

  this.tweets = {};
  this.hash = {
    home: {},
    mentions: {}
  };

  this.home = [];
  this.mentions = [];
};

Timeline.prototype.insertGap = function () {
  var gaps = [];
  if (this.home.length > 0) {
    this.home[0].homeGap = true;
    gaps.push(this.home[0]);
  }
  if (this.mentions.length > 0) {
    this.mentions[0].mentionsGap = true;
    gaps.push(this.mentions[0]);
  }

  return gaps;
};

Timeline.prototype.closeGap = function (timeline, sinceId, newTweets) {
  var self = this;
  var oldTweets, hash;

  if (timeline === 'home') {
    oldTweets = this.home;
    hash = this.hash.home;
  } else if (timeline === 'mentions') {
    oldTweets = this.mentions;
    hash = this.hash.mentions;
  }

  var local = _.map(newTweets, function (newTweet) {
    return self.saveTweet(newTweet);
  });

  var index = _.findIndex(oldTweets, function (oldTweet) {
    return oldTweet.id === sinceId;
  });

  local.push(oldTweets[index]);
  local[0].gap = true;

  _.each(local.reverse(), function (tweet) {
    if (index < 0) {
      oldTweets.unshift(tweet);
    } else if (tweet.id === oldTweets[index].id) {
      oldTweets[index].gaps[timeline] = false;
      index--;
    } else {
      oldTweets.splice(index, 0, tweet);
    }
    hash[tweet.id] = tweet;
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
  var self = this;
  tweet = this.saveTweet(tweet);
  tweet.isRetweeted = false;
  tweet.retweetedBy = _.filter(tweet.retweetedBy, function (name) {
    return name !== self.screenname;
  });
  if (tweet.retweetedBy.length === 0) {
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

Timeline.prototype.getHome = function (maxId, sinceId) {
  if (maxId || sinceId) {
    return this.sliceTweets(this.home, maxId, sinceId);
  } else {
    return this.home;
  }
};

Timeline.prototype.getMentions = function (maxId, sinceId) {
  if (maxId || sinceId) {
    return this.sliceTweets(this.mentions, maxId, sinceId);
  } else {
    return this.mentions;
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
    dstTweet.retweetedBy = _.uniq((dstTweet.retweetedBy || []).concat(srcTweet.retweetedBy || []));
  } else {
    dstTweet.retweetedBy = srcTweet.retweetedBy || dstTweet.retweetedBy;
  }

  return dstTweet;
};

Timeline.prototype.saveUser = function (user) {
  this.users[user.screenname] = user;
  return user;
};

Timeline.prototype.saveTweet = function (tweet) {
  this.users[tweet.user.screenname] = tweet.user;

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

Timeline.prototype.addTweet = function (newTweet) {
  var tweet = this.saveTweet(newTweet);

  if (!this.hash.home[tweet.id]) {
    this.home.unshift(tweet);
    this.hash.home[tweet.id] = tweet;
  }

  if (!this.hash.mentions[tweet.id] && tweet.mentionsScreenname(this.screenname)) {
    this.mentions.unshift(tweet);
    this.hash.mentions[tweet.id] = tweet;
  }

  return tweet;
};

Timeline.prototype.pushHome = function (newTweets) {
  var self = this;
  _.each(newTweets, function (newTweet) {
    var tweet = self.saveTweet(newTweet);

    if (!self.hash.home[tweet.id]) {
      self.home.push(tweet);
      self.hash.home[tweet.id] = tweet;
    }
  });
};

Timeline.prototype.pushMentions = function (newTweets) {
  var self = this;
  _.each(newTweets, function (newTweet) {
    var tweet = self.saveTweet(newTweet);

    if (!self.hash.mentions[tweet.id]) {
      self.mentions.push(tweet);
      self.hash.mentions[tweet.id] = tweet;
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
