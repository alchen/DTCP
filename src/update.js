'use strict';

var app = require('app');
var GhReleases = require('electron-gh-releases');

var options = {
  repo: 'alchen/DTCP',
  currentVersion: app.getVersion()
};

var update = new GhReleases(options, function (autoUpdater) {
  // Auto updater event listener
  autoUpdater.on('error', function (event, message) {
    console.log('Update error: ' + message);
  });

  autoUpdater.on('update-downloaded', function (e, rNotes, rName, rDate, uUrl, quitAndUpdate) {
    // Install the update
    global.willQuit = true;
    quitAndUpdate();
  });
});

module.exports = update;
