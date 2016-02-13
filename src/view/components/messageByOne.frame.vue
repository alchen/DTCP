<style lang="sass">

</style>

<template lang="html">
  <ul class="tweets timeline messagegroup">
    <component is="message" v-for="message in reversedMessages" :message="message" :username="username" :now="now" track-by="id"></component>
  </ul>
</template>

<script>
'use strict';

var Vue = require('vue');
require('./messageByOne.single.vue');

var MessageGroup = Vue.extend({
  replace: true,
  props: ['messages', 'username', 'now', 'view'],
  filters: {
    at: function (name) {
      return '@' + name;
    }
  },
  computed: {
    reversedMessages: function () {
      return this.messages.slice().reverse();
    }
  },
  attached: function () {
    this.scrollToBottom();
  },
  methods: {
    scrollToBottom: function () {
      var frames = document.getElementsByClassName('frame');
      frames[frames.length - 1].getElementsByClassName('timeline')[0].scrollIntoView(false);
    },
    doShowProfile: function (user) {
      this.$dispatch('showProfile', user);
    }
  }
});

Vue.component('messageGroup', MessageGroup);

module.exports = MessageGroup;
</script>
