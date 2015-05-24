'use strict';

var remote = require('remote');
var Menu = remote.require('menu');
var _ = require('lodash');
var ipc = require('ipc');
var moment = require('moment');
var twitterText = require('twitter-text');
var Ractive = require('ractive');
Ractive.events.tap = require( 'ractive-events-tap' );
require('../lib/ractive-event-viewport');

var ractive;

function reply(event, replyScreenName, replyTo, mentions) {
  console.log('Renderer: reply');

  mentions = _.map(mentions, function (k) {
    return k.screen_name;
  });
  mentions.unshift(replyScreenName);
  ipc.send('reply', replyTo, mentions);
}

function quote(event, replyTo, screenName) {
  console.log('Renderer: quote');

  var quoteUrl = 'https://twitter.com/'
    + screenName
    + '/status/'
    + replyTo;

  ipc.send('quote', replyTo, quoteUrl);
}

function retweet(event, tweetId) {
  console.log('Renderer: retweet');

  var keypath = event.keypath + '.retweeted';
  var setTo = !ractive.get(keypath);
  ipc.send('retweet', tweetId, setTo);
  ractive.set(keypath, setTo);
}

function favorite(event, tweetId) {
  console.log('Renderer: favorite');

  var keypath = event.keypath + '.favorited';
  var setTo = !ractive.get(keypath);
  ipc.send('favorite', tweetId, setTo);
  ractive.set(keypath, setTo);
}

