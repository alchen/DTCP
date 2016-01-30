<style lang="sass">
</style>

<template lang="html">
  <li class="box" data-tweet-id="{{topMessage.id}}">
    <div class="tweet" @click="leftclick">
      <section class="tweetleft">
        <img class="tweeticon" :src="correspondent.biggerIcon" onerror="this.style.visibility=\'hidden\';" @click="doShowProfile" />
      </section>
      <section class="tweetright">
        <section class="tweetmeta">
          <section class="tweetmetaleft">
            <span class="name" v-text="correspondent.name" @click="doShowProfile"></span>
            &nbsp;
            <span class="screenname" v-text="correspondent.screenname | at" @click="doShowProfile"></span>
          </section>
          <section class="tweetmetaright">
            <span class="tweettime" v-text="timeFrom"></span>
          </section>
        </section>
        <section class="tweettext"><span class="iconic iconic-sm messagereply" v-if="topMessage.sender.screenname === username" data-glyph="carriage-return" aria-hidden="true"></span>{{{topMessage.status}}}</section>
      </section>
    </div>
  </li>
</template>

<script>
'use strict';

var Vue = require('vue');
var moment = require('moment');

var MessageTop = Vue.extend({
  replace: true,
  props: ['group', 'username', 'now'],
  filters: {
    at: function (name) {
      return '@' + name;
    }
  },
  computed: {
    topMessage: function () {
      return this.group[0];
    },
    correspondent: function () {
      if (this.topMessage.sender.screenname === this.username) {
        return this.topMessage.recipient;
      } else {
        return this.topMessage.sender;
      }
    },
    timeFrom: function () {
      var createdAt = moment(new Date(this.topMessage.createdAt));
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
    doShowProfile: function () {
      this.$dispatch('showProfile', this.correspondent);
    },
    leftclick: function (event) {
      if (event.target.tagName !== 'SPAN' &&
        event.target.tagName !== 'BUTTON' &&
        event.target.tagName !== 'IMG') {
        // Avoid firing on wrong elements
        this.$dispatch('showMessageGroup', this.group);
      }
    }
  }
});

Vue.component('messageTop', MessageTop);

module.exports = MessageTop;
</script>
