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

// In the renderer process:
var remote = require('electron').remote;
var webFrame = require('electron').webFrame;
var SpellCheckProvider = require('electron-spell-check-provider');
// `remote.require` since `Menu` is a main-process module.
var buildEditorContextMenu = require('electron-editor-context-menu');

var selection;
function resetSelection() {
  selection = {
    isMisspelled: false,
    spellingSuggestions: []
  };
}
resetSelection();

// Reset the selection when clicking around, before the spell-checker runs and the context menu shows.
window.addEventListener('mousedown', resetSelection);

// The spell-checker runs when the user clicks on text and before the 'contextmenu' event fires.
// Thus, we may retrieve spell-checking suggestions to put in the menu just before it shows.
webFrame.setSpellCheckProvider(
  'en-US',
  // Not sure what this parameter (`autoCorrectWord`) does: https://github.com/atom/electron/issues/4371
  // The documentation for `webFrame.setSpellCheckProvider` passes `true` so we do too.
  true,
  new SpellCheckProvider('en-US').on('misspelling', function(suggestions) {
    // Prime the context menu with spelling suggestions _if_ the user has selected text. Electron
    // may sometimes re-run the spell-check provider for an outdated selection e.g. if the user
    // right-clicks some misspelled text and then an image.
    if (window.getSelection().toString()) {
      selection.isMisspelled = true;
      // Take the first three suggestions if any.
      selection.spellingSuggestions = suggestions.slice(0, 3);
    }
  }));

var contextTemplate = [{
  label: 'Undo',
  role: 'undo'
}, {
  label: 'Redo',
  role: 'redo'
}, {
  type: 'separator'
}, {
  label: 'Cut',
  role: 'cut'
}, {
  label: 'Copy',
  role: 'copy'
}, {
  label: 'Paste',
  role: 'paste'
}, {
  label: 'Paste and Match Style',
  click: function() {
    BrowserWindow.getFocusedWindow().webContents.pasteAndMatchStyle();
  }
}, {
  label: 'Select All',
  role: 'selectall'
}];

window.addEventListener('contextmenu', function(e) {
  // Only show the context menu in text editors.
  if (!e.target.closest('textarea, input, [contenteditable="true"]')) return;

  var menu = buildEditorContextMenu(selection);

  // The 'contextmenu' event is emitted after 'selectionchange' has fired but possibly before the
  // visible selection has changed. Try to wait to show the menu until after that, otherwise the
  // visible selection will update after the menu dismisses and look weird.
  setTimeout(function() {
    menu.popup(remote.getCurrentWindow());
  }, 30);
});
