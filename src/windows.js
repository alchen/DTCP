'use strict';

var _ = require('lodash');
const shell = require('electron').shell;
const BrowserWindow = require('electron').BrowserWindow;
const atomScreen = require('electron').screen;
const dialog = require('electron').dialog;
var preferences = require('./preferences');

const path = require('path');

var mainWindow;
var aboutWindow;
var preferencesWindow;
var suggestionsWindow;
var newTweetWindows = [];
var newViewerWindows = [];

var margin = 15;

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

    mainWindow.on('close', function (event) {
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
    var position = this.getNewWindowPosition(aboutWidth, aboutHeight, margin);

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

    var width = 360;
    var height = 360;
    var position = this.getNewWindowPosition(width, height, margin);

    preferencesWindow = new BrowserWindow({
      width: width,
      height: height,
      x: position.x,
      y: position.y,
      resizable: true,
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
  getSuggestionsWindow: function () {
    if (suggestionsWindow) {
      return suggestionsWindow;
    }

    var aboutWidth = 150;
    var aboutHeight = 0;
    var position = this.getNewWindowPosition(aboutWidth, aboutHeight, margin);

    suggestionsWindow = new BrowserWindow({
      width: aboutWidth,
      height: aboutHeight,
      x: position.x,
      y: position.y,
      resizable: false,
      alwaysOnTop: true,
      useContentSize: true,
      autoHideMenuBar: true,
      frame: false,
      show: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      acceptFirstMouse: true
    });
    suggestionsWindow.loadURL('file://' + path.resolve(__dirname, '../suggestions.html'));

    suggestionsWindow.on('close', function (event) {
      suggestionsWindow.hide();
      if (!global.willQuit) {
        event.preventDefault();
      }
    });

    suggestionsWindow.on('closed', function () {
      suggestionsWindow = null;
    });

    return suggestionsWindow;
  },
  setSuggestions: function (suggestions, top, left) {
    var suggestHeight = 48;
    var toSuggest = _.take(suggestions, 5);
    var width = 150;
    var height = suggestHeight * toSuggest.length;
    suggestionsWindow.webContents.send('setSuggestions', toSuggest);
    if (toSuggest.length > 0) {
      var composerBounds = (BrowserWindow.getFocusedWindow() || mainWindow).getBounds();
      suggestionsWindow.setBounds({
        x: composerBounds.x + left + 60,
        y: composerBounds.y + top + 50,
        width: suggestionsWindow.getSize()[0],
        height: suggestHeight * toSuggest.length
      });
      suggestionsWindow.showInactive();
    } else {
      suggestionsWindow.hide();
    }
  },
  clearSuggestions: function () {
    if (suggestionsWindow) {
      suggestionsWindow.hide();
      suggestionsWindow.webContents.send('setSuggestions', []);
    }
  },
  hideSuggestions: function () {
    if (suggestionsWindow && !suggestionsWindow.isFocused()) {
      suggestionsWindow.hide();
    }
  },
  getNewTweetWindow: function (screenname, availableUsers, replyTo, pretext, options) {
    var self = this;

    var newWindowWidth = 320;
    var newWindowHeight = 144;
    var newWindowPosition = this.getNewWindowPositionBelow(newWindowWidth, newWindowHeight, margin);
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

    require('electron-context-menu')({
      window: newWindow
    })

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
  refitWindow: function (target, width, height) {
    width = width || 320;
    height = height|| 240;

    var currentSize = target.getSize();
    if (width <= currentSize[0] && height <= currentSize[1]) {
      target.setSize(
        Math.max(width, 144),
        Math.max(height, 100)
      );
      return;
    } else {
      var size = this.getNewWindowSize(width, height, width / height, margin);
      width = size.width;
      height = size.height;
      var position = this.getNewWindowPosition(width, height, margin);
      target.setAspectRatio(width / height);
      if (!position.x || !position.y) {
        target.setSize(
          Math.max(width, 144),
          Math.max(height, 100)
        );
        target.center();
      } else {
        target.setBounds({
          x: position.x,
          y: position.y,
          width: Math.max(width, 144),
          height: Math.max(height, 100)
        });
      }
    }
  },
  getNewViewerWindow: function (media, index, muteVideo) {
    var width = media[index].size.width || 320;
    var height = media[index].size.height || 240;

    var size = this.getNewWindowSize(width, height, width / height, margin);
    width = size.width;
    height = size.height;

    var position = this.getNewWindowPosition(width, height, margin);
    var newWindow = new BrowserWindow({
      title: '',
      minWidth: 144,
      minHeight: 100,
      fullscreen: false,
      acceptFirstMouse: false,
      autoHideMenuBar: true
    });

    newWindow.setAspectRatio(width / height);

    if (!position.x || !position.y) {
      newWindow.setSize(
        Math.max(width, 144),
        Math.max(height, 100)
      );
      newWindow.center();
    } else {
      newWindow.setBounds({
        x: position.x,
        y: position.y,
        width: Math.max(width, 144),
        height: Math.max(height, 100)
      });
    }

    newWindow.loadURL('file://' + path.resolve(__dirname, '../viewer.html'));
    newViewerWindows.push(newWindow);

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
      newWindow.webContents.send('pretext', media, index, muteVideo);
      newWindow.show();
    });
  },
  getNewWindowSize: function (width, height, aspect, margin, target) {
    var x;
    var y;
    var mainBounds = (target || mainWindow).getBounds();
    var display = atomScreen.getDisplayMatching(mainBounds);

    if (width + margin * 2 > display.bounds.width) {
      width = display.bounds.width - margin * 2;
      height = Math.floor(width / aspect);
    }

    if (height + margin * 2 > display.bounds.height) {
      height = display.bounds.height - margin * 2;
      width = Math.floor(height * aspect);
    }

    return {width: width, height: height};
  },
  getNewWindowPosition: function (width, height, margin, target) {
    var x;
    var y;
    var mainBounds = (target || mainWindow).getBounds();
    var display = atomScreen.getDisplayMatching(mainBounds);

    x = mainBounds.x + mainBounds.width + margin;

    if ((x + width) > (display.bounds.x + display.bounds.width)) {
      x = mainBounds.x - width - margin;
      if (x <= display.bounds.x) {
        return {x: undefined, y: undefined};
      }
    }

    y = mainBounds.y + margin;

    if ((y + height) > (display.bounds.y + display.bounds.height)) {
      y = mainBounds.y + mainBounds.height - height - margin;
      if (y <= display.bounds.y) {
        return {x: undefined, y: undefined};
      }
    }

    return {x: x, y: y};
  },
  getNewWindowPositionBelow: function (width, height, margin) {
    var x;
    var y;
    var focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;

    if (focusedWindow == mainWindow) {
      return this.getNewWindowPosition(width, height, margin);
    }

    var mainBounds = focusedWindow.getBounds();
    var display = atomScreen.getDisplayMatching(mainBounds);

    x = mainBounds.x;
    y = mainBounds.y + mainBounds.height + margin;

    if ((x + width) > (display.bounds.x + display.bounds.width)) {
      x = mainBounds.x - width - margin;
      if (x <= display.bounds.x) {
        return {x: undefined, y: undefined};
      }
    }

    if ((y + height) > (display.bounds.y + display.bounds.height)) {
      y = mainBounds.y + mainBounds.height - height;
      if (y <= display.bounds.y) {
        return {x: undefined, y: undefined};
      }
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
