'use strict';

var Vue = require('vue');
var Tweet = require('./tweet');
var moment = require('moment');

var template = '<li class="tweetcontainer" data-tweet-id="{{tweet.id}}"><div class="tweet fattweet" @contextmenu="rightclick" @click="leftclick">' +
    '<section class="fattweetmeta" @click="doShowProfile">' +
      '<section class="fattweetmetaleft">' +
        '<img class="tweeticon" :src="tweet.user.biggerIcon" onerror="this.style.visibility=\'hidden\';" />' +
      '</section>' +
      '<section class="fattweetmetaright">' +
        '<section class="name" v-text="tweet.user.name"></section>' +
        '<section class="screenname" v-text="tweet.user.screenname | at"></section>' +
      '</section>' +
    '</section>' +
    '<section class="tweettext" v-html="tweet.status"></section>' +
    '<section class="fattweetretweet" v-if="tweet.retweetedBy">' +
      '<span class="iconic retweeticon" data-glyph="loop-square"></span>' +
      '<span class="retweetname" v-if="tweet.retweetedBy" v-text="lastRetweetedBy.name" @click="doShowScreenname(lastRetweetedBy.screenname)"></span><span class="retweetname" v-if="tweet.isRetweeted && tweet.retweetedBy"> and </span><span class="retweetname" v-if="tweet.isRetweeted">You</span>' +
    '</section>' +
    '<section class="fattweetbottommeta">' +
      '<span class="fattweettime" v-text="formattedTime"></span>' +
      '<span class="fattweetretweetcount" v-if="hasRetweet" v-text="formattedRetweetNum"></span>' +
      '<span class="fattweetfavoritecount" v-if="hasFavorite" v-text="formattedFavoriteNum"></span>' +
    '</section>' +
    '<section class="tweetmedia" v-if="tweet.media">' +
      '<ul class="tweetimagelist">' +
        '<li class="tweetimagebox" :style="{ width: \'calc(100% / \' + tweet.media.length + \')\' }" v-for="media in tweet.media">' +
          '<a class="tweetimagelink" target="_blank" :style="{ backgroundImage: \'url(\' + media.url + \':small)\' }" :href="media.display" v-text="media.display"></a>' +
        '</li>' +
      '</ul>' +
    '</section>' +
    '<section class="quotedtweet" v-if="tweet.quote" @click="quoteclick">' +
      '<section class="quotedmeta">' +
        '<span class="name" v-text="tweet.quote.user.name"></span>' +
        '&nbsp;' +
        '<span class="screenname" v-text="tweet.quote.user.screenname | at"></span>' +
      '</section>' +
      '<section class="quotedtext" v-html="tweet.quote.status"></section>' +
      '<section class="tweetmedia" v-if="tweet.quote.media">' +
        '<ul class="tweetimagelist">' +
          '<li class="tweetimagebox" :style="{ width: \'calc(100% / \' + tweet.quote.media.length + \')\' }" v-for="media in tweet.quote.media">' +
            '<a class="tweetimagelink" target="_blank" :style="{ backgroundImage: \'url(\' + media.url + \':small)\' }" :href="media.display" v-text="media.display"></a>' +
          '</li>' +
        '</ul>' +
      '</section>' +
    '</section>' +
    '<ul class="fattweetactions">' +
      '<li class="fattweetaction" @click="doReply"><button class="tweetbutton"><span class="iconic tweetbuttonicon" data-glyph="share"></span></button></li>' +
      '<li class="fattweetaction" @click="doRetweet"><button class="tweetbutton" :class="{ disabledbutton: tweet.user.isProtected, activetweetbutton: tweet.isRetweeted }"><span class="iconic tweetbuttonicon" data-glyph="loop-circular"></span></button></li>' +
      '<li class="fattweetaction" @click="doQuote"><button class="tweetbutton" :class="{ disabledbutton: tweet.user.isProtected }"><span class="iconic tweetbuttonicon" data-glyph="double-quote-serif-left"></span></button></li>' +
      '<li class="fattweetaction" @click="doFavorite"><button class="tweetbutton" :class="{ activetweetbutton: tweet.isFavorited }"><span class="iconic tweetbuttonicon" data-glyph="star"></span></button></li>' +
    '</ul>' +
  '</div></li>';

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
