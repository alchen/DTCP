'use strict';

var app = require('app');
var gh_releases = require('electron-gh-releases');

var options = {
  repo: 'alchen/DTCP',
  currentVersion: app.getVersion()
};

var update = new gh_releases(options, function (auto_updater) {
  // Auto updater event listener
  auto_updater.on('error', function (event, message) {
    console.log('Update error: ' + message);
  });

  auto_updater.on('update-downloaded', function (e, rNotes, rName, rDate, uUrl, quitAndUpdate) {
    // Install the update
    global.willQuit = true;
    quitAndUpdate();
  });
});

module.exports = update;
