'use strict';

var chai = require('chai');
var should = chai.should();

var _ = require('lodash');
var events = require('events');
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru();

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
var Stream = proxyquire('../../../instrumented/models/stream', {'../lib/twit': twitStub});

var config = require('../../../instrumented/config');
var Tweet = require('../../../instrumented/models/tweet');
var User = require('../../../instrumented/models/user');

var screenname = '17th';
var mentionJson = require('../../fixtures/mention.json');
var tweetsJson = require('../../fixtures/tweets.json');
var userJson = require('../../fixtures/user.json');
var followJson = require('../../fixtures/follow.json');
var unfollowJson = require('../../fixtures/unfollow.json');

describe('Stream', function () {
  describe('events', function () {
    it('should emit friend message on creation', function () {
      var stream = new Stream('access', 'secret', screenname);
      sinon.spy(stream.timeline, 'setFriends');

      streamStub.emit('friends', ['1', '2', '3']);

      stream.timeline.setFriends.called.should.equal(true);
    });

    it('should accept streamed tweet', function () {
      var stream = new Stream('access', 'secret', screenname);
      var tweet = new Tweet(mentionJson, screenname);

      sinon.spy(stream.timeline, 'addTweet');
      var subscriberStub = {send: function () {}};
      var webContentsMock = sinon.mock(subscriberStub);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newTweet', 'home', tweet);
      webContentsMock.expects('send').calledWith('newTweet', 'mentions', tweet);

      streamStub.emit('tweet', mentionJson);

      stream.timeline.addTweet.calledWith(tweet);
      webContentsMock.verify();
    });

    it('should delete tweet', function () {
      var stream = new Stream('access', 'secret', screenname);
      var tweet = new Tweet(mentionJson, screenname);

      var subscriberStub = {send: function () {}};
      var webContentsMock = sinon.mock(subscriberStub);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('deleteTweet', tweet.id);

      stream.timeline.addTweet(tweet);
      streamStub.emit('delete', {delete: {status: {id_str: tweet.id}}});

      webContentsMock.verify();
      should.not.exist(stream.timeline.findTweet(tweet.id));
    });

    it('should follow user', function () {
      var stream = new Stream('access', 'secret', screenname);
      var user = new User(userJson);
      user.isFollowing = true;

      var subscriberStub = {send: function () {}};
      var webContentsMock = sinon.mock(subscriberStub);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newProfileUser', user);

      stream.timeline.saveUser(new User(userJson));
      should.exist(stream.timeline.findUser(user.screenname));
      streamStub.emit('follow', followJson);

      webContentsMock.verify();
      stream.timeline.findUser(user.screenname).isFollowing.should.equal(true);
    });

    it('should unfollow user', function () {
      var stream = new Stream('access', 'secret', screenname);
      var user = new User(userJson);
      user.isFollowing = false;

      var subscriberStub = {send: function () {}};
      var webContentsMock = sinon.mock(subscriberStub);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newProfileUser', user);

      stream.timeline.saveUser(new User(userJson));
      should.exist(stream.timeline.findUser(user.screenname));
      streamStub.emit('unfollow', unfollowJson);

      webContentsMock.verify();
      stream.timeline.findUser(user.screenname).isFollowing.should.equal(false);
    });
  });

  describe('load more', function () {
    before(function () {
      config.sendThreshold = 5;
      config.loadThreshold = 10;
    });

    it('should load more timeline from API when empty', function () {
      var timeline = 'home';
      var stream = new Stream('access', 'secret', screenname);
      var tweets = _.map(tweetsJson.slice(15), function (tweet) { return new Tweet(tweet, screenname); });

      var getStub = sinon.stub(stream.T, 'get', function (url, options, callback) {
        callback(null, tweetsJson.slice(15), null);
      });
      sinon.spy(stream, 'saveTweetsToTimeline');
      sinon.spy(stream, 'sendTweets');
      var subscriberStub = {send: function () {}};
      var webContentsMock = sinon.mock(subscriberStub);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newTweets', timeline, tweets);

      stream.loadMore(timeline);

      getStub.calledOnce.should.equal(true);
      stream.saveTweetsToTimeline.calledOnce.should.equal(true);
      stream.sendTweets.calledOnce.should.equal(true);
      stream.saveTweetsToTimeline.calledWithExactly(timeline, tweetsJson.slice(15)).should.equal(true);
      stream.sendTweets.calledWithExactly(timeline, undefined).should.equal(true);
      stream.timeline.get(timeline).should.deep.equal(tweets);
      webContentsMock.verify();
    });

    it('should send directly if cached above send threshold', function () {
      var timeline = 'home';
      var stream = new Stream('access', 'secret', screenname);
      var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

      var getStub = sinon.stub(stream.T, 'get', function (url, options, callback) {
        callback(null, tweetsJson, null);
      });
      sinon.spy(stream, 'saveTweetsToTimeline');
      sinon.spy(stream, 'sendTweets');
      var subscriberStub = {send: function () {}};
      var webContentsMock = sinon.mock(subscriberStub);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newTweets', timeline, tweets.slice(0, config.sendThreshold));

      stream.timeline.push(timeline, tweets);
      stream.loadMore(timeline);

      getStub.called.should.equal(false);
      stream.saveTweetsToTimeline.calledOnce.should.equal(false);
      stream.sendTweets.calledOnce.should.equal(false);
      webContentsMock.verify();
    });

    it('should send immediate but also load if cached between load and send thresholds', function () {
      var timeline = 'home';
      var stream = new Stream('access', 'secret', screenname);
      var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

      var getStub = sinon.stub(stream.T, 'get', function (url, options, callback) {
        callback(null, tweetsJson.slice(5), null);
      });
      sinon.spy(stream, 'saveTweetsToTimeline');
      sinon.spy(stream, 'sendTweets');
      var subscriberStub = {send: function () {}};
      var webContentsMock = sinon.mock(subscriberStub);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newTweets', timeline, tweets.slice(0, 5));

      stream.timeline.push(timeline, tweets.slice(0, 5));
      stream.loadMore(timeline);

      getStub.called.should.equal(true);
      stream.saveTweetsToTimeline.calledOnce.should.equal(true);
      stream.sendTweets.calledOnce.should.equal(false);
      webContentsMock.verify();
      stream.timeline.get(timeline).should.deep.equal(tweets);
    });
  });

  describe('load missing', function () {
    it('should close gap and send filler', function () {
      var timeline = 'home';
      var stream = new Stream('access', 'secret', screenname);
      var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });
      var sinceFiller = tweets.slice(0, 11);
      var maxFiller = tweets.slice(10, 20);
      var target = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });
      target[0].gaps[timeline] = true;
      var gap = new Tweet(tweetsJson[10], screenname);
      gap.gaps[timeline] = true;

      var getStub = sinon.stub(stream.T, 'get', function (url, options, callback) {
        if (options.since_id) {
          callback(null, tweetsJson.slice(0, 10), null);
        } else {
          callback(null, tweetsJson.slice(10, 20), null);
        }
      });
      var subscriberStub = {send: function () {}};
      var webContentsMock = sinon.mock(subscriberStub);
      stream.subscribe(subscriberStub);
      webContentsMock.expects('send').calledWith('newSinceFiller', timeline, sinceFiller);
      // webContentsMock.expects('send').calledWith('newMaxFiller', timeline, maxFiller);
      webContentsMock.expects('send').calledWith('updateTweet', gap);

      stream.timeline.push('home', tweets.slice(10));
      stream.insertGap();
      _.each(tweets.slice(3, 5).reverse(), function (tweet) {
        stream.timeline.addTweet(tweet);
      });
      stream.loadMissing(timeline, gap.id);

      getStub.called.should.equal(true);
      webContentsMock.verify();
      stream.timeline.get(timeline).should.deep.equal(target);
    });
  });

  describe('user', function () {

  });
});
