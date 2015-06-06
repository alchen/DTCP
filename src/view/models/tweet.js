'use strict';

var shell = require('shell');
var ipc = require('ipc');
var _ = require('lodash');
var moment = require('moment');
var twitterText = require('twitter-text');
var User = require('./user');

var Tweet = function (tweet) {
  var options = {
    targetBlank: true,
    usernameIncludeSymbol: true
  };

  // Accommodate different type of events
  this.type = 'tweet';

  // Tweet status
  this.id = tweet.id_str;
  this.rawStatus = tweet.text;
  this.formattedStatus = (
    tweet.entities ? twitterText.autoLinkWithJSON(tweet.text, tweet.entities, options)
    : twitterText.autoLink(tweet.text, options)
  );
  this.inReplyTo = tweet.in_reply_to_status_id_str;
  this.isRetweeted = tweet.retweeted;
  this.isFavorited = tweet.favorited;
  this.retweetNum = tweet.retweet_count;
  this.favoriteNum = tweet.favorite_count;
  this.createdAt = moment(new Date(tweet.created_at));

  // User info
  this.screenName = tweet.user.screen_name;
  this.name = tweet.user.name;
  this.userId = tweet.user.id_str;
  this.icon = tweet.user.profile_image_url_https;
  this.protected = tweet.user.protected;

  this.user = new User(tweet.user);

  this.mentions = (tweet.entities ?
    _.map(tweet.entities.user_mentions, function (k) {
      return k.screen_name;
    }) : []
  );

  this.media = (tweet.extended_entities ?
    _.map(tweet.extended_entities.media, function (k) {
      return k.media_url_https;
    }) : null
  );

  if (tweet.retweeted_status) {
    this.retweet = new Tweet(tweet.retweeted_status);
  } else {
    this.retweet = null;
  }

  // Quote info
  if (tweet.quoted_status) {
    this.quote = new Tweet(tweet.quoted_status);
  } else {
    this.quote = null;
  }
};

Tweet.prototype.isUserProtected = function () {
  var self = this.retweet || this.quote || this;
  return self.protected;
};

Tweet.prototype.doReply = function (exclude) {
  var self = this.retweet || this;

  var mentions = _.filter(self.mentions, function (k) {
    return k !== exclude;
  });
  mentions.unshift(self.screenName);

  ipc.send('reply', self.id, mentions);
};

Tweet.prototype.doRetweet = function () {
  var self = this.retweet || this;

  ipc.send('retweet', self.id, !self.isRetweeted);
};

Tweet.prototype.doQuote = function () {
  var self = this.retweet || this;

  var quoteUrl = 'https://twitter.com/'
    + self.screenName
    + '/status/'
    + self.id;

  ipc.send('quote', self.id, quoteUrl);
};

Tweet.prototype.doFavorite = function () {
  var self = this.retweet || this;

  ipc.send('favorite', self.id, !self.isFavorited);
};

Tweet.prototype.doDelete = function () {
  ipc.send('delete', this.id);
};

Tweet.prototype.doShowInBrowser = function () {
  var self = this.retweet || this;

  var url = 'https://twitter.com/'
    + self.screenName
    + '/status/'
    + self.id;

  shell.openExternal(url);
};

module.exports = Tweet;
