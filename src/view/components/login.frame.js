'use strict';

var Vue = require('vue');
var ipc = require('electron').ipcRenderer;
var shell = require('shell');
var config = require('../../config');
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

var template = '<div class="login">' +
    '<section class="connect">' +
      '<button @click="connect"><span class="iconic iconic-sm" data-glyph="social-twitter"></span>Sign in with Twitter</button>' +
    '</section>' +
    '<section class="error" v-if="error" v-text="error"></section>' +
    '<section class="verify" v-if="stage === \'verify\'" transition="verify">' +
      '<input type="text" v-model="pin" placeholder="Enter PIN" />' +
      '<button @click="verify">Verify</button>' +
    '</section>' +
    '<section class="result" v-if="result" v-text="result"></section>' +
  '</div>';

var Login = Vue.extend({
  replace: true,
  props: ['username', 'now', 'view'],
  data: function () {
    return {
      pin: '',
      result: undefined,
      error: undefined,
      stage: 'login'
    };
  },
  template: template,
  methods: {
    connect: function () {
      var self = this;
      oauth.getOAuthRequestToken(function (error, oauthToken, oauthTokenSecret, results) {
        if (error) {
          console.log('Renderer: authenticate err ' + error);
          self.error = 'Is internet down?';
        } else {
          self.oauthToken = oauthToken;
          self.oauthTokenSecret = oauthTokenSecret;
          var authenticateUrl = 'https://twitter.com/oauth/authenticate?oauth_token=' + oauthToken;
          shell.openExternal(authenticateUrl);
          self.stage = 'verify';
        }
      });
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
            self.result = 'Verified!';
            ipc.send(
              'newAccount',
              oauthAccessToken,
              oauthAccessTokenSecret,
              results.screen_name
            );
          }
        }
      );
    }
  }
});

Vue.component('login', Login);

module.exports = Login;
