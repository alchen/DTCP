'use strict';

function RestoreDirname(options) {
  // Configure your plugin with options...
}

RestoreDirname.prototype.apply = function (compiler) {
  compiler.plugin("compilation", function(compilation, data) {
    data.normalModuleFactory.plugin("parser", function(parser, options) { parser.plugin('evaluate Identifier __dirname', function (expr) {
        return true;
      });
    });
  });
};

module.exports = RestoreDirname;
