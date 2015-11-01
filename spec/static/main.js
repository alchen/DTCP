/*jshint -W061 */
'use strict';

var mkdirp = require('mkdirp');
var path = require('path');
var fs = require('fs');
var app = require('app');
var ipc = require('ipc');
var dialog = require('dialog');
var BrowserWindow = require('browser-window');
var Menu = require('menu');

var window = null;
process.port = 0;  // will be used by crash-reporter spec.

app.commandLine.appendSwitch('js-flags', '--expose_gc');
app.commandLine.appendSwitch('ignore-certificate-errors');

ipc.on('message', function (event, arg) {
  event.sender.send('message', arg);
});

ipc.on('console.log', function (event, args) {
  console.log.apply(console, args);
});

ipc.on('console.error', function (event, args) {
  console.log.apply(console, args);
});

ipc.on('process.exit', function (event, code) {
  process.exit(code);
});

ipc.on('coverage', function (event, json) {
  var coverageFolder = path.join(__dirname, '../../coverage/');
  var coverageFile = path.join(coverageFolder, 'coverage.json');
  mkdirp.sync(coverageFolder);
  fs.writeFileSync(coverageFile, json);
});

ipc.on('eval', function (event, script) {
  event.returnValue = eval(script);
});

ipc.on('echo', function (event, msg) {
  event.returnValue = msg;
});

if (process.argv[2] === '--ci') {
  process.removeAllListeners('uncaughtException');
  process.on('uncaughtException', function (error) {
    console.error(error, error.stack);
    process.exit(1);
  });
}

app.on('window-all-closed', function () {
  app.quit();
});

app.on('ready', function () {
  var template = [
    {
      label: 'Atom',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'CommandOrControl+Q',
          click: function (item, window) { app.quit(); }
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CommandOrControl+Z',
          selector: 'undo:',
        },
        {
          label: 'Redo',
          accelerator: 'CommandOrControl+Shift+Z',
          selector: 'redo:',
        },
        {
          type: 'separator',
        },
        {
          label: 'Cut',
          accelerator: 'CommandOrControl+X',
          selector: 'cut:',
        },
        {
          label: 'Copy',
          accelerator: 'CommandOrControl+C',
          selector: 'copy:',
        },
        {
          label: 'Paste',
          accelerator: 'CommandOrControl+V',
          selector: 'paste:',
        },
        {
          label: 'Select All',
          accelerator: 'CommandOrControl+A',
          selector: 'selectAll:',
        },
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CommandOrControl+R',
          click: function (item, window) { window.restart(); }
        },
        {
          label: 'Enter Fullscreen',
          click: function (item, window) { window.setFullScreen(true); }
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'Alt+CommandOrControl+I',
          click: function (item, window) { window.toggleDevTools(); }
        },
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Open',
          accelerator: 'CommandOrControl+O',
        },
        {
          label: 'Close',
          accelerator: 'CommandOrControl+W',
          click: function (item, window) { window.close(); }
        },
      ]
    },
  ];

  var menu = Menu.buildFromTemplate(template);
  app.setApplicationMenu(menu);

  window = new BrowserWindow({
    title: 'Electron Tests',
    show: false,
    width: 800,
    height: 600,
    'web-preferences': {
      javascript: true  // Test whether web-preferences crashes.
    },
  });
  window.loadUrl('file://' + __dirname + '/index.html');
  window.on('unresponsive', function () {
    var chosen = dialog.showMessageBox(window, {
      type: 'warning',
      buttons: ['Close', 'Keep Waiting'],
      message: 'Window is not responsing',
      detail: 'The window is not responding. Would you like to force close it or just keep waiting?'
    });
    if (chosen === 0) {
      window.destroy();
    }
  });
});
