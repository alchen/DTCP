'use strict';

var _ = require('lodash');
var twitterText = require('twitter-text');
var User = require('./user');

var options = {
  targetBlank: true,
  usernameIncludeSymbol: true,
  suppressDataScreenName: false,
  suppressNoFollow: true,
  linkAttributeBlock: function (entity, attributes) {
    if (attributes['data-screen-name']) {
      // Prevent linking to profile
      attributes.target = '_self';
    }
  }
};

var Tweet = function (tweet, screenname) {
  // Accommodate different type of events
  this.type = 'tweet';

  // Tweet status
  if (tweet.retweeted_status) {
    if (tweet.user.screen_name === screenname) {
      this.retweetId = tweet.id_str;
      this.isRetweeted = true;
    } else {
      this.retweetedBy = [tweet.user.name];
    }
    tweet = tweet.retweeted_status;
  }

  this.id = tweet.id_str;
  this.rawStatus = tweet.text;
  this.status = (
    tweet.entities ? twitterText.autoLinkWithJSON(tweet.text, tweet.entities, options)
    : twitterText.autoLink(tweet.text, options)
  );
  this.inReplyTo = tweet.in_reply_to_status_id_str;
  this.isRetweeted = this.isRetweeted || tweet.retweeted;
  this.retweetId = this.retweetId || (tweet.current_user_retweet ? tweet.current_user_retweet.id_str : null);
  this.isFavorited = tweet.favorited;
  this.retweetCount = tweet.retweet_count;
  this.favoriteCount = tweet.favorite_count;
  this.createdAt = tweet.created_at;

  // User info
  this.screenname = tweet.user.screen_name;
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

  // Quote info
  if (tweet.quoted_status) {
    this.quote = new Tweet(tweet.quoted_status);
  } else {
    this.quote = null;
  }
};

Tweet.prototype.mentionsScreenname =  function (screenname) {
  return _.includes(this.mentions, screenname);
};

module.exports = Tweet;
