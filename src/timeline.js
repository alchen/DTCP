'use strict';

var Twit = require('./lib/twit');
var _ = require('lodash');
var config = require('./config');

function Timeline (oauthToken, oauthTokenSecret, screenName) {
  var self = this;

  this.T = new Twit({
    consumer_key: config.consumerKey,
    consumer_secret: config.consumerSecret,
    access_token: oauthToken,
    access_token_secret: oauthTokenSecret
  });

  this.screenName = screenName;
  this.tweets = {
    home: {},
    mentions: {},
    messages: {}
  };
  this.friends = {};
  this.minTweetCreatedAt = {};
  this.minId = {};
  this.users = {};

  this.stream = this.T.stream('user', {
    stringify_friend_ids: true
  }).on('friends', function (friendsMsg) {
    console.log('Stream: friend');
    _.each(friendsMsg.friends_str, function (friendId) {
      self.friends[friendId] = true;
    });
  }).on('tweet', function (tweet) {
    console.log('Stream: tweet');
    self.handleTweet(tweet, 'home');
    // TODO: also send to mentions
    if (self.subscriber) {
      self.subscriber.webContents.send('newTweet', 'home', tweet);

      var status = tweet.retweeted_status || tweet;

      // Check for entities
      // TODO: this should not happen
      var entities = status.entities;
      if (entities && entities.user_mentions) {
        var mentions = _.filter(entities.user_mentions, function (k) {
          return k.screen_name === self.screenName;
        });

        if (mentions.length > 0) {
          self.subscriber.webContents.send('newTweet', 'mentions', tweet);
        }
      }
    }
  }).on('error', function (err) {
    console.log('Stream: Disconnected and we\'ll just play possum here.');
  });
}

Timeline.prototype.subscribe = function subscribe(window) {
  console.log('Timeline: subscribe');
  this.subscriber = window;
};

Timeline.prototype.getStream = function getStream() {
  return this.stream;
};

Timeline.prototype.unsubscribe = function unsubscribe() {
  console.log('Timeline: unsubscribe');
  this.subscriber = null;
};

Timeline.prototype.findContext = function findContext(tweetId, replyTo) {
  console.log('Timeline: find context');
  // find reply to thread
  var replyTos = [];
  var tweet = this.tweets.home[replyTo] || this.tweets.mentions[replyTo];
  while (tweet) {
    replyTos.unshift(tweet);
    replyTo = tweet.in_reply_to_status_id_str;
    tweet = this.tweets.home[replyTo] || this.tweets.mentions[replyTo];
  }
  if (replyTos.length) {
    console.log('Found precontext!');
    this.subscriber.webContents.send('newPrecontext', replyTos);
  } else {
    // Should load remotely
  }

  // find replies
  var replies = _.filter(this.tweets.home, function (tweet) {
    return tweet.in_reply_to_status_id_str === tweetId;
  });
  if (replies.length) {
    console.log('Found postcontext!');
    this.subscriber.webContents.send('newPostcontext', replies);
  }
};

