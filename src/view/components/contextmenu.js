'use strict';

var remote = require('remote');
var Menu = remote.require('menu');

var contextTemplate = [
  {
    label: 'Reply...',
  },
  {
    label: 'Retweet',
  },
  {
    label: 'Quote Tweet...',
  },
  {
    label: 'Favorite',
  },
  {
    type: 'separator'
  },
  {
    label: 'Delete Tweet',
  },
  {
    type: 'separator'
  },
  {
    label: 'View on Twitter.com',
  }
];

module.exports = {
  build: function (vm) {
    contextTemplate[0].click = vm.doReply;
    contextTemplate[1].click = vm.doRetweet;
    contextTemplate[2].click = vm.doQuote;
    contextTemplate[3].click = vm.doFavorite;
    contextTemplate[5].click = vm.doDelete;
    contextTemplate[7].click = vm.doShowInBrowser;

    if (vm.tweet.protected) {
      contextTemplate[1].enabled = false;
      contextTemplate[2].enabled = false;
    } else {
      contextTemplate[1].enabled = true;
      contextTemplate[2].enabled = true;
    }

    if (vm.tweet.screenname !== vm.username) {
      contextTemplate[5].enabled = false;
    } else {
      contextTemplate[5].enabled = true;
    }

    return Menu.buildFromTemplate(contextTemplate);
  }
};

