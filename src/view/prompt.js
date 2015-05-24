'use strict';

var ipc = require('ipc');
var shell = require('shell');
var OAuth = require('oauth');
var oauth = new OAuth.OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  '4g0E1FHLfCrZMjjiaD3VXyVmb',
  '5BqCtFgsHZOnttQT6qSp483erSDVCnUcMX0THCFCe5vnWEv2zC',
  '1.0A',
  'oob',
  'HMAC-SHA1'
);

var Ractive = require('ractive');
Ractive.events.tap = require( 'ractive-events-tap' );

var prompt = '<div class="prompt">'
    + '<button class="promptbutton signinbutton" on-tap="authenticate">Sign in with Twitter</button>'
  + '</div>';

var verify = '<div class="prompt">'
    + '<input class="pininput" type="text" value="{{pin}}" placeholder="Enter PIN" />'
    + '<button class="promptbutton backbutton" on-tap="back">Back</button>'
    + '<button class="promptbutton verifybutton" on-tap="verify">Verify</button>'
  + '</div>';

var success = '<div class="prompt">'
    + '<button class="promptbutton verifiedbutton">Verified!</button>'
  + '</div>';

var template = '<div class="promptcontainer" intro="fade:300">'
    + '{{#if stage === \'prompt\'}}'
      + prompt
    + '{{elseif stage === \'verify\'}}'
      + verify
    + '{{elseif stage === \'success\'}}'
      + success
    + '{{/if}}'
  + '</div>';

var ractive = null;

ractive = new Ractive({
  el: '#content',
  template: template,
  partials: {
  },
  data: {
    stage: 'prompt'
  },
  transitions: {
    fade: require('ractive-transitions-fade')
  },
  oncomplete: function () {
  }
});

ractive.on('back', function () {
  ractive.set('stage', 'prompt');
});

ractive.on('authenticate', function () {
  oauth.getOAuthRequestToken(function (error, oauthToken, oauthTokenSecret, results) {
    if (error) {
      console.log('Renderer: authenticate err ' + error);
    } else {
      ractive.set('oauthToken', oauthToken);
      ractive.set('oauthTokenSecret', oauthTokenSecret);
      var authenticateUrl = 'https://twitter.com/oauth/authenticate?oauth_token=' + oauthToken;
      ractive.set('authenticateUrl', authenticateUrl);
      shell.openExternal(authenticateUrl);
      ractive.set('stage', 'verify');
    }
  });
});

ractive.on('verify', function () {
  var oauthToken  = ractive.get('oauthToken');
  var oauthTokenSecret  = ractive.get('oauthTokenSecret');
  var pin = ractive.get('pin');
  oauth.getOAuthAccessToken(oauthToken, oauthTokenSecret, pin, 
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if (error){
        console.log('Renderer: verification err ' + error);
      } else {
        console.log('Renderer: authorized');
        ractive.set('stage', 'success');
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
});
