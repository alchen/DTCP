'use strict';

var _ = require('lodash');
var ipc = require('electron').ipcRenderer;
var Vue = require('vue');
var twitterText = require('twitter-text');

Vue.config.debug = process.env.NODE_ENV !== 'production';
Vue.config.strict = true;

var newTweet;

ipc.on('pretext', function (event, screenname, availableUsers, replyTo, pretext, options) {
  newTweet = new Vue({
    el: '#content',
    data: {
      rawTweet: pretext ? (!(options && options.frontFocus) ? pretext + ' ' : ' ' + pretext) : '',
      replyTo: replyTo,
      frontFocus: options && options.frontFocus,
      screenname: screenname,
      availableUsers: availableUsers,
      showingSwitches: false
    },
    computed: {
      switchUsers: function () {
        var self = this;
        var users = _.filter(this.availableUsers, function (user) {
          return user.screenname !== self.screenname;
        });
        users.unshift(this.availableUsers[this.screenname]);

        return users;
      },
      composer: function () {
        return this.availableUsers[this.screenname];
      },
      isValid: function () {
        return twitterText.isValidTweetText(this.rawTweet);
      },
      remainingLength: function () {
        return 140 - twitterText.getTweetLength(this.rawTweet);
      },
      formattedTweet: function () {
        return twitterText.autoLink(this.rawTweet, {
          usernameIncludeSymbol: true,
          htmlEscapeNonEntities: true
        });
      }
    },
    methods: {
      showSwitches: function () {
        this.showingSwitches = true;
      },
      dismiss: function () {
        this.showingSwitches = false;
      },
      switchUser: function (screenname) {
        this.screenname = screenname;
        this.showingSwitches = false;
      },
      escape: function () {
        ipc.send('stopComposing');
      },
      sendTweet: function (event) {
        if (this.isValid) {
          ipc.send('sendTweet', this.screenname, this.rawTweet, this.replyTo);
        }
      },
      updateTweet: function (event) {
        this.rawTweet = event.target.value;
      }
    },
    compiled: function () {
      var self = this;

      // Handle keyboard shortcut
      ipc.on('tweet', function () {
        self.sendTweet();
      });

      var textarea = document.getElementsByClassName('newrawtweet')[0];
      textarea.focus();
      if (!this.frontFocus) {
        var len = textarea.value.length;
        textarea.selectionStart = len;
        textarea.selectionENd = len;
      } else {
        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;
      }
    }
  });
});
