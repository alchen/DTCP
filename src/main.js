'use strict';

var _ = require('lodash');
var app = require('app');
var ipc = require('electron').ipcMain;
var windows;
var menu;

var preferences = require('./preferences');
var Stream = require('./models/stream');
var streams = {};

app.on('ready', function () {
  global.willQuit = false;

  // Set up windows
  windows = require('./windows');

  // Set up application menu
  menu = require('./menu');
  menu.createApplicationMenu();

  if (preferences.authenticated && !_.isEmpty(preferences.accounts)) {
    _.each(preferences.accounts, function (account) {
      var stream = new Stream(account.oauthToken, account.oauthTokenSecret, account.screenname);
      streams[account.screenname] = stream;
    });
  }

  windows.createMainWindow(streams);
});

// Handle Events

app.on('activate', function () {
  var mainWindow = windows.getMainWindow();
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on('window-all-closed', function () {
  console.log('Main: window all closed, but do nothing.');
});

app.on('before-quit', function () {
  global.willQuit = true;
  preferences.save();
  windows.closeTweetWindows();
});

app.on('will-quit', function () {
  console.log('Main: will quit');
});

app.on('quit', function () {
  console.log('Main: quit');
});

ipc.on('focus', function () {
  windows.focusOnMainWindow();
});

ipc.on('updateBadge', function (event, target) {
  if (process.platform !== 'darwin') {
    return;
  } else if (target === '0') {
    app.dock.setBadge('');
  } else {
    app.dock.setBadge(target);
  }
});

ipc.on('verified', function (event, oauthToken, oauthTokenSecret, screenname) {
  var newAccount = {
    oauthToken: oauthToken,
    oauthTokenSecret: oauthTokenSecret,
    screenname: screenname
  };
  preferences.accounts[screenname] = newAccount;
  preferences.authenticated = true;

  var stream = new Stream(oauthToken, oauthTokenSecret, screenname);
  streams[screenname] = stream;
  windows.loadTimeline(streams);
});

ipc.on('newAccount', function (event, oauthToken, oauthTokenSecret, screenname) {
  var newAccount = {
    oauthToken: oauthToken,
    oauthTokenSecret: oauthTokenSecret,
    screenname: screenname
  };
  preferences.accounts[screenname] = newAccount;
  preferences.authenticated = true;

  var stream = new Stream(oauthToken, oauthTokenSecret, screenname);
  streams[screenname] = stream;
  stream.subscribe(windows.getMainWindow());
  stream.initialLoad();
});

ipc.on('initialLoad', function () {
  _.each(streams, function (stream) {
    stream.initialLoad();
  });
});

ipc.on('loadMore', function (event, screenname, streamToLoad, maxId) {
  streams[screenname].loadMore(streamToLoad, maxId);
});

ipc.on('loadSince', function (event, screenname, streamToLoad, sinceId) {
  streams[screenname].loadSince(streamToLoad, sinceId);
});

ipc.on('loadUser', function (event, screenname, screennameToLoad, maxId) {
  streams[screenname].loadUser(screennameToLoad, maxId);
});

ipc.on('loadScreenname', function (event, screenname, screennameToLoad) {
  streams[screenname].loadScreenname(screennameToLoad);
});

ipc.on('loadMessages', function (event, screenname) {
  streams[screenname].loadMessages();
});

ipc.on('compose', function (event, screenname) {
  windows.getNewTweetWindow(screenname);
});

ipc.on('stopComposing', function (event) {
  var sender = windows.findWindowFromWebContents(event.sender);
  sender.close();
});

ipc.on('findContext', function (event, screenname, tweetId) {
  streams[screenname].findContext(tweetId);
});

ipc.on('sendTweet', function (event, screenname, tweet, replyTo) {
  var sender = windows.findWindowFromWebContents(event.sender);
  sender.hide();
  streams[screenname].sendTweet(tweet, replyTo, sender);
});

ipc.on('reply', function (event, screenname, replyTo, mentions) {
  windows.getNewTweetWindow(screenname, replyTo, _.map(mentions, function (m) {
    return '@' + m;
  }).join(' '));
});

ipc.on('quote', function (event, screenname, replyTo, quoteUrl) {
  windows.getNewTweetWindow(screenname, replyTo, quoteUrl, true);
});

ipc.on('favorite', function (event, screenname, tweetId, positive) {
  if (positive) {
    console.log('Main: favorite ' + tweetId);
    streams[screenname].favorite(tweetId);
  } else {
    console.log('Main: unfavorite ' + tweetId);
    streams[screenname].unfavorite(tweetId);
  }
});

ipc.on('retweet', function (event, screenname, tweetId, positive, retweetId) {
  if (positive) {
    console.log('Main: retweet ' + tweetId);
    streams[screenname].retweet(tweetId);
  } else {
    console.log('Main: unretweet ' + tweetId);
    streams[screenname].unretweet(tweetId);
  }
});

ipc.on('delete', function (event, screenname, tweetId) {
  console.log('Main: delete ' + tweetId);
  streams[screenname].deleteTweet(tweetId);
});

ipc.on('follow', function (event, screenname, target, isFollowing) {
  if (isFollowing) {
    console.log('Main: unfollow ' + target);
    streams[screenname].unfollow(target);
  } else {
    console.log('Main: follow ' + target);
    streams[screenname].follow(target);
  }
});
