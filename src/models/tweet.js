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
  this.isTweet = true;

  // Tweet status
  if (tweet.retweeted_status) {
    if (tweet.user.screen_name === screenname) {
      this.isRetweeted = true;
    } else {
      this.retweetedBy = [
        {
          name: tweet.user.name,
          screenname: tweet.user.screen_name
        }
      ];
    }
    this.retweetId = tweet.id_str;
    tweet = tweet.retweeted_status;
  }

  this.id = tweet.id_str;

  var base = tweet.extended_tweet || tweet;
  this.rawStatus = base.full_text || base.text;
  if (base.entities && base.entities.media) {
    base.entities.media = base.entities.media.slice(0, 1);
  }
  this.status = (
    base.entities ? twitterText.autoLinkWithJSON(this.rawStatus, base.entities, options)
    : twitterText.autoLink(this.rawStatus, options)
  );
  this.inReplyTo = tweet.in_reply_to_status_id_str;
  this.isRetweeted = this.isRetweeted || tweet.retweeted;
  this.retweetId = this.retweetId || (tweet.current_user_retweet ? tweet.current_user_retweet.id_str : null);
  this.isFavorited = tweet.favorited;
  this.retweetCount = tweet.retweet_count;
  this.favoriteCount = tweet.favorite_count;

  this.user = new User(tweet.user);

  this.mentions = (base.entities ?
    _.map(base.entities.user_mentions, function (k) {
      return k.screen_name;
    }) : []
  );

  this.media = (base.extended_entities ?
    _.map(base.extended_entities.media, function (k) {
      var mediaObj = {
        url: k.media_url_https,
        type: k.type,
        size: {
          width: k.sizes.large.w,
          height: k.sizes.large.h
        }
      };
      if (k.type === 'animated_gif' || k.type === 'video' ) {
        var video = _.find(k.video_info.variants, function (variant) {
          return variant.content_type === 'video/webm';
        }) || _.sortBy(_.filter(k.video_info.variants, function (variant) {
          return variant.content_type === 'video/mp4';
        }), function (videoObj) {
          return -videoObj.bitrate;
        });
        if (video) {
          video = _.isArray(video) ? video[0] : video;
          mediaObj.video = {
            type: video.content_type,
            url: video.url
          };

          if (k.type === 'video') {
            var parts = video.url.split('/');
            var size = parts[parts.length - 2].split('x');
            mediaObj.size = {
              width: +size[0],
              height: +size[1]
            }
          }
        }
      }
      return mediaObj;
    }) : null
  );

  // Quote info
  if (tweet.quoted_status) {
    this.quote = new Tweet(tweet.quoted_status);
  } else {
    this.quote = null;
  }

  this.createdAt = tweet.created_at;
  this.gaps = {
    home: false,
    mentions: false
  };
};

Tweet.prototype.mentionsScreenname =  function (screenname) {
  return _.includes(this.mentions, screenname);
};

module.exports = Tweet;
