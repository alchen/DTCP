<style lang="sass">
.profile {
  background: #fff;
}

.profilemeta {
  overflow: hidden;
  font-size: .75rem;
  border-bottom: .1rem solid #ccc;
  line-height: 1.25rem;
}

.profilecounts > section {
  margin-right: .375rem;
  display: inline-block;
  text-transform: uppercase;
}

.profilecounttag {
  color: #999;
}

.profilebackground {
  width: 100%;
  padding-bottom: 33%;
  background-size: cover;
}

.profilemetaright .relationship {
  display: inline-block;
  width: 5rem;
  background-color: #5af;
  border-radius: .25rem;
  text-align: center;
  color: #fff;
  padding: .25rem;
  box-shadow: 0 0 3px #ccc;
  vertical-align: top;
  -webkit-animation: fadeIn .2s;
  cursor: pointer;
}

.profilemetaright .relationship.pending {
  background: #eee;
  color: #777;
  cursor: default;
}

.profilemetaright .relationship.self {
  display: none;
}

.profilemetaright .names {
  display: inline-block;
  width: calc(100% - 5rem);
}

.profilemetaright .name {
  font-weight: bold;
  font-size: 1rem;
  color: #333;
  display: block;
}

.profilemetaright .screenname {
  color: #777;
  font-size: 0.6875rem;
  display: block;
}

.profilemetacontent {
  padding: .75rem;
  overflow: hidden;
}

.profilemetaleft {
  float: left;
}

.profileiconlink {
  cursor: default;
}

.profilemetaright {
  float: right;
  width: calc(100% - 3.75rem);
}

.profiletext {
  font-size: .875rem;
}
</style>

<template lang="html">
  <div class="profile">
      <section class="profilemeta" @contextmenu="rightclick">
        <section class="profilebackground" v-if="user.profileBackground" :style="{ backgroundImage: 'url(' + user.profileBackground + ')' }"></section>
        <section class="profilemetacontent">
          <section class="profilemetaleft">
            <a :href="user.originalIcon" target="_blank" class="profileiconlink"><img class="tweeticon" :src="user.biggerIcon" onerror="this.style.visibility='hidden';" /></a>
          </section>
          <section class="profilemetaright">
            <section class="names">
              <span class="name" v-text="user.name"></span>
              <span class="screenname" v-text="user.screenname | at"></span>
            </section>
            <section class="relationship" v-bind:class="{'following': this.user.isFollowing, 'pending': this.user.isPending, 'self': this.user.screenname == username }" @click="toggleFollow" v-text="relationship" v-if="this.user.isFollowing !== null"></section>
            <section class="profiletext" v-text="user.description"></section>
            <section class="profilelocation" v-text="user.location"></section>
            <section class="profileurl"><a :href="user.expandedUrl" v-text="user.expandedUrl" target="_blank"></a></section>
            <section class="profilecounts">
              <section class="statuscount" v-if="user.statusesCount"><span v-text="user.statusesCount"></span>&nbsp;<span class="profilecounttag">tweets</span></section>
              <section class="friendcount" v-if="user.friendsCount"><span v-text="user.friendsCount"></span>&nbsp;<span class="profilecounttag">following</span></section>
              <section class="followercount" v-if="user.followersCount"><span v-text="user.followersCount"></span>&nbsp;<span class="profilecounttag">followers</span></section>
            </section>
          </section>
        </section>
      </section>
      <component is="timeline" :tweets.sync="tweets" :username="username" :now="now"></component>
    </div>
</template>

<script>
'use strict';

var Vue = require('vue');
var ipc = require('electron').ipcRenderer;
var remote = require('remote');
var shell = require('shell');
var contextmenu = require('./contextmenu');
require('./timeline.frame.vue');

var Profile = Vue.extend({
  replace: true,
  props: ['user', 'tweets', 'username', 'now', 'view'],
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
      if (!this.user.isPending) {
        ipc.send(
          'follow',
          this.username,
          this.user.screenname,
          this.user.isFollowing
        );
      }
    },
    rightclick: function (event) {
      var menu = contextmenu.profile(this);
      menu.popup(remote.getCurrentWindow());
      event.preventDefault();
    },
    doReply: function (event) {
      var mentions = [this.user.screenname];

      ipc.send('reply', this.username, null, mentions);
    },
    doShowInBrowser: function (event) {
      var profileUrl = 'https://twitter.com/' + this.user.screenname;

      shell.openExternal(profileUrl);
    },
  }
});

Vue.component('profile', Profile);

module.exports = Profile;
</script>
