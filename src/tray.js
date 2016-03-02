'use strict';

const electron = require('electron');
const app = electron.app;
const Menu = electron.Menu;
const windows = require('./windows');
const preferences = require('./preferences');
const path = require('path');

var appIcon = null;

module.exports = {
  createTray: function () {
    appIcon = new electron.Tray(path.resolve(__dirname, '../image/trayicon.png'));

    var contextMenu = Menu.buildFromTemplate([
      {
        label: 'New Tweet',
        click: function () {
          if (preferences.authenticated) {
            windows.requestComposer();
          }
        }
      },
      {
        label: 'Log out',
        click: function () {
          preferences.authenticated = false;
          preferences.accounts = {};
          windows.loadPrompt();
        }
      },
      {type: 'separator'},
      {
        label: 'Exit',
        click: function () {
          global.willQuit = true;
          app.quit();
        }
      }
    ]);

    appIcon.on('click', function (event) {
      var mainWindow = windows.getMainWindow();
      if (mainWindow) {
        mainWindow.show();
      }
    });

    appIcon.on('double-click', function (event) {
      if (preferences.authenticated) {
        windows.requestComposer();
      }
    });

    appIcon.on('right-click', function (event) {
      appIcon.popUpContextMenu(contextMenu);
      return false;
    });
  }
};
