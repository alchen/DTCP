'use strict';

var _ = require('lodash');
var app = require('app');  // Module to control application life.
var ipc = require('ipc');
var shell = require('shell');
var Menu = require('menu');
var BrowserWindow = require('browser-window');

var atomScreen;
var willQuit = false;
var mainWindow = null;

// Report crashes to our server.
require('crash-reporter').start();

var gh_releases = require('electron-gh-releases');

var options = {
  repo: 'alchen/DTCP',
  currentVersion: app.getVersion()
};

var update = new gh_releases(options, function (auto_updater) {
  // Auto updater event listener
  auto_updater.on('error', function (event, message) {
    console.log("Update error: " + message);
  });

  auto_updater.on('update-downloaded', function (e, rNotes, rName, rDate, uUrl, quitAndUpdate) {
    // Install the update
    willQuit = true;
    quitAndUpdate();
  });
});

// Check for updates
update.check(function (err, status) {
  if (!err && status) {
    update.download();
  }
});

var Timeline = require('./timeline');
var timeline;
// var timeline = new Timeline();

var newTweetWindows = [];
var newTweetWindowsInUse = [];

function createNewTweetWindow() {
  var newWindow = new BrowserWindow({
    width: 320,
    height: 144,
    fullscreen: false,
    'accept-first-mouse': false,
    'always-on-top': true,
    // resizable: false,
    'use-content-size': true,
    show: false
  });
  newWindow.loadUrl('file://' + __dirname + '/static/newTweet.html');
  newTweetWindows.push(newWindow);

  newWindow.on('close', function() {
    newWindow.hide();
  });

  newWindow.on('closed', function() {
    // TODO check for existence
    // should remove corresponding listeners
    var index = newTweetWindowsInUse.indexOf(this);
    if (index !== -1) {
      newTweetWindowsInUse.splice(index, 1);
    }
    while (newTweetWindows.length < 2) {
      createNewTweetWindow();
    }
  });
}

function getNewTweetWindow(replyTo, pretext, frontFocus) {
  var newWindow;
  var x, y;
  var newWindowWidth = 320;
  var margin = 40;
  var mainBounds = mainWindow.getBounds();
  var display = atomScreen.getDisplayMatching(mainBounds);

  x = mainBounds.x + mainBounds.width + margin;

  if ((x + newWindowWidth) > (display.bounds.x + display.bounds.width)) {
    x = mainBounds.x - newWindowWidth - margin;
  }

  if (replyTo) {
    var cursorPoint = atomScreen.getCursorScreenPoint();
    y = cursorPoint.y;
  } else {
    y = mainBounds.y + margin;
  }

  if (newTweetWindows.length === 0) {
    createNewTweetWindow();
    newWindow = newTweetWindows.pop();
    newTweetWindowsInUse.push(newWindow);

    newWindow.webContents.on('did-finish-load', function () {
      newWindow.webContents.send('pretext', replyTo, pretext, frontFocus);
      newWindow.setPosition(x, y);
      newWindow.show();
    });
  } else {
    newWindow = newTweetWindows.pop();
    newTweetWindowsInUse.push(newWindow);
    newWindow.webContents.send('pretext', replyTo, pretext, frontFocus);
    newWindow.setPosition(x, y);
    newWindow.show();
  }
}

