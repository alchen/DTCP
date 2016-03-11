'use strict';

process.on('uncaughtException', function (err) {
  console.error('Uncaught Exception. Invetigate.');
  console.error(err.stack);
});

var _ = require('lodash');
var app = require('app');
var ipc = require('electron').ipcMain;
var request = require('request');
var packageInfo = require('../package.json');
var semver = require('semver');
var windows;
var menu;
var tray;

var preferences = require('./preferences');
var oauth = require('./oauth');
var Stream = require('./models/stream');
var streams = {};

var validHostname = function (str) {
  return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(str);
};

if (preferences.proxyConfig && validHostname(preferences.proxyConfig.host) && !isNaN(preferences.proxyConfig.port) && (+preferences.proxyConfig.port) >= 0 &&  (+preferences.proxyConfig.port) < 65536) {
  try {
    var proxy = 'socks5://' + preferences.proxyConfig.host + ':' + (+preferences.proxyConfig.port);
    app.commandLine.appendSwitch('proxy-server', proxy);
    app.commandLine.appendSwitch('host-resolver-rules', 'MAP * 0.0.0.0 , EXCLUDE ' + preferences.proxyConfig.host);
    console.log('Main: proxy set');
  } catch (err) {
    console.error('Main: proxy config error: ' + err);
  }
}

app.on('ready', function () {
  global.willQuit = false;

  // Set up windows
  windows = require('./windows');

  // Set up application menu
  menu = require('./menu');
  menu.createApplicationMenu();

  // Set up tray icon
  tray = require('./tray');
  tray.createTray();

  if (preferences.authenticated && !_.isEmpty(preferences.accounts)) {
    _.each(preferences.accounts, function (account) {
      var stream = new Stream(account.oauthToken, account.oauthTokenSecret, account.screenname);
      streams[account.screenname] = stream;
    });
  }

  windows.getMainWindow(streams);
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
  preferences.windowState = windows.getMainWindowState();
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

ipc.on('checkUpdate', function () {
  request.head({
    url: packageInfo.homepage + '/releases/latest'
  }, function (err, response) {
    if (!err) {
      var latestVersion = response.socket._httpMessage.path.split('/').pop();
      var hasUpdate = semver.gt(latestVersion, packageInfo.version);
      windows.getMainWindow().send('update', hasUpdate);
    }
  });
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

ipc.on('prepareOAuth', function (event) {
  oauth.prepare(event.sender);
});

ipc.on('verifyOAuth', function (event, pin) {
  oauth.verify(event.sender, pin);
});

ipc.on('verified', function (event) {
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

ipc.on('getProxy', function (event) {
  event.sender.send('proxy', preferences.proxyConfig);
});

ipc.on('setProxy', function (event, proxyConfig) {
  preferences.proxyConfig = proxyConfig;
});

ipc.on('getFontSize', function (event) {
  event.sender.send('fontSize', preferences.fontSize);
});

ipc.on('setFontSize', function (event, fontSize) {
  preferences.fontSize = fontSize;
  windows.getMainWindow().send('fontSize', fontSize);
});

ipc.on('setLastScreenname', function (event, screenname) {
  preferences.lastScreenname = screenname;
});

ipc.on('getLastScreenname', function (event) {
  event.sender.send('lastScreenname', preferences.lastScreenname);
});

ipc.on('initialLoad', function () {
  _.each(streams, function (stream) {
    stream.initialLoad();
  });
});

ipc.on('loadMore', function (event, screenname, streamToLoad, maxId) {
  streams[screenname].loadMore(streamToLoad, maxId);
});

ipc.on('loadMissing', function (event, screenname, streamToLoad, sinceId) {
  streams[screenname].loadMissing(streamToLoad, sinceId);
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

ipc.on('showViewer', function (event, media, index) {
  windows.getNewViewerWindow(media, index);
});

ipc.on('resizeViewer', function (event, width, height) {
  var sender = windows.findWindowFromWebContents(event.sender);
  sender.setContentSize(width, height);
});

ipc.on('compose', function (event, screenname, availableUsers, replyTo, pretext, options) {
  windows.getNewTweetWindow(screenname, availableUsers, replyTo, pretext, options);
});

ipc.on('dismiss', function (event) {
  var sender = windows.findWindowFromWebContents(event.sender);
  sender.close();
});

ipc.on('resizeComposerToHeight', function (event, height) {
  var sender = windows.findWindowFromWebContents(event.sender);
  var currentSize = sender.getContentSize();
  sender.setContentSize(currentSize[0], Math.max(currentSize[1], height));
});

ipc.on('findContext', function (event, screenname, tweetId) {
  streams[screenname].findContext(tweetId);
});

ipc.on('sendTweet', function (event, screenname, tweet, replyTo, mediaPath) {
  var sender = windows.findWindowFromWebContents(event.sender);
  sender.hide();
  streams[screenname].sendTweet(tweet, replyTo, sender, mediaPath);
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
