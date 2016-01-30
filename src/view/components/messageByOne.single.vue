<style lang="sass">
.messagebox {
  border: none;
}
</style>

<template lang="html">
  <li class="box messagebox">
    <div class="message" :class="{'self': message.sender.screenname === username}" @contextmenu="rightclick">
      <section class="messageleft">
        <img class="tweeticon" :src="message.sender.biggerIcon" onerror="this.style.visibility=\'hidden\';" @click="doShowProfile" />
      </section>
      <section class="messageright">
        <section class="messagetext" v-html="message.status"></section>
        <section class="messagetime" v-text="timeFrom"></section>
      </section>
    </div>
  </li>
</template>

<script>
'use strict';

var Vue = require('vue');
var moment = require('moment');

var Message = Vue.extend({
  replace: true,
  props: ['message', 'username', 'now'],
  filters: {
    at: function (name) {
      return '@' + name;
    }
  },
  computed: {
    timeFrom: function () {
      var createdAt = moment(new Date(this.message.createdAt));
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
      this.$dispatch('showProfile', this.message.sender);
    },
    rightclick: function (event) {
      // TODO modify for direct messages
      // var menu = contextmenu.tweet(this);
      // menu.popup(remote.getCurrentWindow());
      // event.preventDefault();
    }
  }
});

Vue.component('message', Message);

module.exports = Message;

</script>
