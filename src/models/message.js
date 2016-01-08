'use strict';

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

var Message = function (message) {
  // Accommodate different type of events
  this.isMessage = true;

  this.id = message.id_str;
  this.rawStatus = message.text;
  this.status = (
    message.entities ? twitterText.autoLinkWithJSON(message.text, message.entities, options)
    : twitterText.autoLink(message.text, options)
  );

  this.sender = new User(message.sender);
  this.recipient = new User(message.recipient);

  this.createdAt = message.created_at;
};

module.exports = Message;
