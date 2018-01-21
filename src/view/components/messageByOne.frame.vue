<style lang="sass">
.messagegroup {
  height: 100%;
  display: flex;
  flex-direction: column;

  ul {
    padding: 0;
    margin: 0;
    list-style: none;
    overflow-y: auto;
    flex: 1;
  }

  .messagecomposer {
    flex-basis: 4rem;
    padding: .75rem;
    border-top: 1px solid #ccc;
    background: #f6f6f6;

    display: flex;
    flex-direction: row;

    .newmessage {
      outline: none;
      border: 1px solid #5af;
      flex-grow: 1;
      padding: 0 .375rem;
      margin: 0 .5rem 0 0;
      border-radius: .25rem;
    }
    .sendbutton {
      border: none;
      background: #5af;
      color: #fff;
      cursor: pointer;
      line-height: 1.5rem;
      border-radius: .25rem;
      font-size: .75rem;
      outline: none;
    }
  }
}

</style>

<template lang="html">
  <div class="messagegroup">
    <ul class="timeline">
      <component is="message" v-for="message in reversedMessages" :message="message" :username="username" :now="now" track-by="id"></component>
    </ul>
    <div class="messagecomposer">
      <input type="text" class="newmessage" v-model="message" autofocus="true" @keydown="onKeydown" @keyup.enter="sendMessage">
      <button class="sendbutton" @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script>
'use strict';

var Vue = require('vue');
var ipc = require('electron').ipcRenderer;
require('./messageByOne.single.vue');

var MessageGroup = Vue.extend({
  replace: true,
  props: ['messages', 'username', 'now', 'view'],
  data: function () {
    return {
      message: ''
    }
  },
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
  events: {
    scrollToMessageBottom: function () {
      this.scrollToBottom();
    },
  },
  methods: {
    scrollToBottom: function () {
      var frames = document.getElementsByClassName('frame');
      frames[frames.length - 1].getElementsByClassName('timeline')[0].lastElementChild.scrollIntoView(false);
    },
    doShowProfile: function (user) {
      this.$dispatch('showProfile', user);
    },
    onKeydown: function (event) {
      // prevent hotkey navigations, etc while composing a new message.
      event.stopPropagation();
    },
    sendMessage: function () {
      var sampleSender = this.messages[0].sender.screenname;
      var sampleRecipient = this.messages[0].recipient.screenname;

      var recipient = sampleSender == this.username ? sampleRecipient : sampleSender;
      ipc.send('sendMessage', this.username, recipient, this.message);
      this.message = '';
    }
  }
});

Vue.component('messageGroup', MessageGroup);

module.exports = MessageGroup;
</script>
