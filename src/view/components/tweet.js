'use strict';

var Vue = require('vue');
var vueTouch = require('vue-touch');
Vue.use(vueTouch);
var moment = require('moment');
var remote = require('remote');
var contextmenu = require('./contextmenu');

var template = '<li class="tweetcontainer"><div class="tweet" v-on="contextmenu: rightclick" v-touch="tap: leftclick">'
    + '<section class="tweetleft">'
      + '<img class="tweeticon" v-attr="src: displayIcon" onerror="this.style.visibility=\'hidden\';" v-touch="tap: doShowProfile" />'
    + '</section>'
    + '<section class="tweetright">'
      + '<section class="tweetmeta">'
        + '<section class="tweetmetaleft">'
          + '<span class="name" v-text="displayName" v-touch="tap: doShowProfile"></span>'
          + '&nbsp;'
          + '<span class="screenname" v-text="displayScreenName | at" v-touch="tap: doShowProfile"></span>'
        + '</section>'
        + '<section class="tweetmetaright">'
          + '<span class="tweettime" v-text="timeFrom"></span>'
          + '<ul class="tweetactions">'
            + '<li class="tweetaction" v-on="click: doReply"><button class="tweetbutton"><span class="iconic tweetbuttonicon" data-glyph="share"></span></button></li>'
            + '<li class="tweetaction" v-on="click: doRetweet"><button class="tweetbutton" v-class="disabledbutton: isUserProtected, activetweetbutton: isRetweeted"><span class="iconic tweetbuttonicon" data-glyph="loop-circular"></span></button></li>'
            + '<li class="tweetaction" v-on="click: doQuote"><button class="tweetbutton" v-class="disabledbutton: isUserProtected"><span class="iconic tweetbuttonicon" data-glyph="double-quote-serif-left"></span></button></li>'
            + '<li class="tweetaction" v-on="click: doFavorite"><button class="tweetbutton" v-class="activetweetbutton: isFavorited"><span class="iconic tweetbuttonicon" data-glyph="star"></span></button></li>'
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
      + '<section class="quotedtweet" v-if="quoteStatus">'
        + '<section class="quotedmeta">'
          + '<span class="name" v-text="quoteStatus.name"></span>'
          + '&nbsp;'
          + '<span class="screenname" v-text="quoteStatus.screenName | at"></span>'
        + '</section>'
        + '<section class="quotedtext" v-html="quoteStatus.formattedStatus"></section>'
        + '<section class="tweetmedia" v-if="quoteStatus.media">'
          + '<ul class="tweetimagelist">'
            + '<li class="tweetimagebox" v-style="width: \'calc(100% / \' + quoteStatus.media.length + \')\'" v-repeat="quoteStatus.media">'
              + '<a class="tweetimagelink" target="_blank" v-style="background-image: \'url(\' + $value + \':small)\'" v-attr="href: $value" v-text="$value"></a>'
            + '</li>'
          + '</ul>'
        + '</section>'
      + '</section>'
    + '</section>'
  + '</div></li>';

var Tweet = Vue.extend({
  replace: true,
  props: ['username', 'now'],
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
    quoteStatus: function () {
      var self = this.$data.retweet || this.$data;
      return self.quote;
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
    },
    doRetweet: function (event) {
      console.log('Tweet: retweet');
      this.$data.doRetweet();
    },
    doQuote: function (event) {
      console.log('Tweet: quote');
      this.$data.doQuote();
    },
    doFavorite: function (event) {
      console.log('Tweet: favorite');
      this.$data.doFavorite();
    },
    doDelete: function (event) {
      console.log('Tweet: delete');
      this.$data.doDelete();
    },
    doShowInBrowser: function (event) {
      console.log('Tweet: Show in browser');
      this.$data.doShowInBrowser();
    },
    doShowProfile: function () {
      var self = this.$data.retweet || this.$data;
      this.$dispatch('showProfile', self.user);
    },
    rightclick: function (event) {
      var menu = contextmenu.build(this);
      menu.popup(remote.getCurrentWindow());
      event.preventDefault();
    },
    leftclick: function (event) {
      console.log('Tweet: show thread');

      // React if it's not a link
      if (event.target.tagName !== 'A'
        && event.target.tagName !== 'SPAN'
        && event.target.tagName !== 'BUTTON'
        && event.target.tagName !== 'IMG') {
        this.$dispatch('showThread', this.$data);
      }
    }
  },
});

Vue.component('tweet', Tweet);

module.exports = Tweet;
