'use strict';

var Vue = require('Vue');
var moment = require('moment');
var remote = require('remote');
var contextmenu = require('./contextmenu');

var template = '<div class="tweet" v-on="contextmenu: rightclick, click: leftclick">'
    + '<section class="tweetleft">'
      + '<img class="tweeticon" v-attr="src: displayIcon" onerror="this.style.visibility=\'hidden\';" />'
    + '</section>'
    + '<section class="tweetright">'
      + '<section class="tweetmeta">'
        + '<section class="tweetmetaleft">'
          + '<span class="name" v-text="displayName"></span>'
          + '&nbsp;'
          + '<span class="screenname" v-text="displayScreenName | at"></span>'
        + '</section>'
        + '<section class="tweetmetaright">'
          + '<span class="tweettime" v-text="timeFrom"></span>'
          + '<ul class="tweetactions">'
            + '<li class="tweetaction" v-on="click: doReply"><button class="tweetbutton"><span class="iconic tweetbuttonicon" data-glyph="share"></span></button></li>'
            + '<li class="tweetaction" v-on="click: doRetweet"><button class="tweetbutton" v-class="disabledbutton: isUserProtected, activetweetbutton: isRetweeted"><span class="iconic tweetbuttonicon" data-glyph="loop-circular"></span></button></li>'
            + '<li class="tweetaction" v-on="click: doQuote"><button class="tweetbutton" v-class="disabledbutton: isUserProtected"><span class="iconic tweetbuttonicon" data-glyph="double-quote-serif-left"></span></button></li>'
            + '<li class="tweetaction" v-on="click: doFavorite"><button class="tweetbutton" v-class="activetweetbutton: isFavorited" on-tap="favorite:{{ id_str }}"><span class="iconic tweetbuttonicon" data-glyph="star"></span></button></li>'
          + '</ul>'
        + '</section>'
      + '</section>'
      + '<section class="tweettext" v-html="status"></section>'
      + '<section class="tweetretweet" v-if="retweet">'
        + '<span class="iconic retweeticon" data-glyph="loop-square"></span><span class="retweetname" v-text="name"></span>'
      + '</section>'
      + '<section class="tweetmedia" v-if="media">'
        + '<ul class="tweetimagelist">'
          + '<li class="tweetimagebox" v-style="width: \'calc(100% / \' + media.length + \')\'" v-repeat="media">'
            + '<a class="tweetimagelink" target="_blank" v-style="background-image: \'url(\' + $value + \':small)\'" v-attr="href: $value" v-text="$value"></a>'
          + '</li>'
        + '</ul>'
      + '</section>'
      + '<section class="quotedtweet" v-if="quote">'
        + '<section class="quotedmeta">'
          + '<span class="name" v-text="quote.name"></span>'
          + '&nbsp;'
          + '<span class="screenname" v-text="quote.screenName | at"></span>'
        + '</section>'
        + '<section class="quotedtext" v-html="quote.formattedStatus"></section>'
        + '<section class="tweetmedia" v-if="quote.media">'
          + '<ul class="tweetimagelist">'
            + '<li class="tweetimagebox" v-style="width: \'calc(100% / \' + quote.media.length + \')\'" v-repeat="quote.media">'
              + '<a class="tweetimagelink" target="_blank" v-style="background-image: \'url(\' + $value + \':small)\'" v-attr="href: $value" v-text="$value"></a>'
            + '</li>'
          + '</ul>'
        + '</section>'
      + '</section>'
    + '</section>'
  + '</div>';

var Tweet = Vue.extend({
  created: function () {
    this.username = this.$data.username;
    this.now = this.$data.now;
  },
  paramAttributes: ['username', 'now'],
  template: template,
  filters: {
    at: function (name) {
      return '@' + name;
    }
  },
  computed: {
    displayIcon: function () {
      var self = this.$data.retweet || this.$data;
      return self.icon;
    },
    displayName: function () {
      var self = this.$data.retweet || this.$data;
      return self.name;
    },
    displayScreenName: function () {
      var self = this.$data.retweet || this.$data;
      return self.screenName;
    },
    status: function () {
      var self = this.$data.retweet || this.$data;
      return self.formattedStatus;
    },
    isUserProtected: function () {
      var self = this.$data.retweet || this.$data.quote || this.$data;
      return self.protected;
    },
    timeFrom: function () {
      var createdAt = this.createdAt;
      var now = this.now;
      var duration = moment.duration(now.diff(createdAt));

      var sign = null;
      if ((sign = duration.as('second')) <= 5) {
        return 'now';
      } else if (sign < 60) {
        return Math.round(sign) + 's';
      } else if ((sign = duration.as('minute')) < 60) {
        return Math.round(sign) + 'm';
      } else if ((sign = duration.as('hour')) < 24) {
        return Math.round(sign) + 'h';
      } else if ((sign = duration.as('day')) <= 365) {
        return Math.round(sign) + 'd';
      } else {
        sign = duration.as('year');
        return Math.round(sign) + 'y';
      }
    }
  },
  methods: {
    doReply: function (event) {
      console.log('Tweet: reply');
      this.$data.doReply(this.username);
      event.stopPropagation();
    },
    doRetweet: function (event) {
      console.log('Tweet: retweet');
      this.$data.doRetweet();
      event.stopPropagation();
    },
    doQuote: function (event) {
      console.log('Tweet: quote');
      this.$data.doQuote();
      event.stopPropagation();
    },
    doFavorite: function (event) {
      console.log('Tweet: favorite');
      this.$data.doFavorite();
      event.stopPropagation();
    },
    doDelete: function (event) {
      console.log('Tweet: delete');
      this.$data.doDelete();
    },
    doShowInBrowser: function (event) {
      console.log('Tweet: Show in browser');
      this.$data.doShowInBrowser();
    },
    rightclick: function (event) {
      var menu = contextmenu.build(this);
      menu.popup(remote.getCurrentWindow());
      event.preventDefault();
    },
    leftclick: function (event) {
      console.log('Tweet: show thread');

      // React if it's not a link
      if (event.target.tagName !== 'A') {
        // this.$data.doShowThread();
        this.$dispatch('showThread', this.$data);
      }
    }
  },
});

Vue.component('tweet', Tweet);

module.exports = Tweet;
