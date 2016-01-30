<style lang="sass">
section.messageleft {
  float: left;
}

.message {
  clear: both;
  display: inline-block;
  width: 100%;
}

.message .tweeticon {
  width: 2rem;
  height: 2rem;
  border: 1px solid #ccc;
  box-shadow: 0 0 .125rem 0 rgba(0, 0, 0, 0.2);
  margin: .5rem;
}

.messageright {
    float: right;
    width: calc(100% - 3rem);
}

.messagetext {
  background-color: #5af;
  color: #fff;
  padding: .5rem;
  border-radius: .375rem;
  margin: .5rem 3rem .5rem 0;
  position: relative;
  display: inline-block;
  font-size: .875rem;
}

.message.self .messagetext {
  background-color: #eee;
  color: #000;
}

.messagetext:before {
  width: 0;
  height: 0;
  border-top: .375rem solid transparent;
  border-bottom: .375rem solid transparent;
  border-right: .375rem solid #5af;
  content: '';
  position: absolute;
  left: -.25rem;
  top: .625rem;
}

.messagetime {
  font-size: .625rem;
  color: #999;
  clear: both;
}

.message.self .messageleft {
  float: right;
}

.message.self .messageright {
  float: left;
}

.message.self .messagetext {
  float: right;
  margin: .5rem 0 .5rem 3rem;
}

.message.self .messagetext:before {
  border-right: 0;
  border-left: .375rem solid #eee;
  content: '';
  position: absolute;
  right: -.25rem;
  left: auto;
}

.message.self .messagetime {
  float: right;
}
</style>

<template lang="html">
  <ul class="tweets timeline">
    <component is="messageTop" v-for="group in messages" :group="group.messages" :username="username" :now="now" track-by="id"></component>
    <div class="loader loader-inner ball-clip-rotate box" v-if="messages.length === 0"><div></div></div>
  </ul>
</template>

<script>
'use strict';

var Vue = require('vue');
require('./messageByAll.single.vue');

var Messages = Vue.extend({
  replace: true,
  props: ['messages', 'username', 'now', 'view'],
  events: {
  },
  methods: {
  },
  transitions: {
  }
});

Vue.component('messages', Messages);

module.exports = Messages;
</script>
