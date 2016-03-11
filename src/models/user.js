'use strict';

var twitterText = require('twitter-text');

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

var User = function (user) {
  // Accommodate different type of events
  this.type = 'user';

  // Tweet status
  this.id = user.id_str;

  // User info
  this.screenname = user.screen_name;
  this.name = user.name;
  this.icon = user.profile_image_url_https;
  this.biggerIcon = this.icon.replace('_normal', '_bigger');
  this.originalIcon = this.icon.replace('_normal', '');

  if (user.profile_banner_url) {
    this.profileBackground = user.profile_banner_url + '/web_retina';
  }

  this.description = user.description ? twitterText.autoLink(user.description, options) : '';


  this.url = user.url;

  this.expandedUrl = user.url && user.entities ?
    user.entities.url.urls[0].expanded_url : null;
  this.location = user.location;

  this.followersCount = user.followers_count;
  this.friendsCount = user.friends_count;
  this.listedCount = user.listed_count;
  this.favoritesCount = user.favourites_count;
  this.statusesCount = user.statuses_count;

  this.isProtected = user.protected;
  this.isFollowing = user.following;
  this.isPending = user.follow_request_sent;
};

module.exports = User;
