'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const webpack = require('webpack');
const RestoreDirname = require('./lib/webpack/restoredirname.webpack');

gulp.task('default', ['sass', 'webpack']);

gulp.task('sass', function () {
  gulp.src(['./src/static/css/bundle.scss', './src/static/css/composer.scss'])
      .pipe(sass().on('error', sass.logError))
      .pipe(gulp.dest('./src/static/css/'));
});

gulp.task('webpack', function (cb) {
  webpack({
    target: 'electron',
    context: __dirname + '/src',
    node: {
      __dirname: false
    },
    entry: {
      'static/js/index': './view/index.js',
      'static/js/prompt': './view/prompt.js',
      'static/js/composer': './view/composer.js',
      'entry': './main.js'
    },
    output: {
      path: __dirname + '/src/',
      publicPath: '/static/',
      filename: '[name].js',
      chunkFilename: '[id].js'
    },
    plugins: [
      new RestoreDirname()
    ],
    devtool: 'source-map'
  }, cb);
});

gulp.task('watch', function () {
  gulp.watch('./src/static/css/**/*.scss', ['sass']);
  gulp.watch(['./src/**/*.js', '!./src/entry.js', '!./src/static/js/**/*.js'], ['webpack']);
});
