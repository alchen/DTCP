'use strict';

var shell = require('shell');
var BrowserWindow = require('browser-window');

var mainWindow = null;
var newTweetWindows = [];
var newTweetWindowsInUse = [];

var atomScreen = require('screen');
var windows = {
  getMainWindow: function getMainWindow () {
    return mainWindow;
  },
  findWindowFromWebContents: function findWindowFromWebContents(webContents) {
    return BrowserWindow.fromWebContents(webContents);
  },
  createNewTweetWindow: function createNewTweetWindow() {
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
    newWindow.loadUrl('file://' + __dirname + '/../static/newTweet.html');
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
  },
  getNewTweetWindow: function getNewTweetWindow(replyTo, pretext, frontFocus) {
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
      this.createNewTweetWindow();
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
  },
  createMainWindow: function createMainWindow(timeline) {
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
      this.loadTimeline(timeline);
    } else {
      this.loadPrompt();
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
      if (!global.willQuit) {
        event.preventDefault();
      }
    });

    mainWindow.on('closed', function () {
      // should remove corresponding listeners
      mainWindow = null;
    });

    mainWindow.on('focus', function () {
      console.log('Main: gains focuse');
    });

    mainWindow.on('blur', function () {
      console.log('Main: loses focuse');
    });

    while (newTweetWindows.length < 2) {
      this.createNewTweetWindow();
    }
  },
  loadPrompt: function loadPrompt() {
    mainWindow.loadUrl('file://' + __dirname + '/../static/prompt.html');
  },
  loadTimeline: function loadTimeline(timeline) {
    mainWindow.loadUrl('file://' + __dirname + '/../static/index.html');
    timeline.subscribe(mainWindow);
  }
};

module.exports = windows;
