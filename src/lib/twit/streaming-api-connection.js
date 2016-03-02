'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var helpers = require('./helpers');
var Parser = require('./parser');
var request = require('./request');
var zlib = require('zlib');

var STATUS_CODES_TO_ABORT_ON = require('./settings').STATUS_CODES_TO_ABORT_ON;

var StreamingAPIConnection = function (reqOpts, twitOptions) {
  this.reqOpts = reqOpts;
  this.twitOptions = twitOptions;
  EventEmitter.call(this);
};

util.inherits(StreamingAPIConnection, EventEmitter);

/**
 * Resets the connection.
 * - clears request, response, parser
 * - removes scheduled reconnect handle (if one was scheduled)
 * - stops the stall abort timeout handle (if one was scheduled)
 */
StreamingAPIConnection.prototype._resetConnection = function () {
  if (this.response) {
    this.response.removeAllListeners();
    this.response.destroy();
    this.response = null;
  }

  if (this.request) {
    this.request.removeAllListeners();
    this.request.destroy();
    this.request = null;
  }

  // ensure a scheduled reconnect does not occur (if one was scheduled)
  // this can happen if we get a close event before .stop() is called
  if (this._scheduledReconnect) {
    clearTimeout(this._scheduledReconnect);
    this._scheduledReconnect = null;
  }

  // clear our stall abort timeout
  this._stopStallAbortTimeout();
};

/**
 * Resets the parameters used in determining the next reconnect time
 */
StreamingAPIConnection.prototype._resetRetryParams = function () {
  console.log('Twit: reset retry params');
  // delay for next reconnection attempt
  this._connectInterval = 0;
  // flag indicating whether we used a 0-delay reconnect
  this._usedFirstReconnect = false;
};

StreamingAPIConnection.prototype._startPersistentConnection = function () {
  console.log('Twit: start persistent connection')
  var self = this;
  if (this._scheduledReconnect) {
    clearTimeout(this._scheduledReconnect);
    this._scheduledReconnect = null;
  }
  self._resetConnection();
  self._setupParser();
  self.request = request.post(this.reqOpts);
  self.emit('connect', self.request);
  self.request.on('response', function (response) {
    console.log('Twit: stream response ' + response.statusCode);
    // reset our reconnection attempt flag so next attempt goes through with 0 delay
    // if we get a transport-level error
    self._usedFirstReconnect = false;
    // start a stall abort timeout handle
    self._resetStallAbortTimeout();
    self.response = response;

    self.response.on('error', function (err) {
      // expose response errors on twit instance
      console.log('Twit: response error');
      self.emit('error', err);
    });

    var gunzip = zlib.createGunzip();
    if (STATUS_CODES_TO_ABORT_ON.indexOf(self.response.statusCode) !== -1) {
      console.log('Twit: should abort from response');
      // We got a status code telling us we should abort the connection.
      // Read the body from the response and return an error to the user.
      var body = '';
      var compressedBody = '';

      self.response.on('data', function (chunk) {
        compressedBody += chunk.toString('utf8');
      });

      self.response.pipe(gunzip);
      gunzip.on('data', function (chunk) {
        body += chunk.toString('utf8');
      });

      gunzip.on('end', function () {
        try {
          body = JSON.parse(body);
        } catch (jsonDecodeError) {
          // Twitter may send an HTML body
          // if non-JSON text was returned, we'll just attach it to the error as-is
        }
        // surface the error to the user
        var error = helpers.makeTwitError('Bad Twitter streaming request: ' + self.response.statusCode);
        error.statusCode = response ? response.statusCode: null;
        helpers.attachBodyInfoToError(error, body);
        self.emit('error', error);
        body = null;
      });
      gunzip.on('error', function (err) {
        // If Twitter sends us back an uncompressed HTTP response, gzip will error out.
        // Handle this by emitting an error with the uncompressed response body.
        var errMsg = 'Gzip error: ' + err.message;
        var twitErr = helpers.makeTwitError(errMsg);
        twitErr.statusCode = self.response.statusCode;
        helpers.attachBodyInfoToError(twitErr, compressedBody);
        self.emit('parser_error', twitErr);
      });
    } else if (self.response.statusCode === 420) {
      console.log('Twit: code 420 rate limited');
      if (self.request) {
        self.request.destroy();
        self.request = null;
      }
      self._onClose();
    } else {
      console.log('Twit: response okay');
      // We got an OK status code - the response should be valid.
      // Read the body from the response and return to the user.
      self.response.pipe(gunzip);

      //pass all response data to parser
      gunzip.on('data', function (chunk) {
        self._connectInterval = 0;
        // stop stall timer, and start a new one
        self._resetStallAbortTimeout();
        self.parser.parse(chunk.toString('utf8'));
      });

      gunzip.on('error', function (err) {
        console.log('Twit: response gunzip error');
        self.emit('error', err);
      });

      gunzip.on('close', function () {
        console.log('Twit: gunzip close');
        self._onClose();
      });

      gunzip.on('end', function () {
        console.log('Twit: gunzip end');
      });

      // connected without an error response from Twitter, emit `connected` event
      // this must be emitted after all its event handlers are bound
      // so the reference to `self.response` is not interfered-with by the user until it is emitted
      self.emit('connected', self.response);
    }
  });
  self.request.on('close', function () {
    console.log('Twit: request close');
    self._onClose();
  });
  self.request.on('error', function (err) {
    console.log('Twit: request error');
    self.emit('error', err);
    self._onClose();
  });
  return self;
};

