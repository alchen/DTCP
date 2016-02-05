var fs = require('fs');
var path = require('path');
var _ = require('lodash');

_.each(['server', 'client', 'Agents'], function (f) {
  var exp = require('./lib/' + f);
  var keys = Object.keys(exp);

  _.each(keys, function (key) {
    exports[key] = exp[key];
  })
});

exports.auth = {
  None: require('./lib/auth/None.js'),
  UserPassword: require('./lib/auth/UserPassword.js'),
};
