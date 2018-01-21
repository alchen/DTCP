'use strict';

var _ = require('lodash');
var ipc = require('electron').ipcRenderer;
var Vue = require('vue');
var twitterText = require('twitter-text');

var getCaretCoordinates = require('../lib/textarea-caret-position');

Vue.config.debug = process.env.NODE_ENV !== 'production';
Vue.config.strict = true;

var newTweet;

ipc.on('pretext', function (event, screenname, availableUsers, replyTo, pretext, options) {
  newTweet = new Vue({
    el: '#content',
    data: {
      rawTweet: pretext ? (options && options.frontFocus ? ' ' + pretext : pretext + ' ') : '',
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
      parsedTweet: function () {
        return twitterText.parseTweet(this.rawTweet);
      },
      isValid: function () {
        return this.parsedTweet.valid || (!this.rawTweet && this.mediaPaths.length);
      },
      permillage: function () {
        return this.parsedTweet.permillage;
      },
      strokeDashoffset: function () {
        var RADIUS = 10;
        var CIRCUMFERENCE = 2 * Math.PI * RADIUS;
        var totalSteps = 50;
        var stepLength = 1000 / totalSteps;

        var currentStep = (this.permillage - this.permillage % stepLength) / stepLength;
        var progress = Math.min(currentStep / totalSteps, 1);
        var dashoffset = CIRCUMFERENCE * (1 - progress);

        return dashoffset;
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
          ipc.send('setSavedTweet', '');
        }
      },
      updateTweet: function (event) {
        this.rawTweet = event.target.value;

        ipc.send('setSavedTweet', this.rawTweet);
        this.checkSuggestion();
      },
      checkSuggestion: function () {
        var mentions = twitterText.extractMentionsWithIndices(this.rawTweet);
        var textarea = document.getElementsByClassName('newrawtweet')[0];
        var caretPosition = textarea.selectionStart;
        var currentMention = _.find(mentions, function (mention) {
          return caretPosition >= mention.indices[0] && caretPosition <= mention.indices[1];
        });
        if (currentMention) {
          // find relevant name
          var coordinates = getCaretCoordinates(textarea, currentMention.indices[0]);
          ipc.send('getSuggestions', this.screenname, currentMention.screenName, coordinates.top, coordinates.left);
        } else {
          ipc.send('clearSuggestions');
        }
      },
      hideSuggestions: function () {
        ipc.send('hideSuggestions');
      },
      acceptSuggestion: function (screenname) {
        var mentions = twitterText.extractMentionsWithIndices(this.rawTweet);
        var textarea = document.getElementsByClassName('newrawtweet')[0];
        var caretPosition = textarea.selectionStart;
        var currentMention = _.find(mentions, function (mention) {
          return caretPosition >= mention.indices[0] && caretPosition <= mention.indices[1];
        });

        var before = this.rawTweet.substring(0, currentMention.indices[0]);
        var after = this.rawTweet.substring(currentMention.indices[1]) || ' ';
        this.rawTweet = before + '@' + screenname + after;
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
      var textarea = document.getElementsByClassName('newrawtweet')[0];

      window.addEventListener('beforeunload', function (event) {
        var remote = require('electron').remote;
        var currentWindow = remote.getCurrentWindow();
        ipc.send('clearSuggestions');
        if (options.saveLastTweet || !self.rawTweet) {
          currentWindow.hide();
        } else {
          var dialog = remote.dialog;
          var choice = dialog.showMessageBox(
            currentWindow,
            {
              type: 'question',
              buttons: ['Discard', 'Cancel'],
              title: 'Are you sure you want to discard this unsaved tweet?',
              message: 'Your tweet will be lost.'
            }
          );
          if (choice != 0) {
            event.returnValue = false;
          }
        }
      });

      ipc.send('getSavedTweet');

      ipc.on('saveTweet', function (event) {
        ipc.send('setSavedTweet', self.rawTweet);
      });

      ipc.on('savedTweet', function (event, savedTweet) {
        if (!self.frontFocus) {
          var prevLength = self.rawTweet.length;
          self.rawTweet = self.rawTweet + (savedTweet || '');
          var currentLength = self.rawTweet.length;

          Vue.nextTick(function () {
            textarea.selectionStart = prevLength;
            textarea.selectionEnd = currentLength;
          });
        } else {
          self.rawTweet = self.rawTweet + (savedTweet || '');
          var savedLength = (savedTweet || '').length;
          Vue.nextTick(function () {
            textarea.selectionStart = 0;
            textarea.selectionEnd = savedLength;
          });
        }
      });

      ipc.on('suggest', function (event, screenname) {
        self.acceptSuggestion(screenname);
      });

      // Handle keyboard shortcut
      ipc.on('tweet', function () {
        self.sendTweet();
      });

      ipc.on('message', function (event, message) {
        self.message = message;
        var contentEl = document.getElementById('content');
        self.$nextTick(function () {
          ipc.send('resizeComposerToHeight', contentEl.scrollHeight);
        });
      });

      textarea.focus();
      console.log(textarea.value)
      if (!this.frontFocus) {
        var len = textarea.value.length;
        textarea.selectionStart = len;
        textarea.selectionEnd = len;
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
