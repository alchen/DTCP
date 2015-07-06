'use strict';

var Twit = require('./lib/twit');
var _ = require('lodash');
var config = require('./config');

var Tweet = require('./models/tweet');
var User = require('./models/user');
var Timeline = require('./models/timeline');

var sendThreshold = 50;
var loadThreshold = 100;

function Stream (oauthToken, oauthTokenSecret, screenname) {
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
    console.log('Stream: friend');
    self.timeline.setFriends(friendsMsg.friends_str);

    // We just connected or we are reconnected
    self.insertGap();
  });

  this.stream.on('tweet', function (tweet) {
    tweet = new Tweet(tweet, self.screenname);

    tweet = self.timeline.addTweet(tweet);

    self.send('newTweet', 'home', tweet);
    if (tweet.mentionsScreenname(screenname)) {
      self.send('newTweet', 'mentions', tweet);
    }
  });

  this.stream.on('delete', function (deleteMessage) {
    var deleteId = deleteMessage.delete.status.id_str;
    self.timeline.deleteTweet(deleteId);
    self.send('deleteTweet', deleteId);
  });

  this.stream.on('favorite', function (favoriteMessage) {
    if (favoriteMessage.source.screen_name === self.screenname) {
      // user favorites a tweet
      var tweet = self.timeline.favoriteTweet(new Tweet(favoriteMessage.target_object, self.screenname));
      if (tweet) {
        self.send('updateTweet', tweet);
      }
    } else {
      // user's tweet is favorited
    }
  });

  this.stream.on('unfavorite', function (unfavoriteMessage) {
    if (unfavoriteMessage.source.screen_name === self.screenname) {
      // user favorites a tweet
      var tweet = self.timeline.unfavoriteTweet(new Tweet(unfavoriteMessage.target_object, self.screenname));
      if (tweet) {
        self.send('updateTweet', tweet);
      }
    } else {
      // user's tweet is favorited
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
    self.send('updateTweet', tweet);
  });
};

Stream.prototype.subscribe = function subscribe(window) {
  console.log('Stream: subscribe');
  this.subscriber = window;
};

Stream.prototype.unsubscribe = function unsubscribe() {
  console.log('Stream: unsubscribe');
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

  if (this.subscriber) {
    var payload = _.map(arguments, function (part) {
      return _.cloneDeep(part, function (i) {
        if (_.isArray(i)) {
          return _.map(i, function (j) {
            return _.cloneDeep(j, function (k) {
              if (k && k.isTweet) {
                return cloneTweet(k);
              }
            });
          });
        } else if (i && i.isTweet) {
          return cloneTweet(i);
        }
      });
    });

    this.subscriber.webContents.send.apply(this.subscriber.webContents, payload);
  }
};

Stream.prototype.initialLoad = function initialLoad() {
  var screenname = this.screenname;

  this.send('initialLoad', screenname);
};

Stream.prototype.saveTweets = function saveTweets(timeline, rawTweets) {
  var self = this;
  var tweets = _.map(rawTweets, function (rawTweet) {
    return new Tweet(rawTweet, self.screenname);
  });

  if (timeline === 'home') {
    this.timeline.pushHome(tweets);
  } else if (timeline === 'mentions') {
    this.timeline.pushMentions(tweets);
  } else {
    // users?
  }
};

Stream.prototype.sendTweets = function (timeline, maxId) {
  var payload = this.timeline.get(timeline, maxId).slice(0, sendThreshold);

  this.send('newTweets', timeline, payload);
};

Stream.prototype.sendFiller = function (timeline, filler) {
  this.send('newFiller', timeline, filler);
};

Stream.prototype.loadSince = function (timeline, sinceId) {
  var self = this;
  var options = { count: loadThreshold, since_id: sinceId };

  this.T.get('statuses/' + timeline + '_timeline', options, function (err, rawTweets, response) {
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
  var options = { count: loadThreshold };

  if (payloadSize > loadThreshold) {
    this.send('newTweets', timeline, payload.slice(0, sendThreshold));
  } else {
    var immediate = payloadSize < sendThreshold ? false : true;
    if (immediate) {
      this.send('newTweets', timeline, payload.slice(0, sendThreshold));
    }
    if (payloadSize > 0) {
      options.max_id = payload[payloadSize - 1].id;
    }
    this.T.get('statuses/' + timeline + '_timeline', options, function (err, rawTweets, response) {
      if (!err) {
        self.saveTweets(timeline, rawTweets);
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
    this.send('newProfileUser', user);
  } else {
    this.T.get('users/show', options, function (err, rawUser, response) {
      if (!err) {
        var user = self.timeline.saveUser(new User(rawUser));
        self.send('newProfileUser', user);
      } else {
        // because user has been suspended and etc.
      }
    });
  }
};

Stream.prototype.loadUser = function loadUser(screenname, maxId) {
  var self = this;
  var options = {screen_name: screenname, count: loadThreshold};

  if (maxId) {
    options.max_id = maxId;
  }

  this.T.get('statuses/user_timeline', options, function (err, rawTweets, response) {
    if (!err) {
      var tweets = _.map(rawTweets, function (rawTweet) {
        return new Tweet(rawTweet, self.screenname);
      });
      var payload = self.timeline.saveTweets(tweets);

      var user = self.timeline.findUser(screenname);
      if (!user) {
        // load another way
        // this should only happen when there's no tweets for the user?
      } else {
        self.send('newProfile', user, payload);
      }
    }
  });
};

Stream.prototype.findContext = function findContext(tweetId) {
  var self = this;
  var tweet = this.timeline.findTweet(tweetId);
  var pretext = this.timeline.findPretext(tweet);
  var replies = this.timeline.findReplies(tweet);
  if (_.size(pretext) === 0 && tweet.inReplyTo) {
    this.T.get('statuses/show/' + tweet.inReplyTo, {include_my_retweet: true}, function (err, data, response) {
      if (!err) {
        var tweet = new Tweet(data, self.screenname);
        self.timeline.saveTweet(tweet);

        self.send('newPretext', [tweet]);
      }
    });
  } else {
    this.send('newPretext', pretext);
  }
  this.send('newReplies', replies);
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
  this.T.post('favorites/destroy', {id: tweetId}, function (err, data, response) {
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
        self.send('updateTweet', tweet);
      }
    });
  };

  var tweet = this.timeline.findTweet(tweetId);
  if (tweet && tweet.retweetId) {
    console.log('REST: known retweet');
    destroyRetweet(tweet.retweetId);
  } else {
    console.log('REST: retrieve unknown retweet');
    this.T.get('statuses/show/' + tweetId, {include_my_retweet: true}, function (err, data, response) {
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
      self.send('deleteTweet', deleteId);
    } else {
      console.log(err);
    }
  });
};

module.exports = Stream;