/**
 * Handle when the request or response closes.
 * Schedule a reconnect according to Twitter's reconnect guidelines
 *
 */
StreamingAPIConnection.prototype._onClose = function () {
  console.log('Twit: handle onClose');
  this._started = false;
  this._stopStallAbortTimeout();
  // We closed it explicitly - don't reconnect
  if (this._isExplicitClose) {
    console.log('Twit: no reschedule because explictly closed');
    return;
  }

  this._scheduleReconnect();
};

/**
 * Kick off the http request, and persist the connection
 *
 */
StreamingAPIConnection.prototype.start = function () {
  console.log('Twit: start');
  // reset close flag so we will reconnect
  this._isExplicitClose = false;

  this._resetRetryParams();
  this._startPersistentConnection();
  return this;
};

/**
 * Abort the http request, stop scheduled reconnect (if one was scheduled) and clear state
 *
 */
StreamingAPIConnection.prototype.stop = function () {
  console.log('Twit: stop');
  this._isExplicitClose = true;
  // clear connection variables and timeout handles
  this._resetConnection();
  this._resetRetryParams();
  return this;
};

/**
 * Stop and restart the stall abort timer (called when new data is received)
 *
 * If we go 90s without receiving data from twitter, we abort the request & reconnect.
 */
StreamingAPIConnection.prototype._resetStallAbortTimeout = function () {
  var self = this;
  // stop the previous stall abort timer
  self._stopStallAbortTimeout();
  // start a new 90s timeout to trigger a close & reconnect if no data received
  self._stallAbortTimeout = setTimeout(function () {
    console.log('Twit: stalled');
    self._onClose();
  }, 90000);
  return this;
};

/**
 * Stop stall timeout
 *
 */
StreamingAPIConnection.prototype._stopStallAbortTimeout = function () {
  clearTimeout(this._stallAbortTimeout);
  // mark the timer as `null` so it is clear via introspection that the timeout is not scheduled
  this._stallAbortTimeout = null;
  return this;
};

/**
 * Computes the next time a reconnect should occur (based on the last HTTP response received)
 * and starts a timeout handle to begin reconnecting after `self._connectInterval` passes.
 *
 * @return {Undefined}
 */
