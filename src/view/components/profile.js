'use strict';

var Vue = require('vue');
var ipc = require('electron').ipcRenderer;
var remote = require('remote');
var shell = require('shell');
var contextmenu = require('./contextmenu');
require('./timeline');

var template = '<section class="profile">' +
    '<section class="profilemeta" @contextmenu="rightclick">' +
      '<section class="profilebackground" v-if="user.profileBackground" :style="{ backgroundImage: \'url(\' + user.profileBackground + \')\' }"></section>' +
      '<section class="profilemetacontent"">' +
        '<section class="profilemetaleft">' +
          '<a :href="user.originalIcon" target="_blank" class="profileiconlink"><img class="tweeticon" :src="user.biggerIcon" onerror="this.style.visibility=\'hidden\';" /></a>' +
        '</section>' +
        '<section class="profilemetaright">' +
          '<section class="names">' +
            '<span class="name" v-text="user.name"></span>' +
            '<span class="screenname" v-text="user.screenname | at"></span>' +
          '</section>' +
          '<section class="relationship" @click="toggleFollow" v-text="relationship" v-if="this.user.isFollowing !== null"></section>' +
          '<section class="profiletext" v-text="user.description"></section>' +
          '<section class="profilelocation" v-text="user.location"></section>' +
          '<section class="profileurl"><a :href="user.expandedUrl" v-text="user.expandedUrl" target="_blank"></a></section>' +
          '<section class="profilecounts">' +
            '<section class="statuscount" v-if="user.statusesCount"><span v-text="user.statusesCount"></span>&nbsp;<span class="profilecounttag">tweets</span></section>' +
            '<section class="friendcount" v-if="user.friendsCount"><span v-text="user.friendsCount"></span>&nbsp;<span class="profilecounttag">following</span></section>' +
            '<section class="followercount" v-if="user.followersCount"><span v-text="user.followersCount"></span>&nbsp;<span class="profilecounttag">followers</span></section>' +
          '</section>' +
        '</section>' +
      '</section>' +
    '</section>' +
    '<component is="timeline" :tweets.sync="tweets" :username="username" :now="now"></component>' +
  '</section>';

var Profile = Vue.extend({
  replace: true,
  props: ['user', 'tweets', 'username', 'now'],
  template: template,
  events: {
  },
  filters: {
    at: function (name) {
      return '@' + name;
    }
  },
  computed: {
    relationship: function () {
      if (this.user.isPending) {
        return 'Pending';
      } else if (this.user.isFollowing) {
        return 'Following';
      } else {
        return 'Follow';
      }
    }
  },
  methods: {
    toggleFollow: function () {
      ipc.send(
        'follow',
        this.user.screenname,
        this.user.isFollowing || this.user.isPending
      );
    },
    rightclick: function (event) {
      var menu = contextmenu.profile(this);
      menu.popup(remote.getCurrentWindow());
      event.preventDefault();
    },
    doReply: function (event) {
      var mentions = [this.user.screenname];

      ipc.send('reply', null, mentions);
    },
    doShowInBrowser: function (event) {
      var profileUrl = 'https://twitter.com/' + this.user.screenname;

      shell.openExternal(profileUrl);
    },
  }
});

Vue.component('profileComponent', Profile);

module.exports = Profile;
