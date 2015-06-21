'use strict';

var _ = require('lodash');
var app = require('app');
var ipc = require('ipc');
var windows, menu;

var preferences = require('./preferences');
var update = require('./update');
var Timeline = require('./stream');
var timeline;
// var timeline = new Timeline();

app.on('ready', function () {
  global.willQuit = false;

  // Check for updates
  update.check(function (err, status) {
    if (!err && status) {
      // update.download();
    }
  });

  // Set up windows
  windows = require('./windows');

  // Set up application menu
  menu = require('./menu');
  menu.createApplicationMenu();

  if (preferences.authenticated) {
    timeline = new Timeline(preferences.oauthToken, preferences.oauthTokenSecret, preferences.screenname);
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

ipc.on('verified', function (event, oauthToken, oauthTokenSecret, screenname) {
  preferences.authenticated = true;
  preferences.oauthToken = oauthToken;
  preferences.oauthTokenSecret = oauthTokenSecret;
  preferences.screenname = screenname;

  timeline = new Timeline(oauthToken, oauthTokenSecret, screenname);
  windows.loadTimeline(timeline);
});

ipc.on('initialLoad', function () {
  timeline.initialLoad();
});

ipc.on('loadMore', function (event, timelineToLoad, maxId) {
  timeline.loadMore(timelineToLoad, maxId);
});

ipc.on('loadUser', function (event, screennameToLoad, maxId) {
  timeline.loadUser(screennameToLoad, maxId);
});

ipc.on('loadScreenname', function (event, screennameToLoad) {
  timeline.loadScreenname(screennameToLoad);
});

ipc.on('compose', function (event) {
  windows.getNewTweetWindow();
});

ipc.on('stopComposing', function (event) {
  var sender = windows.findWindowFromWebContents(event.sender);
  sender.close();
});

ipc.on('findContext', function (event, tweetId) {
  timeline.findContext(tweetId);
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

