'use strict';

var Vue = require('vue');

var template = '<div class="switches" @click="leftclick">' +
    '<div class="promptbackground"></div>' +
    '<ul class="switchlist">' +
      '<li class="switch" v-for="account in accounts" @click="switchUser(account.screenname)" :class="{ unread: account.unread }">' +
        '<section class="icon"><img :src="account.biggerIcon" /></section>' +
        '<section class="text" v-text="account.screenname"></section>' +
      '</li>' +
      '<li class="switch" @click.stop="addAccount">' +
        '<section class="icon"><span class="iconic iconic-md" data-glyph="plus"></span></section>' +
        '<section class="text">Add</section>' +
      '</li>' +
    '</ul>' +
  '</div>';

var Switches = Vue.extend({
  replace: true,
  props: ['accounts', 'username', 'now', 'view'],
  events: {
  },
  template: template,
  methods: {
    switchUser: function (screenname) {
      this.$dispatch('switchUser', screenname);
    },
    addAccount: function (event) {
      this.$dispatch('addAccount');
    },
    leftclick: function () {
      // dismiss Switches
      this.$dispatch('back');
    }
  }
});

Vue.component('switches', Switches);

module.exports = Switches;
