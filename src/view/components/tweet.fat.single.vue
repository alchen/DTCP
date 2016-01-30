<style lang="sass">

</style>

<template lang="html">
  <li class="box" data-tweet-id="{{tweet.id}}">
    <div class="fattweet" @contextmenu="rightclick" @click="leftclick">
        <section class="fattweetmeta">
          <section class="fattweetmetaleft">
            <img class="tweeticon" :src="tweet.user.biggerIcon" onerror="this.style.visibility=\'hidden\';" @click="doShowProfile" />
          </section>
          <section class="fattweetmetaright">
            <span class="name" v-text="tweet.user.name" @click="doShowProfile"></span>
            <span class="screenname" v-text="tweet.user.screenname | at" @click="doShowProfile"></span>
          </section>
        </section>
        <section class="fattweettext" v-html="tweet.status"></section>
        <section class="tweetretweet" v-if="tweet.retweetedBy || tweet.isRetweeted">
          <span class="iconic tweetretweeticon" data-glyph="loop-square"></span>
          <span class="retweetname" v-if="tweet.retweetedBy" v-text="lastRetweetedBy.name" @click="doShowScreenname(lastRetweetedBy.screenname)"></span><span class="retweetname" v-if="tweet.isRetweeted && tweet.retweetedBy"> and </span><span class="retweetname" v-if="tweet.isRetweeted">You</span>
        </section>
        <section class="fattweetbottommeta">
          <span class="fattweettime" v-text="formattedTime"></span>
          <span class="fattweetretweetcount" v-if="hasRetweet" v-text="formattedRetweetNum"></span>
          <span class="fattweetfavoritecount" v-if="hasFavorite" v-text="formattedFavoriteNum"></span>
        </section>
        <component is="tweetMedia" v-if="tweet.media" :media="tweet.media"></component>
        <section class="quotedtweet" v-if="tweet.quote" @click="quoteclick">
          <section class="quotedmeta">
            <span class="name" v-text="tweet.quote.user.name"></span>
            <span class="screenname" v-text="tweet.quote.user.screenname | at"></span>
          </section>
          <section class="quotedtext" v-html="tweet.quote.status"></section>
          <component is="tweetMedia" v-if="tweet.quote.media" :media="tweet.quote.media"></component>
        </section>
        <section class="fattweetcontrols">
          <button class="fattweetbutton tweetbutton" @click="doReply"><span class="iconic tweetbuttonicon fattweetbuttonicon" data-glyph="share"></span></button>
          <button class="fattweetbutton tweetbutton retweetbutton" @click="doRetweet" :class="{ disabled: tweet.user.isProtected, active: tweet.isRetweeted }"><span class="iconic tweetbuttonicon fattweetbuttonicon" data-glyph="loop-circular"></span></button>
          <button class="fattweetbutton tweetbutton" @click="doQuote" :class="{ disabled: tweet.user.isProtected }"><span class="iconic tweetbuttonicon fattweetbuttonicon" data-glyph="double-quote-serif-left"></span></button>
          <button class="fattweetbutton tweetbutton favoritebutton"  @click="doFavorite" :class="{ active: tweet.isFavorited }"><span class="iconic tweetbuttonicon fattweetbuttonicon" data-glyph="star"></span></button>
        </section>
      </div>
    </div>
  </li>
</template>

<script>
'use strict';

var Vue = require('vue');
var Tweet = require('./tweet.single.vue');
var moment = require('moment');

var FatTweet = Tweet.extend({
  props: ['tweet', 'username', 'now'],
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
</script>
