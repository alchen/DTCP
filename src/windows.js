'use strict';

var _ = require('lodash');
var shell = require('shell');
var BrowserWindow = require('browser-window');

var mainWindow;
var newTweetWindows = [];

var atomScreen = require('screen');
var windows = {
  getMainWindow: function getMainWindow () {
    return mainWindow;
  },
  findWindowFromWebContents: function findWindowFromWebContents(webContents) {
    return BrowserWindow.fromWebContents(webContents);
  },
  closeTweetWindows: function () {
    _.each(newTweetWindows, function (w) {
      w.close();
    });
    newTweetWindows = [];
  },
  requestComposer: function () {
    this.getMainWindow().webContents.send('requestComposer');
  },
  createNewTweetWindow: function createNewTweetWindow() {
    var newWindow = new BrowserWindow({
      width: 320,
      height: 144,
      minWidth: 144,
      minHeight: 100,
      fullscreen: false,
      acceptFirstMouse: false,
      alwaysOnTop: true,
      useContentSize: true,
      autoHideMenuBar: true,
      show: false
    });
    newWindow.loadURL('file://' + __dirname + '/static/composer.html');
    newTweetWindows.push(newWindow);

    newWindow.on('close', function () {
      newWindow.hide();
    });

    newWindow.on('closed', function () {
      var index = newTweetWindows.indexOf(this);
      if (index !== -1) {
        newTweetWindows.splice(index, 1);
      }
    });

    return newWindow;
  },
  getNewTweetWindow: function getNewTweetWindow(screenname, availableUsers, replyTo, pretext, options) {
    var newWindow;
    var x;
    var y;
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

    newWindow = this.createNewTweetWindow();

    newWindow.webContents.on('did-finish-load', function () {
      newWindow.webContents.send('pretext', screenname, availableUsers, replyTo, pretext, options);
      newWindow.setPosition(x, y);
      newWindow.show();
    });
  },
  createMainWindow: function createMainWindow(streams) {
    mainWindow = new BrowserWindow({
      width: 400,
      height: 640,
      minWidth: 304,
      minHeight: 64,
      fullscreen: false,
      acceptFirstMouse: false,
      autoHideMenuBar: true,
      show: false
    });

    mainWindow.webContents.on('did-finish-load', function () {
      mainWindow.show();
    });

    mainWindow.webContents.on('new-window', function (event, url) {
      console.log('Main: new window requested for ' + url);
      if (_.startsWith(url, 'https://pbs.twimg.com/media/')) {
        url += ':orig';
      }
      shell.openExternal(url);
      event.preventDefault();
    });

    mainWindow.webContents.on('will-navigate', function (event) {
      console.log('Don\'t navigate!');
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
    });

    mainWindow.on('blur', function () {
    });

    // TODO authenticate
    if (!_.isEmpty(streams)) {
      this.loadTimeline(streams);
    } else {
      this.loadPrompt();
    }
  },
  loadPrompt: function () {
    this.unloadTimeline();
    mainWindow.loadURL('file://' + __dirname + '/static/prompt.html');
  },
  loadTimeline: function (streams) {
    this.streams = streams;
    _.each(streams, function (stream) {
      stream.subscribe(mainWindow);
    });
    mainWindow.loadURL('file://' + __dirname + '/static/index.html');
  },
  focusOnMainWindow: function () {
    mainWindow.show();
  },
  unloadTimeline: function () {
    var self = this;
    if (this.streams) {
      _.each(this.streams, function (stream, screenname) {
        stream.unsubscribe(mainWindow);
        delete self.streams[screenname];
      });
    }
  }
};

module.exports = windows;
