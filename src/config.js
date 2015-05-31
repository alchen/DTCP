'use strict';

var path = require('path');

function getUserHome() {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

function getPath() {
  return path.join(getUserHome(), '/Library/Application Support/com.lab704.dtcp');
}

module.exports = {
  preferencePath: getPath(),
  consumerKey: '4g0E1FHLfCrZMjjiaD3VXyVmb',
  consumerSecret: '5BqCtFgsHZOnttQT6qSp483erSDVCnUcMX0THCFCe5vnWEv2zC',
};
