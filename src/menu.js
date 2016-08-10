'use strict';

const app = require('electron').app;
const shell = require('electron').shell;
const Menu = require('electron').Menu;
const BrowserWindow = require('electron').BrowserWindow;
var preferences = require('./preferences');
var windows = require('./windows');

module.exports = {
  createApplicationMenu: function createApplicationMenu() {
    var template;

    if (process.platform === 'darwin') {
      template = [
        {
          label: 'DTCP',
          submenu: [
            {
              label: 'About',
              click: function () {
                windows.getAboutWindow();
              }
            },
            {
              type: 'separator'
            },
            {
              label: 'Preferences...',
              accelerator: 'Command+,',
              click: function () {
                windows.getPreferencesWindow();
              }
            },
            {
              label: 'suggestions...',
              click: function () {
                windows.getSuggestionsWindow();
              }
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
              label: 'Log out',
              click: function () {
                preferences.authenticated = false;
                preferences.accounts = {};
                windows.loadPrompt();
              }
            },
            {
              type: 'separator'
            },
            {
              label: 'Quit',
              accelerator: 'Command+Q',
              click: function () {
                global.willQuit = true;
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
                if (preferences.authenticated) {
                  windows.requestComposer();
                }
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
              label: 'Undo',
              accelerator: 'Command+Z',
              selector: 'undo:'
            },
            {
              label: 'Redo',
              accelerator: 'Shift+Command+Z',
              selector: 'redo:'
            },
            {
              type: 'separator'
            },
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
          submenu: (process.env.NODE_ENV !== 'production') ? [
            {
              label: 'Reload',
              accelerator: 'Command+R',
              click: function () { BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache(); }
            },
            {
              label: 'Toggle DevTools',
              accelerator: 'Alt+Command+I',
              click: function () { BrowserWindow.getFocusedWindow().toggleDevTools(); }
            }
          ] : [
            {
              label: 'Reload',
              accelerator: 'Command+R',
              click: function () { BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache(); }
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
              click: function () { shell.openExternal('https://twitter.com/uinoka'); }
            }
          ]
        }
      ];

      Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
  }
};
