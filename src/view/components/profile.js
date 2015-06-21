'use strict';

var Vue = require('vue');
require('./timeline');

var template = '<section class="profile">'
    + '<section class="profilemeta">'
      + '<section class="profilebackground" v-if="user.profileBackground" v-style="background-image: \'url(\' + user.profileBackground + \')\'"></section>'
      + '<section class="profilemetacontent"">'
        + '<section class="profilemetaleft">'
          + '<img class="tweeticon" v-attr="src: user.icon" onerror="this.style.visibility=\'hidden\';" />'
        + '</section>'
        + '<section class="profilemetaright">'
          + '<section class="name" v-text="user.name"></section>'
          + '<section class="screenname" v-text="user.screenname | at"></section>'
          + '<section class="profiletext" v-text="user.description"></section>'
          + '<section class="profilelocation" v-text="user.location"></section>'
          + '<section class="profileurl"><a v-attr="href: user.expandedUrl" v-text="user.expandedUrl"></a></section>'
          + '<section class="profilecounts">'
            + '<section class="statuscount" v-if="user.statusesCount"><span v-text="user.statusesCount"></span>&nbsp;<span class="profilecounttag">tweets</span></section>'
            + '<section class="friendcount" v-if="user.friendsCount"><span v-text="user.friendsCount"></span>&nbsp;<span class="profilecounttag">following</span></section>'
            + '<section class="followercount" v-if="user.followersCount"><span v-text="user.followersCount"></span>&nbsp;<span class="profilecounttag">followers</span></section>'
          + '</section>'
        + '</section>'
      + '</section>'
    + '</section>'
    + '<component is="timeline" tweets="{{@ tweets}}" username="{{username}}" now="{{now}}"></component>'
  + '</section>';

var Profile = Vue.extend({
  replace: true,
  props: ['user', 'tweets', 'username', 'now'],
  template: template,
  filters: {
    at: function (name) {
      return '@' + name;
    }
  },
  computed: {
  },
  methods: {
  },
});

Vue.component('profile', Profile);

module.exports = Profile;
