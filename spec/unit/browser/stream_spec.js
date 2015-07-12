'use strict';

var chai = require('chai');
var should = chai.should();

var _ = require('lodash');
var events = require('events');
var sinon = require('sinon');
var proxyquire = require('proxyquire');

var streamStub = new events.EventEmitter();
var twitStub = function () {
  return {
    stream: function () {
      this.emitter = streamStub;
      return this.emitter;
    },
    get: function () {}
  };
};
var Stream = proxyquire('../../../instrumented/stream', { '../lib/twit': twitStub });

var config = require('../../../instrumented/config');
var Tweet = require('../../../instrumented/models/tweet');

var screenname = '17th';
var mentionJson = require('../../fixtures/mention.json');
var tweetsJson = require('../../fixtures/tweets.json');

describe('Stream', function () {
  describe('events', function () {
    it('should emit friend message on creation', function () {
      var stream = new Stream('', '', screenname);
      sinon.spy(stream.timeline, 'setFriends');

      streamStub.emit('friends', ['1', '2', '3']);

      stream.timeline.setFriends.called.should.equal(true);
    });

    it('should accept streamed tweet', function () {
      var stream = new Stream('', '', screenname);
      var tweet = new Tweet(mentionJson, screenname);

      sinon.spy(stream.timeline, 'addTweet');
      var subscriberStub = { webContents: { send: function () {} } };
      var webContentsMock = sinon.mock(subscriberStub.webContents);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newTweet', 'home', tweet);
      webContentsMock.expects('send').calledWith('newTweet', 'mentions', tweet);

      streamStub.emit('tweet', mentionJson);

      stream.timeline.addTweet.calledWith(tweet);
      webContentsMock.verify();
    });

    it('should delete tweet', function () {
      var stream = new Stream('', '', screenname);
      var tweet = new Tweet(mentionJson, screenname);

      var subscriberStub = { webContents: { send: function () {} } };
      var webContentsMock = sinon.mock(subscriberStub.webContents);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('deleteTweet', tweet.id);

      stream.timeline.addTweet(tweet);
      streamStub.emit('delete', { delete: { status: { id_str: tweet.id } } });

      webContentsMock.verify();
      should.not.exist(stream.timeline.findTweet(tweet.id));
    });
  });

  describe('load more', function () {
    before(function () {
      config.sendThreshold = 5;
      config.loadThreshold = 10;
    });

    it('should load more timeline from API when empty', function () {
      var timeline = 'home';
      var stream = new Stream('', '', screenname);
      var tweets = _.map(tweetsJson.slice(15), function (tweet) { return new Tweet(tweet, screenname); });

      var getStub = sinon.stub(stream.T, 'get', function (url, options, callback) {
        callback(null, tweetsJson.slice(15), null);
      });
      sinon.spy(stream, 'saveTweets');
      sinon.spy(stream, 'sendTweets');
      var subscriberStub = { webContents: { send: function () {} } };
      var webContentsMock = sinon.mock(subscriberStub.webContents);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newTweets', timeline, tweets);

      stream.loadMore(timeline);

      getStub.calledOnce.should.equal(true);
      stream.saveTweets.calledOnce.should.equal(true);
      stream.sendTweets.calledOnce.should.equal(true);
      stream.saveTweets.calledWithExactly(timeline, tweetsJson.slice(15)).should.equal(true);
      stream.sendTweets.calledWithExactly(timeline, undefined).should.equal(true);
      stream.timeline.get(timeline).should.deep.equal(tweets);
      webContentsMock.verify();
    });

    it('should send directly if cached above send threshold', function () {
      var timeline = 'home';
      var stream = new Stream('', '', screenname);
      var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

      var getStub = sinon.stub(stream.T, 'get', function (url, options, callback) {
        callback(null, tweetsJson, null);
      });
      sinon.spy(stream, 'saveTweets');
      sinon.spy(stream, 'sendTweets');
      var subscriberStub = { webContents: { send: function () {} } };
      var webContentsMock = sinon.mock(subscriberStub.webContents);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newTweets', timeline, tweets.slice(0, config.sendThreshold));

      stream.timeline.push(timeline, tweets);
      stream.loadMore(timeline);

      getStub.called.should.equal(false);
      stream.saveTweets.calledOnce.should.equal(false);
      stream.sendTweets.calledOnce.should.equal(false);
      webContentsMock.verify();
    });

    it('should send immediate but also load if cached between load and send thresholds', function () {
      var timeline = 'home';
      var stream = new Stream('', '', screenname);
      var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

      var getStub = sinon.stub(stream.T, 'get', function (url, options, callback) {
        callback(null, tweetsJson.slice(5), null);
      });
      sinon.spy(stream, 'saveTweets');
      sinon.spy(stream, 'sendTweets');
      var subscriberStub = { webContents: { send: function () {} } };
      var webContentsMock = sinon.mock(subscriberStub.webContents);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newTweets', timeline, tweets.slice(0, 5));

      stream.timeline.push(timeline, tweets.slice(0, 5));
      stream.loadMore(timeline);

      getStub.called.should.equal(true);
      stream.saveTweets.calledOnce.should.equal(true);
      stream.sendTweets.calledOnce.should.equal(false);
      webContentsMock.verify();
      stream.timeline.get(timeline).should.deep.equal(tweets);
    });
  });

  describe('load since', function () {
    it('should close gap and send filler', function () {
      var timeline = 'home';
      var stream = new Stream('', '', screenname);
      var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });
      var filler = tweets.slice(0, 11);
      var target = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });
      target[0].gaps[timeline] = true;
      var gap = new Tweet(tweetsJson[10], screenname);
      gap.gaps[timeline] = true;

      var getStub = sinon.stub(stream.T, 'get', function (url, options, callback) {
        callback(null, tweetsJson.slice(0, 10), null);
      });
      var subscriberStub = { webContents: { send: function () {} } };
      var webContentsMock = sinon.mock(subscriberStub.webContents);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newFiller', timeline, filler);
      webContentsMock.expects('send').calledWith('updateTweet', gap);

      stream.timeline.push('home', tweets.slice(10));
      stream.insertGap();
      _.each(tweets.slice(3, 5).reverse(), function (tweet) {
        stream.timeline.addTweet(tweet);
      });
      stream.loadSince(timeline, gap.id);

      getStub.called.should.equal(true);
      webContentsMock.verify();
      stream.timeline.get(timeline).should.deep.equal(target);
    });
  });
});
