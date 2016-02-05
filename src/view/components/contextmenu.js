'use strict';

var remote = require('remote');
var Menu = remote.require('menu');

module.exports = {
  tweet: function (vm) {
    var contextTemplate = [
      {
        label: 'Reply...',
        accelerator: 'R'
      },
      {
        label: 'Retweet',
        accelerator: 'T'
      },
      {
        label: 'Quote Tweet...',
        accelerator: 'Alt+T'
      },
      {
        label: 'Favorite',
        accelerator: 'F'
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

    contextTemplate[0].click = vm.doReply;
    contextTemplate[1].click = vm.doRetweet;
    contextTemplate[2].click = vm.doQuote;
    contextTemplate[3].click = vm.doFavorite;
    contextTemplate[5].click = vm.doDelete;
    contextTemplate[7].click = vm.doShowInBrowser;

    // Disable retweet and quote for protected user
    if (vm.tweet.user.isProtected) {
      contextTemplate[1].enabled = false;
      contextTemplate[2].enabled = false;
    }

    // Disable delete if not posted by current user
    if (vm.tweet.user.screenname !== vm.username) {
      contextTemplate[5].enabled = false;
    }

    if (vm.tweet.isRetweeted) {
      contextTemplate[1].label = 'Undo Retweet';
    }

    if (vm.tweet.isFavorited) {
      contextTemplate[3].label = 'Undo Favorite';
    }

    return Menu.buildFromTemplate(contextTemplate);
  },
  profile: function (vm) {
    var contextTemplate = [
      {
        label: 'Public Reply',
      },
      {
        type: 'separator'
      },
      {
        label: 'Follow',
        enabled: false
      },
      {
        label: 'Block',
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: 'View on Twitter.com',
      }
    ];

    contextTemplate[0].click = vm.doReply;
    contextTemplate[5].click = vm.doShowInBrowser;

    if (vm.user.isFollowing) {
      contextTemplate[2].label = 'Unfollow';
    }

    return Menu.buildFromTemplate(contextTemplate);
  }
};
