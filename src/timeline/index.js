'use strict';

var Twit = require('../lib/twit');
var _ = require('lodash');

function Timeline (oauthToken, oauthTokenSecret, screenName) {
  var self = this;

  this.T = new Twit({
    consumer_key: '4g0E1FHLfCrZMjjiaD3VXyVmb',
    consumer_secret: '5BqCtFgsHZOnttQT6qSp483erSDVCnUcMX0THCFCe5vnWEv2zC',
    access_token: oauthToken,
    access_token_secret: oauthTokenSecret
  });

  this.screenName = screenName;
  this.tweets = {
    home: {},
    mentions: {},
    messages: {},
    user: {}
  };
  this.friends = {};
  this.minTweetCreatedAt = {};
  this.minId = {};
  this.retweetId = {};

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
    }
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
  var toSend = _.sortByOrder(this.tweets[timeline], function (it) {
    return (new Date(it.created_at));
  }, [false]);
  this.subscriber.webContents.send('newTweets', timeline, toSend);
};

Timeline.prototype.handleTweet = function handleTweet(tweet, timeline) {
  if (tweet.id_str) {
    this.tweets[timeline][tweet.id_str] = tweet;
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

  var sendOrLoad = function (tweets, timeline) {
    if (_.size(tweets) > 0) {
      self.sendTweets(timeline);
    } else {
      self.loadMore(timeline);
    }
  };

  var load = function (tweets, timeline) {
    if (_.size(tweets) == 0) {
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
      // Notify
      self.sendTweets(timeline);
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
  var self = this;
  this.T.post('statuses/retweet/' + tweetId, function (err, data, response) {
    if (!err) {
      console.log('REST: retweeted and got ' + data.id_str);
      self.retweetId[tweetId] = data.id_str;
    } else {
      console.log(err);
    }
  });
};

Timeline.prototype.unretweet = function unretweet(tweetId, retweetId) {
  retweetId = retweetId || this.retweetId[tweetId];
  if (!retweetId) {
    console.log('REST: cannot find retweet ID');
    return;
  }
  this.T.post('statuses/destroy/' + retweetId, function (err, data, response) {
    if (!err) {
      console.log('REST: unretweeted');
    }
  });
};

module.exports = Timeline;
