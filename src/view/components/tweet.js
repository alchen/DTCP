'use strict';

var Vue = require('vue');
var moment = require('moment');
var remote = require('remote');
var contextmenu = require('./contextmenu');
var ipc = require('electron').ipcRenderer;
var shell = require('shell');
var _ = require('lodash');

var template = '<li class="tweetcontainer" data-tweet-id="{{tweet.id}}">' +
  '<div class="gap" v-if="tweet.gaps[view]" @click="loadMissing" transition="gap"><span class="iconic" data-glyph="chevr@top" aria-hidden="true"></span> Load missing tweets</div>' +
  '<div class="tweet" @contextmenu="rightclick" @click="leftclick">' +
    '<section class="tweetleft">' +
      '<img class="tweeticon" :src="tweet.user.biggerIcon" onerror="this.style.visibility=\'hidden\';" @click="doShowProfile" />' +
    '</section>' +
    '<section class="tweetright">' +
      '<section class="tweetmeta">' +
        '<section class="tweetmetaleft">' +
          '<span class="name" v-text="tweet.user.name" @click="doShowProfile"></span>' +
          '&nbsp;' +
          '<span class="screenname" v-text="tweet.user.screenname | at" @click="doShowProfile"></span>' +
        '</section>' +
        '<section class="tweetmetaright">' +
          '<span class="tweettime" v-text="timeFrom" v-if="!tweet.isFavorited"></span>' +
          '<span class="tweetindicator iconic tweetbuttonicon" data-glyph="star" v-if="tweet.isFavorited"></span>' +
          '<ul class="tweetactions">' +
            '<li class="tweetaction" @click="doReply"><button class="tweetbutton"><span class="iconic tweetbuttonicon" data-glyph="share"></span></button></li>' +
            '<li class="tweetaction" @click="doRetweet"><button class="tweetbutton" :class="{ disabledbutton: tweet.user.isProtected, activetweetbutton: tweet.isRetweeted }"><span class="iconic tweetbuttonicon" data-glyph="loop-circular"></span></button></li>' +
            '<li class="tweetaction" @click="doQuote"><button class="tweetbutton" :class="{ disabledbutton: tweet.user.isProtected }"><span class="iconic tweetbuttonicon" data-glyph="double-quote-serif-left"></span></button></li>' +
            '<li class="tweetaction" @click="doFavorite"><button class="tweetbutton" :class="{ activetweetbutton: tweet.isFavorited }"><span class="iconic tweetbuttonicon" data-glyph="star"></span></button></li>' +
          '</ul>' +
        '</section>' +
      '</section>' +
      '<section class="tweettext" v-html="tweet.status"></section>' +
      '<section class="tweetretweet" v-if="tweet.retweetedBy || tweet.isRetweeted">' +
        '<span class="iconic retweeticon" data-glyph="loop-square"></span>' +
        '<span class="retweetname" v-if="tweet.retweetedBy" v-text="lastRetweetedBy.name" @click="doShowScreenname(lastRetweetedBy.screenname)"></span><span class="retweetname" v-if="tweet.isRetweeted && tweet.retweetedBy"> and </span><span class="retweetname" v-if="tweet.isRetweeted">You</span>' +
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
            '<li class="tweetimagebox" :style="{ width: \'calc(100% / \' + tweet.quote.media.length + \')\' }"  v-for="media in tweet.quote.media">' +
              '<a class="tweetimagelink" target="_blank" :style="{ backgroundImage: \'url(\' + media.url + \':small)\' }" :href="media.display" v-text="media.display"></a>' +
            '</li>' +
          '</ul>' +
        '</section>' +
      '</section>' +
    '</section>' +
  '</div></li>';

var Tweet = Vue.extend({
  replace: true,
  props: ['tweet', 'username', 'now', 'view'],
  template: template,
  filters: {
    at: function (name) {
      return '@' + name;
    }
  },
  computed: {
    lastRetweetedBy: function () {
      return this.tweet.retweetedBy[this.tweet.retweetedBy.length - 1];
    },
    timeFrom: function () {
      var createdAt = moment(new Date(this.tweet.createdAt));
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
      var self = this;
      var mentions = _.filter(this.tweet.mentions, function (k) {
        return k !== self.username;
      });
      mentions.unshift(this.tweet.user.screenname);

      ipc.send('reply', this.username, this.tweet.id, mentions);
    },
    doRetweet: function (event) {
      ipc.send('retweet', this.username, this.tweet.id, !this.tweet.isRetweeted);
    },
    doQuote: function (event) {
      var tweetUrl = 'https://twitter.com/' +
        this.tweet.user.screenname +
        '/status/' +
        this.tweet.id;

      ipc.send('quote', this.username, this.tweet.id, tweetUrl);
    },
    doFavorite: function (event) {
      ipc.send('favorite', this.username, this.tweet.id, !this.tweet.isFavorited);
    },
    doDelete: function (event) {
      ipc.send('delete', this.username, this.tweet.id);
    },
    doShowInBrowser: function (event) {
      var tweetUrl = 'https://twitter.com/' +
        this.tweet.user.screenname +
        '/status/' +
        this.tweet.id;

      shell.openExternal(tweetUrl);
    },
    doShowScreenname: function (screenname) {
      this.$dispatch('showScreenname', screenname);
    },
    doShowProfile: function () {
      this.$dispatch('showProfile', this.tweet.user);
    },
    rightclick: function (event) {
      var menu = contextmenu.tweet(this);
      menu.popup(remote.getCurrentWindow());
      event.preventDefault();
    },
    leftclick: function (event) {
      if (event.target.tagName === 'SECTION') {
        var el = event.target;
        do {
          if (el.classList.contains('quotedtweet')) {
            // because this is handled separately in quoteclick() below
            return;
          }
          el = el.parentElement;
        }
        while (el);
      }

      if (event.target.tagName === 'A') {
        var screenname = event.target.getAttribute('data-screen-name');
        if (screenname) {
          this.doShowScreenname(screenname);
        }
      } else if (event.target.tagName !== 'SPAN' &&
        event.target.tagName !== 'BUTTON' &&
        event.target.tagName !== 'IMG') {
        // Avoid firing on wrong elements
        this.$dispatch('showThread', this.tweet);
      }
    },
    quoteclick: function (event) {
      if (event.target.tagName === 'A') {
        var screenname = event.target.getAttribute('data-screen-name');
        if (screenname) {
          this.doShowScreenname(screenname);
        }
      } else if (event.target.tagName !== 'SPAN' &&
        event.target.tagName !== 'BUTTON' &&
        event.target.tagName !== 'IMG') {
        // Avoid firing on wrong elements
        this.$dispatch('showThread', this.tweet.quote);
      }
    },
    loadMissing: function (event) {
      this.$dispatch('loadSince', this.tweet.id);
    }
  },
  transitions: {
  }
});

Vue.component('tweetComponent', Tweet);

module.exports = Tweet;
