<template lang="html">
  <div class="login">
    <section class="connect">
      <button @click="connect"><span class="iconic iconic-sm" data-glyph="social-twitter"></span>Sign in with Twitter</button>
    </section>
    <section class="verify" v-if="stage === 'verify'" transition="verify">
      <input type="text" v-model="pin" placeholder="Enter PIN" /><button @click="verify">Verify</button>
    </section>
    <section class="result" v-if="message" v-text="message" transition="verify"></section>
  </div>
</template>

<script>
'use strict';

var Vue = require('vue');
var ipc = require('electron').ipcRenderer;

var Login = Vue.extend({
  replace: true,
  data: function () {
    return {
      pin: '',
      message: undefined,
      stage: 'login'
    };
  },
  methods: {
    connect: function () {
      this.message = null;
      ipc.send('prepareOAuth');
    },
    verify: function () {
      this.message = null;
      ipc.send('verifyOAuth', this.pin);
    }
  },
  compiled: function () {
    var self = this;

    ipc.on('setLoginStage', function (event, newStage) {
      self.stage = newStage;
    });

    ipc.on('setLoginMessage', function (event, newMessage) {
      self.message = newMessage;
    });

    ipc.on('setLoginResult', function (event, accessToken, accessTokenSecret, screenname) {
      self.message = 'Verified.';
      ipc.send(
        'newAccount',
        accessToken,
        accessTokenSecret,
        screenname
      );
      setTimeout(function () {
        self.$dispatch('back');
      }, 1200);
    });
  }
});

Vue.component('login', Login);

module.exports = Login;
</script>
