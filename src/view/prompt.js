'use strict';

var ipc = require('ipc');
var shell = require('shell');
var config = require('../config');
var OAuth = require('oauth');
var oauth = new OAuth.OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  config.consumerKey,
  config.consumerSecret,
  '1.0A',
  'oob',
  'HMAC-SHA1'
);

var Vue = require('vue');

var promptTemplate = '<div class="prompt">' +
    '<button class="promptbutton signinbutton" @click="authenticate">Sign in with Twitter</button>' +
    '<section class="prompterror" v-if="error" v-text="error"></section>' +
  '</div>';

var verifyTemplate = '<div class="prompt">' +
    '<input class="pininput" type="text" v-model="pin" placeholder="Enter PIN" />' +
    '<button class="promptbutton backbutton" @click="back">Back</button>' +
    '<button class="promptbutton verifybutton" @click="verify">Verify</button>' +
    '<section class="prompterror" v-if="error" v-text="error"></section>' +
  '</div>';

var successTemplate = '<div class="prompt">' +
    '<button class="promptbutton verifiedbutton">Verified!</button>' +
  '</div>';

var prompt = new Vue({
  el: '#content',
  data: {
    stage: 'prompt',
    oauthToken: null,
    oauthTokenSecret: null
  },
  events: {
    setStage: function (target) {
      this.stage = target;
    }
  },
  components: {
    prompt: {
      replace: true,
      template: promptTemplate,
      data: function () {
        return {error: null};
      },
      props: ['oauthToken', 'oauthTokenSecret'],
      methods: {
        authenticate: function () {
          var self = this;
          oauth.getOAuthRequestToken(function (error, oauthToken, oauthTokenSecret, results) {
            if (error) {
              console.log('Renderer: authenticate err ' + error);
              self.error = 'Is internet down?';
            } else {
              self.error = null;
              self.oauthToken = oauthToken;
              self.oauthTokenSecret = oauthTokenSecret;
              var authenticateUrl = 'https://twitter.com/oauth/authenticate?oauth_token=' + oauthToken;
              shell.openExternal(authenticateUrl);
              self.$dispatch('setStage', 'verify');
            }
          });
        }
      }
    },
    verify: {
      replace: true,
      template: verifyTemplate,
      data: function () {
        return {
          error: null,
          pin: ''
        };
      },
      props: ['oauthToken', 'oauthTokenSecret'],
      methods: {
        back: function () {
          this.$dispatch('setStage', 'prompt');
        },
        verify: function () {
          var self = this;
          oauth.getOAuthAccessToken(this.oauthToken, this.oauthTokenSecret, this.pin,
            function (error, oauthAccessToken, oauthAccessTokenSecret, results) {
              if (error) {
                console.log('Renderer: verification err ' + error);
                self.error = 'Is internet down?';
              } else {
                self.error = null;
                self.$dispatch('setStage', 'success');
                setTimeout(function () {
                  ipc.send(
                    'verified',
                    oauthAccessToken,
                    oauthAccessTokenSecret,
                    results.screen_name
                  );
                }, 777);
              }
            }
          );
        }
      }
    },
    success: {
      replace: true,
      template: successTemplate
    }
  }
});

module.exports = prompt;
