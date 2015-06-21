'use strict';

var _ = require('lodash');

var Timeline = function (screenname) {
  this.screenname = screenname;

  this.friends = {};

  this.users = {};

  this.tweets = {};
  this.homeHash = {};
  this.mentionsHash = {};

  this.home = [];
  this.mentions = [];
};

Timeline.prototype.sliceTweets = function (tweets, maxId) {
  if (this.tweets[maxId]) {
    return _.takeRightWhile(tweets, function (tweet) {
      return tweet.id !== maxId;
    });
  } else {
    return [];
  }
};

Timeline.prototype.deleteTweet = function (tweetId) {
  if (this.tweets[tweetId]) {
    delete this.tweets[tweetId];

    if (this.homeHash[tweetId]) {
      delete this.homeHash[tweetId];
      _.remove(this.home, function (tweet) {
        return tweet.id === tweetId;
      });
    }

    if (this.mentionsHash[tweetId]) {
      delete this.mentionsHash[tweetId];
      _.remove(this.mentions, function (tweet) {
        return tweet.id === tweetId;
      });
    }
  }
};

Timeline.prototype.favoriteTweet = function (tweet) {
  if(!this.tweets[tweet.id]) {
    this.tweets[tweet.id] = tweet;
  }
  tweet = this.tweets[tweet.id];
  tweet.isFavorited = true;

  return tweet;
};

Timeline.prototype.unfavoriteTweet = function (tweet) {
  if(!this.tweets[tweet.id]) {
    this.tweets[tweet.id] = tweet;
  }
  tweet = this.tweets[tweet.id];
  tweet.isFavorited = false;

  return tweet;
};

Timeline.prototype.unretweetTweet = function (tweet) {
  var self = this;
  if(!this.tweets[tweet.id]) {
    this.tweets[tweet.id] = tweet;
  }
  tweet = this.tweets[tweet.id];
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

Timeline.prototype.getHome = function (maxId) {
  if (maxId) {
    return this.sliceTweets(this.home, maxId);  
  } else {
    return this.home;
  }
};

Timeline.prototype.getMentions = function (maxId) {
  if (maxId) {
    return this.sliceTweets(this.mentions, maxId);
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
}

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

  if (!this.homeHash[tweet.id]) {
    this.home.unshift(tweet);
    this.homeHash[tweet.id] = tweet;
  }

  if (!this.mentionsHash[tweet.id] && tweet.mentionsScreenname(this.screenname)) {
    this.mentions.unshift(tweet);
    this.mentionsHash[tweet.id] = tweet;
  }

  return tweet;
};

Timeline.prototype.pushHome = function (newTweets) {
  var self = this;
  _.each(newTweets, function (newTweet) {
    var tweet = self.saveTweet(newTweet);

    if (!self.homeHash[tweet.id]) {
      self.home.push(tweet);
      self.homeHash[tweet.id] = tweet;
    }
  });
};

Timeline.prototype.pushMentions = function (newTweets) {
  var self = this;
  _.each(newTweets, function (newTweet) {
    var tweet = self.saveTweet(newTweet);

    if (!self.mentionsHash[tweet.id]) {
      self.mentions.push(tweet);
      self.mentionsHash[tweet.id] = tweet;
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
