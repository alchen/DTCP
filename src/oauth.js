'use strict';

const request = require('./lib/twit/request');
const shell = require('electron').shell;
const config = require('./config.js');
const qs = require('qs');

var oauth;

exports.prepare = function (sender) {
  oauth = {
    callback: 'oob',
    consumer_key: config.consumerKey,
    consumer_secret: config.consumerSecret
  };

  request.post({
    url: 'https://api.twitter.com/oauth/request_token',
    oauth: oauth
  }, function (err, response, body) {
    if (err || response.statusCode !== 200) {
      console.log('OAuth: Cannot request oauth token.');
      sender.send('setLoginMessage', 'Cannot request Twitter login.');
      return;
    }

    var req = qs.parse(body);
    oauth.token = req.oauth_token;
    oauth.token_secret = req.oauth_token_secret;
    var authenticateUrl = 'https://twitter.com/oauth/authenticate?oauth_token=' + oauth.token;
    shell.openExternal(authenticateUrl);

    sender.send('setLoginStage', 'verify');
  });
};

exports.verify = function (sender, pin) {
  oauth.verifier = pin;
  request.post({
    url: 'https://api.twitter.com/oauth/access_token',
    oauth: oauth
  }, function (err, response, body) {
    if (err || response.statusCode !== 200) {
      console.log('OAuth: Cannot verify login.');
      sender.send('setLoginStage', 'login');
      sender.send('setLoginMessage', 'Cannot verify your Twitter login.');
      return;
    }

    var req = qs.parse(body);
    sender.send('setLoginResult', req.oauth_token, req.oauth_token_secret, req.screen_name);
  });
};
