'use strict';

function RestoreDirname(options) {
  // Configure your plugin with options...
}

RestoreDirname.prototype.apply = function (compiler) {
  compiler.parser.plugin('evaluate Identifier __dirname', function (expr) {
    return true;
  });
};

module.exports = RestoreDirname;