StreamingAPIConnection.prototype._scheduleReconnect = function () {
  console.log('Twit: rescheduling');
  var self = this;
  var initialInterval = 100;
  if (self.response && self.response.statusCode === 420) {
    // we are being rate limited
    // start with a 60s wait, double each attempt
    if (self._connectInterval <= 60000) {
      self._connectInterval = 60000;
    } else {
      self._connectInterval *= 2;
    }
  } else if (self.response && String(self.response.statusCode).charAt(0) === '5') {
    // twitter 5xx errors
    // start with a 5s wait, double each attempt up to 320s
    if (!self._connectInterval) {
      self._connectInterval = 5000;
    } else if (self._connectInterval < 320000) {
      self._connectInterval *= 2;
    } else {
      self._connectInterval = 320000;
    }
  } else {
    // we did not get an HTTP response from our last connection attempt.
    // DNS/TCP error, or a stall in the stream (and stall timer closed the connection)
    if (!self._usedFirstReconnect) {
      console.log('Twit: first reconnect, reset connect interval');
      // first reconnection attempt on a valid connection should occur immediately
      self._connectInterval = initialInterval;
      self._usedFirstReconnect = true;
    } else if (self._connectInterval < 16000) {
      // linearly increase delay by 250ms up to 16s
      self._connectInterval += 250;
    } else {
      // cap out reconnect interval at 16s
      self._connectInterval = 16000;
    }
  }

  // schedule the reconnect
  clearTimeout(this._scheduledReconnect);
  self._scheduledReconnect = setTimeout(function () {
    self._startPersistentConnection();
  }, self._connectInterval);
  self.emit('reconnect', self.request, self.response, self._connectInterval);
};

StreamingAPIConnection.prototype._setupParser = function () {
  var self = this;
  self.parser = new Parser();

  // handle twitter objects as they come in - emit the generic `message` event
  // along with the specific event corresponding to the message
  self.parser.on('element', function (msg) {
    self.emit('message', msg);

    if (msg.id_str) {
      self.emit('tweet', msg);
    } else if (msg.delete) {
      self.emit('delete', msg);
    } else if (msg.disconnect) {
      self._handleDisconnect(msg);
    } else if (msg.limit) {
      self.emit('limit', msg);
    } else if (msg.scrub_geo) {
      self.emit('scrub_geo', msg);
    } else if (msg.warning) {
      self.emit('warning', msg);
    } else if (msg.status_withheld) {
      self.emit('status_withheld', msg);
    } else if (msg.user_withheld) {
      self.emit('user_withheld', msg);
    } else if (msg.friends || msg.friends_str) {
      self.emit('friends', msg);
    } else if (msg.direct_message) {
      self.emit('direct_message', msg);
    } else if (msg.event) {
      self.emit('user_event', msg);
      // reference: https://dev.twitter.com/docs/streaming-apis/messages#User_stream_messages
      var ev = msg.event;

      if (ev === 'blocked') {
        self.emit('blocked', msg);
      } else if (ev === 'unblocked') {
        self.emit('unblocked', msg);
      } else if (ev === 'favorite') {
        self.emit('favorite', msg);
      } else if (ev === 'unfavorite') {
        self.emit('unfavorite', msg);
      } else if (ev === 'follow') {
        self.emit('follow', msg);
      } else if (ev === 'unfollow') {
        self.emit('unfollow', msg);
      } else if (ev === 'user_update') {
        self.emit('user_update', msg);
      } else if (ev === 'list_created') {
        self.emit('list_created', msg);
      } else if (ev === 'list_destroyed') {
        self.emit('list_destroyed', msg);
      } else if (ev === 'list_updated') {
        self.emit('list_updated', msg);
      } else if (ev === 'list_member_added') {
        self.emit('list_member_added', msg);
      } else if (ev === 'list_member_removed') {
        self.emit('list_member_removed', msg);
      } else if (ev === 'list_user_subscribed') {
        self.emit('list_user_subscribed', msg);
      } else if (ev === 'list_user_unsubscribed') {
        self.emit('list_user_unsubscribed', msg);
      } else if (ev === 'quoted_tweet') {
        self.emit('quoted_tweet', msg);
      } else if (ev === 'favorited_retweet') {
        self.emit('favorited_retweet', msg);
      } else if (ev === 'retweeted_retweet') {
        self.emit('retweeted_retweet', msg);
      } else {
        self.emit('unknown_user_event', msg);
      }
    }
  });

  self.parser.on('error', function (err) {
    self.emit('parser_error', err);
  });
  self.parser.on('connection_limit_exceeded', function (err) {
    self.emit('error', err);
  });
};

StreamingAPIConnection.prototype._handleDisconnect = function (twitterMsg) {
  this.stop();
  this.emit('disconnect', twitterMsg);
};

module.exports = StreamingAPIConnection;
