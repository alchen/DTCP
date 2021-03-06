'use strict';

var Twit = require('../lib/twit');
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
    access_token_secret: oauthTokenSecret,
    timeout_ms: 60*1000
  });

  this.screenname = screenname;
  this.timeline = new Timeline(screenname);

  this.homeUpdate = null;
  this.mentionsUpdate = null;
}

Stream.prototype.insertGap = function () {
  var self = this;
  var gaps = this.timeline.insertGap();
  _.each(gaps, function (tweet) {
    self.send('updateTweet', self.screenname, tweet);
  });
};

Stream.prototype.subscribe = function (subscriber) {
  this.subscriber = subscriber;
};

Stream.prototype.unsubscribe = function () {
  this.subscriber = null;
};

Stream.prototype.close = function () {
  console.log('Stream: close');
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

    this.subscriber.send.apply(
      this.subscriber,
      payload
    );
  }
};

Stream.prototype.initialLoad = function initialLoad() {
  var self = this;
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

Stream.prototype.loadMissing = function (timeline, tweetId) {
  var self = this;

  this.T.get('statuses/' + timeline + '_timeline', {
    count: config.loadThreshold,
    since_id: tweetId,
    tweet_mode: 'extended'
  },
  function (err, rawTweets, response) {
    if (!err) {
      var tweets = _.map(rawTweets, function (rawTweet) {
        return new Tweet(rawTweet, self.screenname);
      });
      var filler = self.timeline.closeSince(timeline, tweetId, tweets);
      self.send('newSinceFiller', self.screenname, timeline, filler);
    }
  });
};

Stream.prototype.loadMore = function (timeline, maxId) {
  var self = this;

  var payload = this.timeline.get(timeline, maxId);
  var payloadSize = _.size(payload);
  var options = {
    count: config.loadThreshold,
    tweet_mode: 'extended'
  };

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
  var options = {
    screen_name: screenname,
    count: config.loadThreshold,
    tweet_mode: 'extended'
  };

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

Stream.prototype.sendTweet = function sendTweet(tweet, replyTo, sender, mediaPaths) {
  var self = this;
  var options = {status: tweet};

  if (replyTo) {
    options.in_reply_to_status_id = replyTo;
  }

  if (!mediaPaths || _.isEmpty(mediaPaths)) {
    this.T.post('statuses/update', options, function (err, data, response) {
      if (!err) {
        sender.destroy();
      } else {
        sender.send('saveTweet');
        sender.send('message', 'Cannot send tweet.');
        sender.show();
      }
    });
  } else {
    console.log('Stream: update status with media path');
    var mediaPromises = _.map(mediaPaths, function (path) {
      return new Promise(function (resolve, reject) {
        self.T.postMediaChunked({ file_path: path }, function (err, data, response) {
          if (!err) {
            resolve(data.media_id_string);
          } else {
            console.log('Stream: media upload errored');
            reject(err);
          }
        });
      });
    });

    Promise.all(mediaPromises)
      .then(function (media_ids) {
        options.media_ids = media_ids;
        self.T.post('statuses/update', options, function (err, data, response) {
          if (!err) {
            sender.destroy();
          } else {
            console.log('Stream: status upload error');
            console.log(err);
            sender.send('saveTweet');
            sender.send('message', 'Cannot send tweet.');
            sender.show();
          }
        });
      }, function (errs) {
        console.log('Stream: send tweet aborted');
        console.log(errs);
        sender.send('saveTweet');
        sender.send('message', 'Cannot upload media.');
        sender.show();
      });
  }
};

Stream.prototype.sendMessage = function sendTweet(recipient, message) {
  var self = this;
  var options = {
    screen_name: recipient,
    text: message
  };

  this.T.post('direct_messages/new', options, function (err, data, response) {
    if (!err) {
      // yay!
      console.log('Rest: message sent')
    } else {
      // do nothing
      console.log('Rest: message send failed')
    }
  });
};

Stream.prototype.favorite = function favorite(tweetId) {
  var self = this;
  this.T.post('favorites/create', {id: tweetId}, function (err, data, response) {
    if (!err) {
      console.log('REST: favorited');
    } else {
      if (err.code && err.code === 139) {
        var tweet = self.timeline.findTweet(tweetId);
        if (tweet) {
          tweet.isFavorited = true;
          self.send('updateTweet', self.screenname, tweet);
        }
      }
    }
  });
};

Stream.prototype.unfavorite = function unfavorite(tweetId) {
  var self = this;
  this.T.post('favorites/destroy', {id: tweetId},
  function (err, data, response) {
    if (!err) {
      console.log('REST: unfavorited');
    } else {
      if (err.code && err.code === 144) {
        var tweet = self.timeline.findTweet(tweetId);
        if (tweet) {
          tweet.isFavorited = false;
          self.send('updateTweet', self.screenname, tweet);
        }
      }
    }
  });
};

Stream.prototype.retweet = function retweet(tweetId) {
  var self = this;
  this.T.post('statuses/retweet/' + tweetId, function (err, data, response) {
    if (!err) {
      console.log('REST: retweeted and got ' + data.id_str);
    } else {
      console.log(err);
      if (err.code && err.code === 327) {
        var tweet = self.timeline.findTweet(tweetId);
        if (tweet) {
          tweet.isRetweeted = true;
          self.send('updateTweet', self.screenname, tweet);
        }
      }
    }
  });
};

Stream.prototype.unretweet = function unretweet(tweetId) {
  var self = this;

  var destroyRetweet = function (retweetId) {
    self.T.post('statuses/destroy/' + retweetId, function (err, data, response) {
      if (!err) {
        console.log('REST: unretweeted');
        var tweet = self.timeline.unretweetTweet(new Tweet(data, self.screenname));
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

Stream.prototype.getMentionSuggestions = function (target) {
  return _.map(this.timeline.getRelevantUsers(target), function (user) {
    return _.pick(user, ['screenname', 'name', 'biggerIcon']);
  });
};

Stream.prototype.autoUpdate = function () {
  var self = this;
  var update = function (timeline) {
    var tweets = self.timeline.get(timeline)
    if (tweets.length == 0) {
      return
    }
    var tweetId = tweets[0].retweetId || tweets[0].id

    console.log(tweetId)
    self.T.get('statuses/' + timeline + '_timeline', {
      count: config.loadThreshold,
      since_id: tweetId,
      tweet_mode: 'extended'
    },
    function (err, rawTweets, response) {
      if (!err) {
        var tweets = _.map(rawTweets, function (rawTweet) {
          return new Tweet(rawTweet, self.screenname);
        });
        var filler = self.timeline.closeSince(timeline, tweetId, tweets);
        self.send('newSinceFiller', self.screenname, timeline, filler);
      }
    });
  }

  clearInterval(this.homeUpdate)
  clearInterval(this.mentionsUpdate)

  setTimeout(function () {
    update('home')
  }, 1000 * 3)

  setTimeout(function () {
    update('mentions')
  }, 1000 * 3)

  this.homeUpdate = setInterval(function () {
    update('home')
  }, 1000 * 60 * 2)

  this.mentionsUpdate = setInterval(function () {
    update('mentions')
  }, 1000 * 60 * 2)
};

module.exports = Stream;
