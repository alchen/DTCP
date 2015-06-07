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

var promptTemplate = '<div class="prompt">'
    + '<button class="promptbutton signinbutton" v-on="click: authenticate">Sign in with Twitter</button>'
    + '<section class="prompterror" v-if="error" v-text="error"></section>'
  + '</div>';

var verifyTemplate = '<div class="prompt">'
    + '<input class="pininput" type="text" v-model="pin" placeholder="Enter PIN" />'
    + '<button class="promptbutton backbutton" v-on="click: back">Back</button>'
    + '<button class="promptbutton verifybutton" v-on="click: verify">Verify</button>'
    + '<section class="prompterror" v-if="error" v-text="error"></section>'
  + '</div>';

var successTemplate = '<div class="prompt">'
    + '<button class="promptbutton verifiedbutton">Verified!</button>'
  + '</div>';

var prompt = new Vue({
  el: '#content',
  data: {
    stage: 'prompt',
    pin: '',
    error: null,
    oauthToken: null,
    oauthTokenSecret: null
  },
  events: {

  },
  components: {
    prompt: {
      replace: true,
      inherit: true,
      template: promptTemplate,
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
              self.authenticateUrl = authenticateUrl;
              shell.openExternal(authenticateUrl);
              self.stage = 'verify';
            }
          });
        }
      }
    },
    verify: {
      replace: true,
      inherit: true,
      template: verifyTemplate,
      methods: {
        back: function () {
          this.stage = 'prompt';
        },
        verify: function () {
          var self = this;
          oauth.getOAuthAccessToken(this.oauthToken, this.oauthTokenSecret, this.pin, 
            function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
              if (error){
                console.log('Renderer: verification err ' + error);
                self.error = 'Is internet down?';
              } else {
                self.error = null;
                console.log('Renderer: authorized');
                self.stage = 'success';
                var util = require('util');
                console.log(util.inspect(results));
                setTimeout(function () {
                  ipc.send(
                    'verified',
                    oauthAccessToken,
                    oauthAccessTokenSecret,
                    results.screen_name
                  );
                }, 777);
              }
          });
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
