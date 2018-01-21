<style lang="sass">
@import '../assets/const';

.box {
  -webkit-animation: fadeIn .7s;
  border-bottom: 1px solid #ddd;
}

.tweet {
  padding: .75rem;
  font-size: .75rem;
  cursor: default;
  display: flex;

  @at-root .activetweet {
    background-color: #f3f3f3;
  }

  &left {
    flex-shrink: 0;

    @at-root .tweeticon {
      height: 3rem;
      width: 3rem;
      margin-right: .75rem;
      border-radius: .25rem;
      border: 1px solid #eee;
    }
  }

  &right {
    flex-grow: 1;
    overflow: hidden;

    @at-root .tweettext {
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    @at-root .tweetretweet {
      margin-top: .25rem;
      color: #777;

      &icon:empty:before {
        color: #777;
        vertical-align: middle;
      }
    }

    @at-root .quotedtweet {
      margin-top: $tweet-internal-margin-top;
      padding: .5rem;
      background-color: #eee;
      border-radius: .25rem;

      @at-root .quotedmeta {
        line-height: 1rem;
      }

      @at-root .quotedtext {
        white-space: pre-wrap;
      }
    }
  }

  @at-root .name {
    color: #333;
    font-weight: bold;
  }

  @at-root .screenname {
    color: #999;
    font-size: 0.6875rem;
  }
}

.tweetmeta {
  display: flex;
  flex-wrap: nowrap;
  white-space: nowrap;
  line-height: 1.25rem;

  &left, &right {
    display: inline-block;
  }

  &left {
    flex-grow: 1;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &right {
    flex-shrink: 0;
    color: #999;
    font-size: 0.6875rem;
  }
}

.tweettime {
  min-width: 1.5rem;
  display: inline-block;
  text-align: right;
}

@-webkit-keyframes fadeInInlineFromNone {
    0% {
      opacity: 0;
    }
    1% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
}

.tweetcontrols {
  @at-root .tweet .tweetcontrols {
    display: none;
  }

  @at-root .tweet:hover .tweetcontrols {
    display: inline-block;
    animation-fill-mode: forwards;
    animation: fadeInInlineFromNone .3s;
  }

  @at-root .activetweet .tweet .tweetcontrols {
    display: inline-block;
  }

  @at-root .tweetbutton {
    border: none;
    background: none;
    padding: 0 .125rem;
    margin-left: .375rem;
    outline: none;
    vertical-align: text-bottom;

    &icon:empty:before {
      font-size: .6875rem;
      color: #333;
    }

    &.disabled {
      cursor: default;
    }

    &.disabled .tweetbuttonicon:empty:before {
      color: #999;
      cursor: default;
    }

    &.active.retweetbutton .tweetbuttonicon:empty:before {
      color: $blue;
    }

    &.active.favoritebutton .tweetbuttonicon:empty:before {
      color: $yellow;
      -webkit-text-stroke: 1px #c93;
    }

    &:hover .tweetbuttonicon:empty:before {
      color: $blue;
    }

    &:active .tweetbuttonicon:empty:before {
      transform: translateY(.0625rem);
    }

    &.disabled:hover .tweetbuttonicon:empty:before {
      color: #999;
    }

    &.disabled:active .tweetbuttonicon:empty:before {
      transform: translateY(0);
    }
  }
}

// Fat Tweet

.fattweet {
  padding: .75rem;
  font-size: .875rem;
  cursor: default;

  @at-root .fattweetmeta {
    display: flex;

    .name, .screenname {
      display: block;
      line-height: 1rem;
    }

    .name {
      font-size: 1rem;
    }

    .screenname {
      font-size: .875rem;
    }

    @at-root .fattweetmetaright {
      margin: .5rem 0;
    }
  }

  @at-root .fattweettext {
    margin-top: .75rem;
    font-size: 1.125rem;
    color: #333;
    white-space: pre-wrap;
    user-select: text;
  }

  @at-root .fattweetbottommeta {
    margin-top: .75rem;
    color: #999;
    text-transform: uppercase;

    @at-root .fattweettime {
      font-size: .75rem;
    }
  }
}

.fattweetcontrols {
  margin-top: .75rem;
  white-space: nowrap;
  width: 100%;

  @at-root .fattweetbutton {
    display: inline-block;
    width: 25%;
    border: none;
    background: none;
    outline: none;
    padding: 0;
    margin: 0;

    &icon:empty:before {
      font-size: 1rem;
    }

    &icon:active:empty:before {
      transform: translateY(.125rem);
    }
  }
}

// Gap

@-webkit-keyframes compress {
  0% {
    max-height: 1.5rem;
  }

  100% {
    max-height: 0;
  }
}

@-webkit-keyframes expand {
  0% {
    max-height: 0;
  }

  100% {
    max-height: 1.5rem;
  }
}

.gap {
  background-color: #eee;
  text-transform: uppercase;
  font-size: .625rem;
  text-align: center;
  height: 1.5rem;
  line-height: 1.5rem;
  color: #777;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  overflow: hidden;

  .iconic:before {
    font-size: .5rem;
    margin-right: .25rem;
  }

  .ball-clip-rotate > div {
    border: 1px solid #000;
    height: 1rem;
    width: 1rem;
    margin: .25rem;
  }
}

.gap-enter {
  -webkit-animation: expand .3s;
}

.gap-leave {
  -webkit-animation: compress .3s;
}
</style>

<template lang="html">
  <li class="box" data-tweet-id="{{tweet.id}}">
    <div class="gap" v-if="tweet.gaps[view]" @click="loadMissing" transition="gap">
      <div v-if="!loading"><span class="iconic" data-glyph="chevron-top" aria-hidden="true"></span> Load missing tweets</div>
      <div v-if="loading" class="ball-clip-rotate"><div></div></div>
    </div>
    <div class="tweet" @contextmenu="rightclick" @click="leftclick">
      <div class="tweetleft">
        <img class="tweeticon" :src="tweet.user.biggerIcon" onerror="this.style.visibility='hidden';" @click="doShowProfile" />
      </div>
      <div class="tweetright">
        <section class="tweetmeta">
          <section class="tweetmetaleft">
            <span class="name" v-text="tweet.user.name" @click="doShowProfile"></span>
            <span class="screenname" v-text="tweet.user.screenname | at" @click="doShowProfile"></span>
          </section>
          <section class="tweetmetaright">
            <section class="tweetcontrols">
              <button class="tweetbutton" @click="doReply"><span class="iconic tweetbuttonicon" data-glyph="share"></span></button>
              <button class="tweetbutton retweetbutton" @click="doRetweet" :class="{ disabled: tweet.user.isProtected, active: tweet.isRetweeted }"><span class="iconic tweetbuttonicon" data-glyph="loop-circular"></span></button>
              <button class="tweetbutton" @click="doQuote" :class="{ disabled: tweet.user.isProtected }"><span class="iconic tweetbuttonicon" data-glyph="double-quote-serif-left"></span></button>
              <button class="tweetbutton favoritebutton"  @click="doFavorite" :class="{ active: tweet.isFavorited }"><span class="iconic tweetbuttonicon" data-glyph="star"></span></button>
            </section>
            <span class="tweettime" v-text="timeFrom"></span>
          </section>
        </section>
        <section class="tweettext" v-html="tweet.status"></section>
        <section class="tweetretweet" v-if="tweet.retweetedBy || tweet.isRetweeted">
          <span class="iconic tweetretweeticon" data-glyph="loop-square"></span>
          <span class="retweetname" v-if="tweet.retweetedBy" v-text="lastRetweetedBy.name" @click="doShowScreenname(lastRetweetedBy.screenname)"></span><span class="retweetname" v-if="tweet.isRetweeted && tweet.retweetedBy">&nbsp;and&nbsp;</span><span class="retweetname" v-if="tweet.isRetweeted">You</span>
        </section>
        <component is="tweetMedia" v-if="tweet.media" :media="tweet.media"></component>
        <section class="quotedtweet" v-if="tweet.quote" @click="quoteclick">
          <section class="quotedmeta">
            <span class="name" v-text="tweet.quote.user.name" @click="doShowQuoteProfile"></span>
            <span class="screenname" v-text="tweet.quote.user.screenname | at" @click="doShowQuoteProfile"></span>
          </section>
          <section class="quotedtext" v-html="tweet.quote.status"></section>
          <component is="tweetMedia" v-if="tweet.quote.media" :media="tweet.quote.media"></component>
        </section>
      </div>
    </div>
  </li>
</template>

<script>
'use strict';

var Vue = require('vue');
const {remote, shell} = require('electron');
var contextmenu = require('./contextmenu');
var ipc = require('electron').ipcRenderer;
var _ = require('lodash');
const timefrom = require('./timefrom');
require('./tweetMedia.single.vue');

var Tweet = Vue.extend({
  replace: true,
  props: ['tweet', 'username', 'now', 'view', 'fat'],
  data: function () {
    return {
      loading: false
    }
  },
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
      var createdAt = Math.floor(new Date(this.tweet.createdAt).getTime() / 1000);
      return timefrom(createdAt, this.now);
    }
  },
  methods: {
    doReply: function (event) {
      var self = this;
      var mentions = _.filter(this.tweet.mentions, function (k) {
        return k !== self.username;
      });
      mentions.unshift(this.tweet.user.screenname);
      if (this.tweet.quote && this.tweet.quote.user.screenname !== self.username) {
        mentions.push(this.tweet.quote.user.screenname);
      }
      mentions = _.map(_.uniq(mentions), function (m) {
        return '@' + m;
      }).join(' ');

      this.$dispatch('compose', this.username, this.tweet.id, mentions);
    },
    doRetweet: function (event) {
      if (this.tweet.user.isProtected) {
        return;
      }
      ipc.send('retweet', this.username, this.tweet.id, !this.tweet.isRetweeted);
    },
    doQuote: function (event) {
      if (this.tweet.user.isProtected) {
        return;
      }
      var tweetUrl = 'https://twitter.com/' +
        this.tweet.user.screenname +
        '/status/' +
        this.tweet.id;

      this.$dispatch('compose', this.username, this.tweet.id, tweetUrl, {
        frontFocus: true
      });
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
    doShowQuoteProfile: function () {
      this.$dispatch('showProfile', this.tweet.quote.user);
    },
    rightclick: function (event) {
      var menu = contextmenu.tweet(this);
      menu.popup(remote.getCurrentWindow());
      event.preventDefault();
    },
    leftclick: function (event) {
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
      event.stopPropagation();
    },
    loadMissing: function (event) {
      this.$dispatch('loadMissing', this.tweet.retweetId || this.tweet.id);

      this.loading = true;
      var self = this;
      setTimeout(function () {
        self.loading = false;
      }, 7000);
    }
  },
  transitions: {
  }
});

Vue.component('tweetComponent', Tweet);

module.exports = Tweet;
</script>
