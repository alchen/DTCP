'use strict';

var _ = require('lodash');
var shell = require('shell');
var BrowserWindow = require('browser-window');
var preferences = require('./preferences');

const path = require('path');

var mainWindow;
var aboutWindow;
var preferencesWindow;
var newTweetWindows = [];
var newViewerWindows = [];

var atomScreen = require('screen');
var windows = {
  getMainWindow: function (streams) {
    if (mainWindow) {
      return mainWindow;
    }

    var windowState = preferences.windowState;
    if (windowState &&
      windowState.bounds &&
      windowState.display &&
      windowState.bounds.x !== undefined &&
      windowState.bounds.y !== undefined &&
      windowState.bounds.width !== undefined &&
      windowState.bounds.height !== undefined &&
      windowState.display === atomScreen.getDisplayMatching(windowState.bounds).id) {
      mainWindow = new BrowserWindow({
        width: windowState.bounds.width,
        height: windowState.bounds.height,
        x: windowState.bounds.x,
        y: windowState.bounds.y,
        minWidth: 304,
        minHeight: 64,
        fullscreen: false,
        acceptFirstMouse: false,
        autoHideMenuBar: true,
        show: false
      });
    } else {
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
    }

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

    return mainWindow;
  },
  getMainWindowState: function () {
    var bounds = mainWindow.getBounds();
    var display = atomScreen.getDisplayMatching(bounds).id;
    return {
      bounds: bounds,
      display: display
    };
  },
  getAboutWindow: function () {
    if (aboutWindow) {
      return aboutWindow;
    }

    var aboutWidth = 360;
    var aboutHeight = 240;
    var margin = 40;
    var position = this.getNewWindowPosition(aboutWidth, aboutHeight, margin, false);

    aboutWindow = new BrowserWindow({
      width: aboutWidth,
      height: aboutHeight,
      x: position.x,
      y: position.y,
      resizable: false,
      alwaysOnTop: true,
      useContentSize: true,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden'
    });
    aboutWindow.loadURL('file://' + path.resolve(__dirname, '../about.html'));

    aboutWindow.on('close', function () {
      aboutWindow.hide();
    });

    aboutWindow.on('closed', function () {
      aboutWindow = null;
    });

    return aboutWindow;
  },
  getPreferencesWindow: function () {
    if (preferencesWindow) {
      return preferencesWindow;
    }

    var width = 330;
    var height = 440;
    var margin = 40;
    var position = this.getNewWindowPosition(width, height, margin, false);

    preferencesWindow = new BrowserWindow({
      width: width,
      height: height,
      x: position.x,
      y: position.y,
      resizable: false,
      alwaysOnTop: true,
      useContentSize: true,
      autoHideMenuBar: true
    });
    preferencesWindow.loadURL('file://' + path.resolve(__dirname, '../preferences.html'));

    preferencesWindow.on('close', function () {
      preferencesWindow.hide();
    });

    preferencesWindow.on('closed', function () {
      preferencesWindow = null;
    });

    return preferencesWindow;
  },
  getNewTweetWindow: function (screenname, availableUsers, replyTo, pretext, options) {
    var newWindowWidth = 320;
    var newWindowHeight = 144;
    var margin = 40;
    var newWindowPosition = this.getNewWindowPosition(newWindowWidth, newWindowHeight, margin, replyTo);
    var x = newWindowPosition.x;
    var y = newWindowPosition.y;

    var newWindow = new BrowserWindow({
      x: x,
      y: y,
      width: newWindowWidth,
      height: newWindowHeight,
      minWidth: 240,
      minHeight: 150,
      fullscreen: false,
      acceptFirstMouse: false,
      alwaysOnTop: true,
      useContentSize: true,
      autoHideMenuBar: true,
      show: false
    });
    newWindow.loadURL('file://' + path.resolve(__dirname, '../composer.html'));
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

    newWindow.webContents.on('will-navigate', function (event) {
      console.log('Don\'t navigate!');
      event.preventDefault();
    });

    newWindow.webContents.on('did-finish-load', function () {
      newWindow.webContents.send('pretext', screenname, availableUsers, replyTo, pretext, options);
      newWindow.show();
    });
  },
  getNewViewerWindow: function (media, index) {
    var width = media[index].size.width || 320;
    var height = media[index].size.height || 240;
    var position = this.getNewWindowPosition(width, height, 40, false);
    var newWindow = new BrowserWindow({
      x: position.x,
      y: position.y,
      width: Math.max(width, 144),
      height: Math.max(height, 100),
      minWidth: 144,
      minHeight: 100,
      fullscreen: false,
      acceptFirstMouse: false,
      useContentSize: true,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden'
    });
    newWindow.loadURL('file://' + path.resolve(__dirname, '../viewer.html'));
    newViewerWindows.push(newWindow);

    newWindow.setAspectRatio(width / height);

    newWindow.on('close', function () {
      newWindow.hide();
    });

    newWindow.on('closed', function () {
      var index = newViewerWindows.indexOf(this);
      if (index !== -1) {
        newViewerWindows.splice(index, 1);
      }
    });

    newWindow.webContents.on('will-navigate', function (event) {
      console.log('Don\'t navigate!');
      event.preventDefault();
    });

    newWindow.webContents.on('did-finish-load', function () {
      newWindow.webContents.send('pretext', media, index);
      newWindow.show();
    });
  },
  getNewWindowPosition: function (width, height, margin, useCursor) {
    var x;
    var y;
    var mainBounds = mainWindow.getBounds();
    var display = atomScreen.getDisplayMatching(mainBounds);

    x = mainBounds.x + mainBounds.width + margin;

    if ((x + width) > (display.bounds.x + display.bounds.width)) {
      x = mainBounds.x - width - margin;
    }

    if (useCursor) {
      var cursorPoint = atomScreen.getCursorScreenPoint();
      y = cursorPoint.y;
    } else {
      y = mainBounds.y + margin;
    }

    if ((y + height) > (display.bounds.y + display.bounds.height)) {
      y = mainBounds.y + mainBounds.height - height - margin;
    }

    return {x: x, y: y};
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
  focusOnMainWindow: function () {
    mainWindow.show();
  },
  loadPrompt: function () {
    this.unloadTimeline();
    mainWindow.loadURL('file://' + path.resolve(__dirname, '../prompt.html'));
  },
  loadTimeline: function (streams) {
    this.streams = streams;
    _.each(streams, function (stream) {
      stream.subscribe(mainWindow);
    });
    mainWindow.loadURL('file://' + path.resolve(__dirname, '../index.html'));
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
