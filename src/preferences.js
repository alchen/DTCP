'use strict';

var config = require('./config');
var _ = require('lodash');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

var filePath = path.join(config.preferencePath, 'preferences.json');

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
    mkdirp.sync(config.preferencePath);
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