var contextKeypath = null;
var contextTemplate = [
  {
    label: 'Reply\u2026',
    click: function () {
      if (!contextKeypath || !ractive) {
        return;
      }

      var tweet = ractive.get(contextKeypath);
      if (tweet.retweeted_status) {
        reply(
          {
            keyPath: contextKeypath
          },
          tweet.retweeted_status.user.screen_name,
          tweet.retweeted_status.id_str,
          tweet.retweeted_status.entities.user_mentions
        );
      } else {
        reply(
          {
            keyPath: contextKeypath
          },
          tweet.user.screen_name,
          tweet.id_str,
          tweet.entities.user_mentions
        );
      }

      contextKeypath = null;
    }
  },
  {
    label: 'Retweet',
    click: function () {
      if (!contextKeypath || !ractive) {
        return;
      }

      var tweet = ractive.get(contextKeypath);
      retweet({
        keyPath: contextKeypath
      }, tweet.id_str);

      contextKeypath = null;
    }
  },
  {
    label: 'Quote Tweet\u2026',
    click: function () {
      if (!contextKeypath || !ractive) {
        return;
      }

      var tweet = ractive.get(contextKeypath);
      if (tweet.retweeted_status) {
        quote(
          {
            keyPath: contextKeypath
          },
          tweet.retweeted_status.id_str,
          tweet.retweeted_status.user.screen_name
        );
      } else {
        quote(
          {
            keyPath: contextKeypath
          },
          tweet.id_str,
          tweet.user.screen_name
        );
      }

      contextKeypath = null;
    }
  },
  {
    label: 'Favorite',
    click: function () {
      if (!contextKeypath || !ractive) {
        return;
      }

      var tweet = ractive.get(contextKeypath);
      favorite({
        keyPath: contextKeypath
      }, tweet.id_str);

      contextKeypath = null;
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Delete Tweet',
    click: function () {
      if (!contextKeypath || !ractive) {
        return;
      }

      contextKeypath = null;
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'View on Twitter.com',
    click: function () {
      if (!contextKeypath || !ractive) {
        return;
      }

      contextKeypath = null;
    }
  }
];
var menu = Menu.buildFromTemplate(contextTemplate);

window.addEventListener('contextmenu', function (event) {
  var el = event.target;
  while (!el.classList.contains('tweet') && el.parentElement) {
    el = el.parentElement;
  }
  if (el.classList.contains('tweet')) {
    contextKeypath = el.getAttribute('data-keypath');

    var tweet = ractive.get(contextKeypath);
    if ((tweet.retweeted_status && tweet.retweeted_status.user.protected) || tweet.user.protected) {
      // Disable retweet and quote
      menu.items[1].enabled = false;
      menu.items[2].enabled = false;
    }

    // Disable delete tweet
    menu.items[5].enabled = false;

    menu.popup(remote.getCurrentWindow());
  } else {
    contextKeypath = null;
  }
  event.preventDefault();
}, false);

var loader = '<div class="loader loader-inner ball-clip-rotate" on-viewport="loadMore"><div></div></div>';

var nav = '<header class="headernav">'
  + '<span class="logo">'
    + '<button class="navbutton">'
      + '<svg xmlns="http://www.w3.org/2000/svg" class="iconic-beaker injected-svg iconic iconic-sm" width="128" height="128" viewBox="0 0 128 128" data-src="svg/beaker.svg">'
        + '<g class="iconic-beaker-sm iconic-container iconic-sm" data-width="16" data-height="16" display="inline" transform="scale(8)">'
          + '<path d="M14.914 12.086l-1.497-2.086h-3.417c0-.552-.448-1-1-1s-1 .448-1 1h-5.458l-1.455 2.086c-.378.377-.587.879-.587 1.414s.208 1.038.586 1.414c.377.378.879.586 1.414.586h11c.535 0 1.038-.208 1.414-.586.378-.377.586-.879.586-1.414 0-.535-.21-1.04-.586-1.414z" class="iconic-beaker-fluid iconic-property-fill"></path>'
          + '<path stroke="#000" d="M2.5 15.5c-.552 0-1.052-.224-1.414-.586-.362-.362-.586-.862-.586-1.414s.224-1.052.586-1.414l4.414-6.586v-5h5v5l4.414 6.586c.362.362.586.862.586 1.414s-.224 1.052-.586 1.414c-.362.362-.862.586-1.414.586h-11z" class="iconic-beaker-glass iconic-property-stroke" fill="none"></path>'
          + '<path stroke="#000" stroke-linecap="round" class="iconic-beaker-glass iconic-beaker-glass-rim iconic-property-stroke" d="M4.5.5h7" fill="none"></path>'
        + '</g>'
      + '</svg>'
    + '</button>'
  + '</span>'
  + '<nav class="nav">'
    + '<ul class="navlist">'
      + '<li class="navicon">'
        + '<button class="navbutton" on-tap="show:home"><span class="oi" data-glyph="home"></span></button>'
      + '</li>'
      + '<li class="navicon">'
        + '<button class="navbutton" on-tap="show:mentions"><span class="oi" data-glyph="people"></span></button>'
      + '</li>'
      // + '<li class="navicon">'
      //   + '<button class="navbutton" on-tap="show:messages"><span class="oi" data-glyph="chat"></span></button>'
      // + '</li>'
    + '</ul>'
  + '</nav>'
+ '</header>';

var timelines = '<ul class="tweets timeline{{#if show === \'home\'}} activetimeline{{/if}}" intro="fade">'
  + '{{#home}}{{> list}}{{/home}}'
  + '{{#if loaded}}'
  + '<li>' + loader + '</li>'
  + '{{/if}}'
  + '</ul>'
  + '<ul class="tweets timeline{{#if show === \'mentions\'}} activetimeline{{/if}}" intro="fade">'
  + '{{#mentions}}{{> list}}{{/mentions}}'
  + '{{#if loaded}}'
  + '<li>' + loader + '</li>'
  + '{{/if}}'
  + '</ul>'
  + '<ul class="tweets timeline{{#if show === \'messages\'}} activetimeline{{/if}}" intro="fade">'
  + '{{#messages}}{{> list}}{{/messages}}'
  + '</ul>';

var timelineContainer = '<section class="timelines">'
    + timelines
  + '</section>';

var list = '{{#retweeted_status}}'
    + '{{> tweet}}'
  + '{{else}}'
    + '{{> tweet}}'
  + '{{/retweeted_status}}';

var tweet = '<li class="tweet" intro="fade" data-keypath="{{ @keypath }}">'
    + '<section class="tweetleft">'
      + '<img class="tweeticon" src="{{ user.profile_image_url_https }}" onerror="this.style.display=\'none\';" />'
    + '</section>'
    + '<section class="tweetright">'
      + '<section class="tweetmeta">'
        + '<section class="tweetmetaleft">'
          + '<span class="name">{{ user.name }}</span>'
          + '&nbsp;'
          + '<span class="screenname">@{{ user.screen_name }}</span>'
        + '</section>'
        + '<section class="tweetmetaright">'
          + '<span class="tweettime">{{ timeFrom(created_at, now) }}</span>'
          + '<ul class="tweetactions">'
            + '<li class="tweetaction"><button class="tweetbutton" on-tap="reply:{{ user.screen_name }},{{ id_str }},{{ entities.user_mentions }}"><span class="oi tweetbuttonicon" data-glyph="share"></span></button></li>'
            + '{{#if user.protected}}'
            + '<li class="tweetaction"><button class="tweetbutton disabledbutton"><span class="oi tweetbuttonicon" data-glyph="loop-circular"></span></button></li>'
            + '<li class="tweetaction"><button class="tweetbutton disabledbutton"><span class="oi tweetbuttonicon" data-glyph="double-quote-serif-left"></span></button></li>'
            + '{{else}}'
            + '<li class="tweetaction"><button class="tweetbutton{{#if retweeted}} activetweetbutton{{/if}}" on-tap="retweet:{{ id_str }}"><span class="oi tweetbuttonicon" data-glyph="loop-circular"></span></button></li>'
            + '<li class="tweetaction"><button class="tweetbutton" on-tap="quote:{{ id_str }},{{ user.screen_name }}"><span class="oi tweetbuttonicon" data-glyph="double-quote-serif-left"></span></button></li>'
            + '{{/if}}'
            + '<li class="tweetaction"><button class="tweetbutton{{#if favorited}} activetweetbutton{{/if}}" on-tap="favorite:{{ id_str }}"><span class="oi tweetbuttonicon" data-glyph="star"></span></button></li>'
          + '</ul>'
        + '</section>'
      + '</section>'
      + '<section class="tweettext">'
        + '{{{ linkify(this) }}}'
      + '</section>'
      + '{{#if retweeted_status}}'
      + '<section class="tweetretweet">'
        + '<span class="oi retweeticon" data-glyph="loop-square"></span><span class="retweetname">{{ ../user.name }}</span>'
      + '</section>'
      + '{{/if}}'
      + '{{#if extended_entities.media}}'
      + '<section class="tweetmedia">'
        + '<ul class="tweetimagelist">'
        + '{{#each extended_entities.media}}'
          + '<li class="tweetimagebox" style="background-image:url(\'{{ media_url_https }}\'); width: calc(100% / {{ extended_entities.media.length }})">'
          + '</li>'
        + '{{/each}}'
        + '</ul>'
      + '</section>'
      + '{{/if}}'
      + '{{#quoted_status}}'
      + '<section class="quotedtweet">'
        + '<section class="quotedmeta">'
          + '<span class="name">{{ user.name }}</span>'
          + '&nbsp;'
          + '<span class="screenname">@{{ user.screen_name }}</span>'
        + '</section>'
        + '<section class="quotedtext">'
          + '{{{ linkify(this) }}}'
        + '</section>'
        + '{{#if quoted_status.extended_entities.media}}'
          + '{{> extended_entities}}'
        + '{{/if}}'
      + '</section>'
    + '{{/quoted_status}}'
    + '</section>'
  + '</li>';

var extended_entities = '<section class="tweetmedia">'
    + '<ul class="tweetimagelist">'
    + '{{#each extended_entities.media}}'
      + '<li class="tweetimagebox" style="background-image:url(\'{{ media_url_https }}\'); width: calc(100% / {{ extended_entities.media.length }})">'
      + '</li>'
    + '{{/each}}'
    + '</ul>'
  + '</section>';

var template = nav + timelineContainer;

ipc.on('initialLoad', function (initialTweets) {
  ractive = new Ractive({
    el: '#content',
    template: template,
    partials: {
      tweet: tweet,
      list: list,
      extended_entities: extended_entities
    },
    data: {
      loaded: (initialTweets.home.length > 0),
      show: 'home',
      now: moment(),
      home: initialTweets.home,
      mentions: initialTweets.mentions,
      messages: initialTweets.messages,
      timeFrom: function timeFrom(time, now) {
        var duration = moment.duration(now.diff(moment(new Date(time))));
        var sign = null;
        if ((sign = duration.as('second')) <= 5) {
          return 'now';
        } else if (sign < 60) {
          return Math.round(sign) + 's';
        } else if ((sign = duration.as('minute')) < 60) {
          return Math.round(sign) + 'm';
        } else if ((sign = duration.as('hour')) < 24) {
          return Math.round(sign) + 'h';
        } else if ((sign = duration.as('day')) <= 365) {
          return Math.round(sign) + 'd';
        } else {
          sign = duration.as('year');
          return Math.round(sign) + 'y';
        }
      },
      linkify: function (tweet) {
        if (!tweet) {
          return;
        } else if (!tweet.text) {
          // var util = require('util')
          // console.log(util.inspect(tweet));
          console.log('!! A tweet should always have a text attr');
          return;
        }

        var options = {
          targetBlank: true,
          usernameIncludeSymbol: true,
        };
        if (tweet.entities) {
          return twitterText.autoLinkWithJSON(tweet.text, tweet.entities, options);
        } else {
          console.log('Renderer: autoLink without entities');
          return twitterText.autoLink(tweet.text, options);
        }
      }
    },
    transitions: {
      fade: require('ractive-transitions-fade')
    },
    oncomplete: function () {
      console.log('Renderer: initial load');
      
    },
    transitionsEnabled: false
  });

  setInterval(function () {
    ractive.set('now', moment());
  }, 60 * 1000);

  ractive.on('loadMore', function (event) {
    var toShow = ractive.get('show');
    if (!ractive.get('loaded')) {
      console.log('Renderer: initial load and this should not happen here');
      ipc.send('initialLoad');
    } else if (event.original.visible) {
      console.log('Event: load ' + toShow);
      if (toShow === 'messages') {
        //ipc.send('loadMessages');
        console.log('should load messages');
      } else {
        ipc.send('loadMore', toShow);
      }
    }
  });

  function scrollToTop(target, duration) {
    var animationDelay = 30;
    var scrollHeight = target.scrollTop;
    var scrollStep = scrollHeight / (duration / animationDelay);

    function step() {
      setTimeout(function () {
        if (target.scrollTop > scrollStep) {
          target.scrollTop -= scrollStep;
          requestAnimationFrame(step);
        } else {
          target.scrollTop = 0;
        }
      }, animationDelay);
    }

    // Set things in motion
    requestAnimationFrame(step); 
  }

  ractive.on('show', function (event, toShow) {
    if (toShow === ractive.get('show')) {
      var timelineEl = document.getElementsByClassName('activetimeline')[0];
      scrollToTop(timelineEl, 210);
    } else {
      ractive.set('show', toShow);
    }
  });

  ractive.on('reply', reply);
  ractive.on('quote', quote);
  ractive.on('retweet', retweet);
  ractive.on('favorite', favorite);

  ipc.on('newTweet', function (timeline, tweet) {
    var timelineEl = document.getElementsByClassName('activetimeline')[0];
    var toBottom =  timelineEl.scrollTop < 64 ? 0 : timelineEl.scrollHeight - timelineEl.scrollTop;
    console.log('Renderer: newTweet on ' + timeline);
    ractive.set('now', moment());
    ractive.unshift(timeline, tweet);
    ractive.set('loaded', true);
    ractive.transitionsEnabled = true;
    timelineEl.scrollTop = toBottom ? timelineEl.scrollHeight - toBottom : 0;
  });

  ipc.on('newTweets', function (timeline, tweets) {
    if (!tweets) {
      return;
    }
    console.log('Renderer: newTweets on ' + timeline);
    ractive.set('now', moment());
    ractive.set(timeline, tweets);
    ractive.set('loaded', true);
    ractive.transitionsEnabled = true;
  });
});

ipc.send('initialLoad');

module.exports = ractive;
