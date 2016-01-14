'use strict';

var config = require('./config');
var _ = require('lodash');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var app = require('electron').app;

function getPath() {
  if (process.platform === 'win32') {
    return app.getPath('userData');
  } else {
    return path.join(process.env.HOME, '/Library/Application Support/com.lab704.dtcp');
  }
}

var filePath = path.join(getPath(), 'preferences.json');

var excludeMethods = function (key, value) {
  if (key === 'save' || key === 'load') {
    return undefined;
  } else {
    return value;
  }
};

var preferences = {
  authenticated: false,
  accounts: {},
  save: function (preferences) {
    mkdirp.sync(getPath());
    fs.writeFileSync(filePath, JSON.stringify(this, excludeMethods, 2));
  },
  load: function () {
    try {
      _.assign(this, JSON.parse(fs.readFileSync(filePath, 'utf8')));
    } catch (e) {
      console.log('Preference: error reading file');
    }

    return this;
  }
};

preferences.load();

module.exports = preferences;
