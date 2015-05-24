'use strict';

var ipc = require('ipc');
var twitterText = require('twitter-text');
var Ractive = require('ractive');
Ractive.events.tap = require( 'ractive-events-tap' );

var template = '<div class="newtweet" intro="fade:100">'
    + '<section class="newtweettext">'
      + '<textarea class="newrawtweet" value="{{ rawTweet }}" autofocuse="true"></textarea>'
      + '<section class="newformattedtweet" contentEditable="true">'
        + '{{{ format(rawTweet) }}}'
      + '</section>'
    + '</section>'
    + '<section class="newtweetmeta">'
      + '<span class="remaining">{{remainingLength(rawTweet)}}</span>'
      + '<button class="newtweetbutton{{#if isValidTweetText(rawTweet) }} activenewtweetbutton{{/if}}" on-tap="tweet">Tweet</button>'
    + '</section>'
  + '</div>';

var ractive = null;

function sendTweet(event) {
  var rawTweet = ractive.get('rawTweet');
  var replyTo = ractive.get('replyTo');
  if (twitterText.isValidTweetText(rawTweet)) {
    console.log('Renderer: sendTweet');
    ipc.send('sendTweet', rawTweet, replyTo);
  }
}

ipc.on('pretext', function (replyTo, pretext, frontFocus) {
  ractive = new Ractive({
    el: '#content',
    template: template,
    partials: {
    },
    data: {
      frontFocus: frontFocus,
      rawTweet: pretext ? (!frontFocus ?  pretext + ' ' :  ' ' + pretext) : '',
      replyTo: replyTo || null,
      isValidTweetText: function (tweettext) {
        return twitterText.isValidTweetText(tweettext);
      },
      remainingLength: function (tweettext) {
        return 140 - twitterText.getTweetLength(tweettext);
      },
      format: function (rawTweet) {
        var options = {
          usernameIncludeSymbol: true
        };
        return twitterText.autoLink(rawTweet, options);
      }
    },
    transitions: {
      fade: require('ractive-transitions-fade')
    },
    oncomplete: function () {
      var textarea = this.el.getElementsByClassName('newrawtweet')[0];
      if (!ractive.get('frontFocus')) {
        var len = textarea.value.length;
        textarea.selectionStart = len;
        textarea.selectionENd = len;
      }
      textarea.focus();
    }
  });
  ractive.on('tweet', sendTweet);
  ipc.on('tweet', sendTweet);
});
