'use strict';

var _ = require('lodash');
var app = require('app');
var ipc = require('ipc');
var windows, menu;

// Report crashes to our server.
require('crash-reporter').start();

var preferences = require('./preferences');
var update = require('./update');
var Timeline = require('./timeline');
var timeline;
// var timeline = new Timeline();

app.on('ready', function () {
  global.willQuit = false;

  // Check for updates
  update.check(function (err, status) {
    if (!err && status) {
      update.download();
    }
  });

  // Set up windows
  windows = require('./windows');

  // Set up application menu
  menu = require('./menu');
  menu.createApplicationMenu();

  if (preferences.authenticated) {
    timeline = new Timeline(preferences.oauthToken, preferences.oauthTokenSecret, preferences.screenName);
  }

  windows.createMainWindow(timeline);
});

// Handle Events

app.on('activate-with-no-open-windows', function () {
  windows.getMainWindow().show();
});

app.on('window-all-closed', function () {
  console.log('Main: window all closed, but do nothing.');
});

app.on('before-quit', function () {
  global.willQuit = true;
  preferences.save();
});

ipc.on('verified', function (event, oauthToken, oauthTokenSecret, screenName) {
  preferences.authenticated = true;
  preferences.oauthToken = oauthToken;
  preferences.oauthTokenSecret = oauthTokenSecret;
  preferences.screenName = screenName;

  timeline = new Timeline(oauthToken, oauthTokenSecret, screenName);
  windows.getMainWindow().loadUrl('file://' + __dirname + '/static/index.html');
  timeline.subscribe(windows.getMainWindow());
});

ipc.on('initialLoad', function () {
  console.log('Main: initial load');
  timeline.initialLoad();
});

ipc.on('loadMore', function (event, timelineToLoad) {
  console.log('Main: loadMore ' + timelineToLoad);
  timeline.loadMore(timelineToLoad);
});

ipc.on('loadUser', function (event, screenNameToLoad) {
  console.log('Main: loadMore ' + screenNameToLoad);
  timeline.loadUser(screenNameToLoad);
});

ipc.on('compose', function (event) {
  console.log('Main: compose');
  windows.getNewTweetWindow();
});

ipc.on('stopComposing', function (event) {
  var sender = windows.findWindowFromWebContents(event.sender);
  sender.close();
});

ipc.on('findContext', function (event, tweetId, replyTo) {
  console.log('Main: show thread for ' + tweetId + ' and ' + replyTo);

  timeline.findContext(tweetId, replyTo);
});

ipc.on('sendTweet', function (event, tweet, replyTo) {
  var sender = windows.findWindowFromWebContents(event.sender);
  sender.hide();
  timeline.sendTweet(tweet, replyTo, sender);
});

ipc.on('reply', function (event, replyTo, mentions) {
  windows.getNewTweetWindow(replyTo, _.map(mentions, function (m) {
    return '@' + m;
  }).join(' '));
});

ipc.on('quote', function (event, replyTo, quoteUrl) {
  windows.getNewTweetWindow(replyTo, quoteUrl, true);
});

ipc.on('favorite', function (event, tweetId, positive) {
  if (positive) {
    console.log('Main: favorite ' + tweetId);
    timeline.favorite(tweetId);
  } else {
    console.log('Main: unfavorite ' + tweetId);
    timeline.unfavorite(tweetId);
  }
});

ipc.on('retweet', function (event, tweetId, positive, retweetId) {
  if (positive) {
    console.log('Main: retweet ' + tweetId);
    timeline.retweet(tweetId);
  } else {
    console.log('Main: unretweet ' + tweetId);
    timeline.unretweet(tweetId);
  }
});

ipc.on('delete', function (event, tweetId) {
  console.log('Main: delete ' + tweetId);
  timeline.deleteTweet(tweetId);
});

