'use strict';

var _ = require('lodash');
var ipc = require('electron').ipcRenderer;
var Vue = require('vue');
var twitterText = require('twitter-text');

Vue.config.debug = process.env.NODE_ENV !== 'production';
Vue.config.strict = true;

var newTweet;

ipc.on('pretext', function (event, screenname, availableUsers, replyTo, pretext, options) {
  newTweet = new Vue({
    el: '#content',
    data: {
      rawTweet: pretext ? (!(options && options.frontFocus) ? pretext + ' ' : ' ' + pretext) : '',
      replyTo: replyTo,
      frontFocus: options && options.frontFocus,
      screenname: screenname,
      availableUsers: availableUsers,
      showingSwitches: false,
      mediaType: undefined,
      mediaPaths: [],
      message: undefined
    },
    computed: {
      switchUsers: function () {
        var self = this;
        var users = _.filter(this.availableUsers, function (user) {
          return user.screenname !== self.screenname;
        });
        users.unshift(this.availableUsers[this.screenname]);

        return users;
      },
      composer: function () {
        return this.availableUsers[this.screenname];
      },
      isValid: function () {
        return twitterText.isValidTweetText(this.rawTweet);
      },
      remainingLength: function () {
        return 140 - twitterText.getTweetLength(this.rawTweet);
      },
      formattedTweet: function () {
        return twitterText.autoLink(this.rawTweet, {
          usernameIncludeSymbol: true,
          htmlEscapeNonEntities: true
        });
      }
    },
    methods: {
      showSwitches: function () {
        this.showingSwitches = true;
      },
      dismiss: function () {
        this.showingSwitches = false;
      },
      switchUser: function (screenname) {
        this.screenname = screenname;
        this.showingSwitches = false;
      },
      escape: function () {
        ipc.send('dismiss');
      },
      sendTweet: function (event) {
        if (this.isValid) {
          ipc.send('sendTweet', this.screenname, this.rawTweet, this.replyTo, this.mediaPaths);
        }
      },
      updateTweet: function (event) {
        this.rawTweet = event.target.value;

        var mentions = twitterText.extractMentionsWithIndices(this.rawTweet);
        var textarea = document.getElementsByClassName('newrawtweet')[0];
        var caretPosition = textarea.selectionStart;
        var currentName = _.find(mentions, function (mention) {
          return caretPosition >= mention.indices[0] && caretPosition <= mention.indices[1];
        });
        if (currentName) {
          // find relevant name
        }
      },
      addMedia: function () {
        var fileElem = document.getElementById("fileElem");

        if (fileElem) {
          fileElem.click();
        }
      },
      handleFiles: function (files) {
        if (files.length) {
          if (/image\/.*/i.test(files[0].type)) {
            this.mediaType = 'image';
            this.mediaPaths.push(files[0].path);
            if (this.mediaPaths.length > 4) {
              this.mediaPaths.shift()
            }
          } else if (/video\/.*/i.test(files[0].type)) {
            this.mediaType = 'video';
            this.mediaPaths = [files[0].path];
          }
          var contentEl = document.getElementById('content');
          var currentHeight = contentEl.scrollHeight;
          this.$nextTick(function () {
            ipc.send('resizeComposerToHeight', contentEl.scrollHeight);
          });
        }
      },
      inputFile: function (event) {
        var files = event.target.files;
        this.handleFiles(files);
      },
      disable: function (event) {
        event.stopPropagation();
        event.preventDefault();
      },
      drop: function (e) {
        e.stopPropagation();
        e.preventDefault();

        var dt = e.dataTransfer;
        var files = dt.files;

        this.handleFiles(files);
      }
    },
    compiled: function () {
      var self = this;

      // Handle keyboard shortcut
      ipc.on('tweet', function () {
        self.sendTweet();
      });

      ipc.on('message', function (event, message) {
        self.message = message;
      });

      var textarea = document.getElementsByClassName('newrawtweet')[0];
      textarea.focus();
      if (!this.frontFocus) {
        var len = textarea.value.length;
        textarea.selectionStart = len;
        textarea.selectionENd = len;
      } else {
        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;
      }
    }
  });
});
