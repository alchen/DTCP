/*jshint -W061 */
'use strict';

var mkdirp = require('mkdirp');
var path = require('path');
var fs = require('fs');
var app = require('app');
var ipc = require('electron').ipcMain;
var dialog = require('dialog');
var BrowserWindow = require('browser-window');

var window = null;

app.commandLine.appendSwitch('js-flags', '--expose_gc');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

ipc.on('message', function (event, arg) {
  event.sender.send('message', arg);
});

ipc.on('console.log', function (event, args) {
  console.log.apply(console, args);
});

ipc.on('console.error', function (event, args) {
  console.log.apply(console, args);
});

ipc.on('process.exit', function (event, failures) {
  var code = !failures ? 0 : 1;
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
  window = new BrowserWindow({
    title: 'DTCP Tests',
    show: false,
    width: 800,
    height: 600,
  });
  window.loadURL('file://' + __dirname + '/index.html');
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
