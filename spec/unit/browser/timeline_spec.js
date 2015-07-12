'use strict';

var chai = require('chai');
chai.should();
var _ = require('lodash');

var Timeline = require('../../../instrumented/models/timeline');
var Tweet = require('../../../instrumented/models/tweet');

var screenname = '17th';
var tweetJson = require('../../fixtures/tweet.json');
var mentionJson = require('../../fixtures/mention.json');
var tweetsJson = require('../../fixtures/tweets.json');

describe('Timeline', function () {
  it('should add new tweet to storage', function () {
    var timeline = new Timeline(screenname);
    var tweet = new Tweet(tweetJson, screenname);

    timeline.addTweet(tweet);
    var home = timeline.get('home');
    var mentions = timeline.get('mentions');

    home.should.have.length(1);
    mentions.should.have.length(0);

    home[0].should.deep.equal(timeline.findTweet('618129888646725632'));
    home[0].user.should.deep.equal(timeline.findUser('baerkani'));
  });

  it('should record mentions', function () {
    var timeline = new Timeline(screenname);
    var tweet = new Tweet(mentionJson, screenname);

    timeline.addTweet(tweet);
    var home = timeline.get('home');
    var mentions = timeline.get('mentions');

    home.should.have.length(1);
    mentions.should.have.length(1);
  });

  it('should update existing tweet', function () {
    var timeline = new Timeline(screenname);
    var tweet = new Tweet(tweetJson, screenname);
    var newTweet = new Tweet(tweetJson, screenname);
    newTweet.isRetweeted = true;

    var home = timeline.get('home');
    var mentions = timeline.get('mentions');

    timeline.addTweet(tweet);

    home.should.have.length(1);
    mentions.should.have.length(0);
    home[0].isRetweeted.should.equal(false);

    timeline.addTweet(newTweet);

    home.should.have.length(1);
    mentions.should.have.length(0);
    home[0].isRetweeted.should.equal(true);
  });

  it('should merge retweetedBy\'s', function () {
    var timeline = new Timeline(screenname);

    var tweet = new Tweet(tweetJson, screenname);
    tweet.retweetedBy = [{
      name: '17th'
    }];

    var copy = new Tweet(tweetJson, screenname);
    copy.retweetedBy = [{
      name: 'uinoka'
    }];

    timeline.addTweet(tweet);
    timeline.addTweet(copy);

    var merged = timeline.findTweet(tweet.id);
    merged.retweetedBy.should.have.length(2);
  });

  it('should update user', function () {
    var timeline = new Timeline(screenname);
    var tweet = new Tweet(tweetJson, screenname);

    timeline.addTweet(tweet);
    var user = timeline.findUser('baerkani');
    user.name.should.equal('kani 49/100');

    var newTweet = new Tweet(tweetJson, screenname);
    newTweet.user.name = 'kani 50/100';

    timeline.addTweet(newTweet);
    user.name.should.equal('kani 50/100');
  });

  it('should delete tweet', function () {
    var timeline = new Timeline(screenname);
    var tweet = new Tweet(mentionJson, screenname);

    timeline.addTweet(tweet);
    timeline.deleteTweet(tweet.id);

    var home = timeline.get('home');
    var mentions = timeline.get('mentions');

    home.should.have.length(0);
    mentions.should.have.length(0);
  });

  it('should push multiple tweets to timeline', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.push('home', tweets);
    var home = timeline.get('home');
    home.should.have.length(20);
  });

  it('should retrieve with maxId (exclusive)', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.push('home', tweets);
    var homeWithMax = timeline.get('home', '618300165028352000');
    homeWithMax.should.have.length(1);
  });

  it('should retrieve with sinceId (inclusive)', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.push('home', tweets);
    var homeSince = timeline.get('home', null, '618304459177746432');
    homeSince.should.have.length(2);
  });

  it('should not return anything for unknown id', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.push('home', tweets);
    var empty = timeline.get('home', null, '0');
    empty.should.have.length(0);
  });

  it('should save multiple tweets', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.saveTweets(tweets);

    var home = timeline.get('home');
    var mentions = timeline.get('mentions');

    home.should.have.length(0);
    mentions.should.have.length(0);
  });

  it('should find pretext for tweet', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.saveTweets(tweets);
    var tweet = timeline.findTweet('618304042377195520');
    var pretext = timeline.findPretext(tweet);

    pretext.should.have.length(1);
  });

  it('should find replies for tweet', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.saveTweets(tweets);
    var tweet = timeline.findTweet('618303066446655488');
    var replies = timeline.findReplies(tweet);

    replies.should.have.length(3);
  });

  it('should add a mark for gap betweet tweets', function () {
    var timeline = new Timeline(screenname);
    var tweet = new Tweet(mentionJson, screenname);

    timeline.addTweet(tweet);
    timeline.insertGap();

    var home = timeline.get('home');
    var mentions = timeline.get('mentions');

    home.should.have.length(1);
    home[0].gaps.home.should.equal(true);
    home[0].gaps.mentions.should.equal(true);

    mentions.should.have.length(1);
    mentions[0].gaps.home.should.equal(true);
    mentions[0].gaps.mentions.should.equal(true);
  });

  it('should close gaps', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.push('home', tweets.slice(10, 15));
    timeline.get('home').should.have.length(5);

    var gaps = timeline.insertGap();
    gaps.should.have.length(1);

    timeline.push('home', tweets.slice(15));
    timeline.get('home').should.have.length(10);

    _.each(tweets.slice(3, 5).reverse(), function (tweet) {
      timeline.addTweet(tweet);
    });

    timeline.insertGap();
    timeline.get('home').should.have.length(12);
    timeline.addTweet(tweets[0]);
    timeline.get('home')[1].gaps.home.should.equal(true);
    timeline.get('home')[3].gaps.home.should.equal(true);

    timeline.closeGap('home', gaps[0].id, tweets.slice(0, 10));

    var finalHome = timeline.get('home');
    finalHome.should.have.length(20);
    finalHome.should.deep.equal(tweets);
  });

  it('should leave a gap when filler might be incomplete', function () {
    var timeline = new Timeline(screenname);
    var tweets = _.map(tweetsJson, function (tweet) { return new Tweet(tweet, screenname); });

    timeline.push('home', tweets.slice(10));
    timeline.get('home').should.have.length(10);

    var gaps = timeline.insertGap();
    gaps.should.have.length(1);

    _.each(tweets.slice(3, 5).reverse(), function (tweet) {
      timeline.addTweet(tweet);
    });
    timeline.get('home').should.have.length(12);
    timeline.get('home')[2].gaps.home.should.equal(true);

    timeline.closeGap('home', gaps[0].id, tweets.slice(0, 10));

    var finalHome = timeline.get('home');
    finalHome.should.have.length(20);
    finalHome[0].gaps.home.should.equal(true);
    finalHome.slice(1).should.deep.equal(tweets.slice(1));
  });
});
