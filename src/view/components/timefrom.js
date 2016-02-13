'use strict';

module.exports = function (previous, current) {
  var elapsed = current - previous;

  var secondsPerMinute = 60;
  var secondsPerHour = secondsPerMinute * 60;
  var secondsPerDay = secondsPerHour * 24;
  var secondsPerYear = secondsPerDay * 365;

  if (elapsed <= 5) {
    return 'now';
  } else if (elapsed < secondsPerMinute) {
    return elapsed + 's';
  } else if (elapsed < secondsPerHour) {
    return Math.round(elapsed / secondsPerMinute) + 'm';
  } else if (elapsed < secondsPerDay ) {
    return Math.round(elapsed / secondsPerHour ) + 'h';
  } else if (elapsed < secondsPerYear) {
    return Math.round(elapsed / secondsPerDay) + 'd';
  } else {
    return Math.round(elapsed / secondsPerYear) + 'y';
  }
};