Timeline.prototype.sendTweet = function sendTweet(tweet, replyTo, sender) {
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

Timeline.prototype.sendTweets = function sendTweets(timeline) {
  console.log('Timeline: send' + timeline);
  var toSend;
  if (timeline === 'home' || timeline === 'mentions' || timeline === 'messages') {
    toSend = _.sortByOrder(this.tweets[timeline], function (it) {
      return (new Date(it.created_at));
    }, [false]);
    this.subscriber.webContents.send('newTweets', timeline, toSend);
  } else {
    toSend = _.sortByOrder(this.users[timeline], function (it) {
      return (new Date(it.created_at));
    }, [false]);
    this.subscriber.webContents.send('newUserTweets', timeline, toSend);
  }
};

Timeline.prototype.handleTweet = function handleTweet(tweet, timeline) {
  if (timeline === 'home' || timeline === 'mentions' || timeline === 'messages') {
    this.tweets[timeline][tweet.id_str] = tweet;
  } else {
    this.users[timeline][tweet.id_str] = tweet;
  }

  var createdAt = new Date(tweet.created_at);
  if (!this.minTweetCreatedAt[timeline] || createdAt < this.minTweetCreatedAt[timeline]) {
    this.minTweetCreatedAt[timeline] = createdAt;
    this.minId[timeline] = tweet.id_str;
  }
};

Timeline.prototype.handleTweets = function handleTweets(data, timeline) {
  var self = this;
  _.each(data, function (tweet) {
    self.handleTweet(tweet, timeline);
  });

};

Timeline.prototype.initialLoad = function initialLoad(timeline) {
  var self = this;

  this.subscriber.webContents.send('initialLoad', {
    home: _.sortByOrder(this.tweets.home, function (it) {
      return (new Date(it.created_at));
    }, [false]),
    mentions: _.sortByOrder(this.tweets.mentions, function (it) {
      return (new Date(it.created_at));
    }, [false]),
    messages: _.sortByOrder(this.tweets.messages, function (it) {
      return (new Date(it.created_at));
    }, [false]),
    user: _.sortByOrder(this.tweets.user, function (it) {
      return (new Date(it.created_at));
    }, [false]),
    screenName: this.screenName
  });

  var load = function (tweets, timeline) {
    if (_.size(tweets) === 0) {
      self.loadMore(timeline);
    }
  };
  _.each(this.tweets, load);
};

Timeline.prototype.loadMore = function loadMore(timeline) {
  var self = this;
  var options = {};

  if (this.minTweetCreatedAt[timeline]) {
    options = {
      count: 100,
      max_id: this.minId[timeline]
    };
  }

  this.T.get('statuses/' + timeline + '_timeline', options, function (err, data, response) {
    console.log('REST: loadMore ' + timeline + ' timeline');
    if (!err) {
      console.log('REST: handle ' + timeline + ' timeline tweets');
      self.handleTweets(data, timeline);
      self.sendTweets(timeline);
    }
  });
};

Timeline.prototype.loadUser = function loadUser(screenName) {
  var self = this;
  var options = {screen_name: screenName};

  if (this.minTweetCreatedAt[screenName]) {
    options = {
      screen_name: screenName,
      count: 100,
      max_id: this.minId[screenName]
    };
  }

  this.T.get('statuses/user_timeline', options, function (err, data, response) {
    console.log('REST: loadUser ' + screenName);
    if (!err) {
      console.log('REST: handle user tweets from ' + screenName);
      self.users[screenName] = self.users[screenName] || {};
      self.handleTweets(data, screenName);
      self.sendTweets(screenName);
    }
  });
};

Timeline.prototype.favorite = function favorite(tweetId) {
  this.T.post('favorites/create', {id: tweetId}, function (err, data, response) {
    if (!err) {
      console.log('REST: favorited');
    } else {
      console.log(err);
    }
  });
};

Timeline.prototype.unfavorite = function unfavorite(tweetId) {
  this.T.post('favorites/destroy', {id: tweetId}, function (err, data, response) {
    if (!err) {
      console.log('REST: unfavorited');
    }
  });
};

Timeline.prototype.retweet = function retweet(tweetId) {
  this.T.post('statuses/retweet/' + tweetId, function (err, data, response) {
    if (!err) {
      console.log('REST: retweeted and got ' + data.id_str);
    } else {
      console.log(err);
    }
  });
};

Timeline.prototype.unretweet = function unretweet(tweetId) {
  var self = this;
  this.T.get('statuses/show/' + tweetId, {include_my_retweet: true}, function (err, data, response) {
    if (!err) {
      var retweetId = data.current_user_retweet.id_str;
      console.log('REST: retrieved retweetId ' + retweetId);
      self.T.post('statuses/destroy/' + retweetId, function (err, data, response) {
        if (!err) {
          console.log('REST: unretweeted');
        }
      });
    }
  });
};

Timeline.prototype.deleteTweet = function deleteTweet(tweetId) {
  this.T.post('statuses/destroy/' + tweetId, function (err, data, response) {
    if (!err) {
      console.log('REST: deleted');
    } else {
      console.log(err);
    }
  });
};

module.exports = Timeline;
