'use strict';

var Vue = require('vue');
var Tweet = require('./tweet');
var moment = require('moment');

var template = '<li class="tweetcontainer"><div class="tweet fattweet" v-on="contextmenu: rightclick">'
    + '<section class="fattweetmeta">'
      + '<section class="fattweetmetaleft">'
        + '<img class="tweeticon" v-attr="src: tweet.user.biggerIcon" onerror="this.style.visibility=\'hidden\';" v-touch="tap: doShowProfile" />'
      + '</section>'
      + '<section class="fattweetmetaright">'
        + '<section class="name" v-text="tweet.name"></section>'
        + '<section class="screenname" v-text="tweet.screenname | at"></section>'
      + '</section>'
    + '</section>'
    + '<section class="tweettext" v-html="tweet.status"></section>'
    + '<section class="fattweetretweet" v-if="tweet.retweetedBy">'
      + '<span class="iconic retweeticon" data-glyph="loop-square"></span><span class="retweetname" v-text="tweet.retweetedBy"></span>'
    + '</section>'
    + '<section class="fattweetbottommeta">'
      + '<span class="fattweettime" v-text="formattedTime"></span>'
      + '<span class="fattweetretweetcount" v-if="hasRetweet" v-text="formattedRetweetNum"></span>'
      + '<span class="fattweetfavoritecount" v-if="hasFavorite" v-text="formattedFavoriteNum"></span>'
    + '</section>'
    + '<section class="tweetmedia" v-if="tweet.media">'
      + '<ul class="tweetimagelist">'
        + '<li class="tweetimagebox" v-style="width: \'calc(100% / \' + tweet.media.length + \')\'" v-repeat="tweet.media">'
          + '<a class="tweetimagelink" target="_blank" v-style="background-image: \'url(\' + $value + \':small)\'" v-attr="href: $value" v-text="$value"></a>'
        + '</li>'
      + '</ul>'
    + '</section>'
    + '<section class="quotedtweet" v-if="tweet.quote">'
      + '<section class="quotedmeta">'
        + '<span class="name" v-text="tweet.quote.name"></span>'
        + '&nbsp;'
        + '<span class="screenname" v-text="tweet.quote.screenname | at"></span>'
      + '</section>'
      + '<section class="quotedtext" v-html="tweet.quote.status"></section>'
      + '<section class="tweetmedia" v-if="tweet.quote.media">'
        + '<ul class="tweetimagelist">'
          + '<li class="tweetimagebox" v-style="width: \'calc(100% / \' + tweet.quote.media.length + \')\'" v-repeat="tweet.quote.media">'
            + '<a class="tweetimagelink" target="_blank" v-style="background-image: \'url(\' + $value + \':small)\'" v-attr="href: $value" v-text="$value"></a>'
          + '</li>'
        + '</ul>'
      + '</section>'
    + '</section>'
    + '<ul class="fattweetactions">'
      + '<li class="fattweetaction" v-on="click: doReply"><button class="tweetbutton"><span class="iconic tweetbuttonicon" data-glyph="share"></span></button></li>'
      + '<li class="fattweetaction" v-on="click: doRetweet"><button class="tweetbutton" v-class="disabledbutton: tweet.protected, activetweetbutton: tweet.isRetweeted"><span class="iconic tweetbuttonicon" data-glyph="loop-circular"></span></button></li>'
      + '<li class="fattweetaction" v-on="click: doQuote"><button class="tweetbutton" v-class="disabledbutton: tweet.protected"><span class="iconic tweetbuttonicon" data-glyph="double-quote-serif-left"></span></button></li>'
      + '<li class="fattweetaction" v-on="click: doFavorite"><button class="tweetbutton" v-class="activetweetbutton: tweet.isFavorited" on-tap="favorite:{{ id_str }}"><span class="iconic tweetbuttonicon" data-glyph="star"></span></button></li>'
    + '</ul>'
  + '</div></li>';

var FatTweet = Tweet.extend({
  props: ['tweet', 'username', 'now'],
  template: template,
  computed: {
    formattedRetweetNum: function () {
      return ', ' + this.tweet.retweetCount + (this.tweet.retweetCount > 1 ? ' Retweets' : ' Retweet');
    },
    formattedFavoriteNum: function () {
      return ', ' + this.tweet.favoriteCount + (this.tweet.favoriteCount > 1 ? ' Favorites' : ' Favorite');
    },
    formattedTime: function () {
      var createdAt = moment(new Date(this.tweet.createdAt));
      return createdAt.format('M/D/YY, h:mm A');
    }
  }
});

Vue.component('fatTweet', FatTweet);

module.exports = FatTweet;
