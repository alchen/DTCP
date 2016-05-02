'use strict';

const request = require('request');

module.exports = (function () {
  var session = require('electron').session;
  var ElectronProxyAgent = require('./proxy');
  var ses = session.defaultSession;
  var EPA = new ElectronProxyAgent(ses);

  return request.defaults({
    agent: EPA
  });
}());
