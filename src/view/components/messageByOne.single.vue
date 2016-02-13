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
const timefrom = require('./timefrom');

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
      var createdAt = Math.floor(new Date(this.message.createdAt).getTime() / 1000);
      return timefrom(createdAt, this.now);
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
