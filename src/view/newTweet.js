'use strict';

var ipc = require('ipc');
var Vue = require('vue');
var twitterText = require('twitter-text');

var newTweet;

ipc.on('pretext', function (replyTo, pretext, frontFocus) {
  newTweet = new Vue({
    el: '#content',
    data: {
      rawTweet: pretext ? (!frontFocus ?  pretext + ' ' :  ' ' + pretext) : '',
      replyTo: replyTo,
      frontFocus: frontFocus
    },
    computed: {
      isValid: function () {
        return twitterText.isValidTweetText(this.rawTweet);
      },
      remainingLength: function () {
        return 140 - twitterText.getTweetLength(this.rawTweet);
      },
      formattedTweet: function () {
        return twitterText.autoLink(this.rawTweet, {
          usernameIncludeSymbol: true
        });
      }
    },
    methods: {
      escape: function () {
        console.log('papa')
        ipc.send('stopComposing');
      },
      sendTweet: function (event) {
        if (this.isValid) {
          ipc.send('sendTweet', this.rawTweet, this.replyTo);
        }
      },
      updateTweet: function (event) {
        this.rawTweet = event.target.value;
      }
    },
    compiled: function () {
      var self = this;
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