function createApplicationMenu(window) {
  var template;

  if (process.platform === 'darwin') {
    template = [
      {
        label: 'Twitter?',
        submenu: [
          {
            label: 'About',
            selector: 'orderFrontStandardAboutPanel:'
          },
          {
            type: 'separator'
          },
          {
            label: 'Hide',
            accelerator: 'Command+H',
            selector: 'hide:'
          },
          {
            label: 'Hide Others',
            accelerator: 'Command+Shift+H',
            selector: 'hideOtherApplications:'
          },
          {
            label: 'Show All',
            selector: 'unhideAllApplications:'
          },
          {
            type: 'separator'
          },
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: function() {
              willQuit = true;
              app.quit();
            }
          }
        ]
      },
      {
        label: 'File',
        submenu: [
          {
            label: 'New Tweet',
            accelerator: 'Command+N',
            click: function () {
              getNewTweetWindow();
            }
          },
          {
            label: 'Send',
            accelerator: 'Command+Enter',
            click: function () {
              BrowserWindow.getFocusedWindow().webContents.send('tweet');
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          {
            label: 'Cut',
            accelerator: 'Command+X',
            selector: 'cut:'
          },
          {
            label: 'Copy',
            accelerator: 'Command+C',
            selector: 'copy:'
          },
          {
            label: 'Paste',
            accelerator: 'Command+V',
            selector: 'paste:'
          },
          {
            label: 'Select All',
            accelerator: 'Command+A',
            selector: 'selectAll:'
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'Command+R',
            click: function() { BrowserWindow.getFocusedWindow().reloadIgnoringCache(); }
          },
          {
            label: 'Toggle DevTools',
            accelerator: 'Alt+Command+I',
            click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          {
            label: 'Minimize',
            accelerator: 'Command+M',
            selector: 'performMiniaturize:'
          },
          {
            label: 'Close',
            accelerator: 'Command+W',
            selector: 'performClose:'
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Online Resources',
            click: function() { shell.openExternal('https://twitter.com/uinoka'); }
          }
        ]
      }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}

// Display the timeline
function start() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 640,
    'min-width': 272,
    'min-height': 64,
    fullscreen: false,
    'accept-first-mouse': false,
    show: false
  });

  // TODO authenticate
  if (timeline) {
    mainWindow.loadUrl('file://' + __dirname + '/static/index.html');
    timeline.subscribe(mainWindow);
  } else {
    mainWindow.loadUrl('file://' + __dirname + '/static/prompt.html');
  }

  mainWindow.webContents.on('did-finish-load', function () {
    mainWindow.show();
  });

  mainWindow.webContents.on('new-window', function (event, url) {
    console.log('Main: new window requested for ' + url);
    shell.openExternal(url);
    event.preventDefault();
  });

  mainWindow.on('close', function (event, x, y, z) {
    mainWindow.hide();
    if (!willQuit) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', function() {
    // should remove corresponding listeners
    mainWindow = null;
  });

  while (newTweetWindows.length < 2) {
    createNewTweetWindow();
  }
}

app.on('ready', function () {
  atomScreen = require('screen');
  createApplicationMenu();
  start();
});

app.on('activate-with-no-open-windows', function () {
  mainWindow.show();
});

app.on('window-all-closed', function () {
  console.log('Main: window all closed, but do nothing.');
});

app.on('before-quit', function () {
  willQuit = true;
});

ipc.on('verified', function (event, oauthToken, oauthTokenSecret, screenName) {
  timeline = new Timeline(oauthToken, oauthTokenSecret, screenName);
  mainWindow.loadUrl('file://' + __dirname + '/static/index.html');
  timeline.subscribe(mainWindow);
});

ipc.on('initialLoad', function () {
  console.log('Main: initial load');
  timeline.initialLoad();
});

ipc.on('loadMore', function (event, timelineToLoad) {
  console.log('Main: loadMore ' + timelineToLoad);
  timeline.loadMore(timelineToLoad);
});

ipc.on('sendTweet', function (event, tweet, replyTo) {
  var sender = BrowserWindow.fromWebContents(event.sender);
  sender.hide();
  timeline.sendTweet(tweet, replyTo, sender);
});

ipc.on('reply', function (event, replyTo, mentions) {
  getNewTweetWindow(replyTo, _.map(mentions, function (m) {
    return '@' + m;
  }).join(' '));
});

ipc.on('quote', function (event, replyTo, quoteUrl) {
  getNewTweetWindow(replyTo, quoteUrl, true);
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
    timeline.retweet(tweetId);
  }
});



