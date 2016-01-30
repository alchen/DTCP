'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const webpack = require('webpack');
const RestoreDirname = require('./lib/webpack/restoredirname.webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

gulp.task('default', ['webpack', 'sass']);

gulp.task('sass', ['webpack'], function () {
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
      'static/js/about': './view/about.js',
      'static/js/viewer': './view/viewer.js',
      'entry': './main.js'
    },
    output: {
      path: __dirname + '/src/',
      publicPath: '/static/',
      filename: '[name].js',
      chunkFilename: '[id].js'
    },
    module: {
      loaders: [
        {
          test: /\.vue$/,
          loader: 'vue'
        },
        {
          test: /\.json$/,
          loader: 'json'
        }
      ],
      noParse: /node_modules\/json-schema\/lib\/validate\.js/
    },
    vue: {
      loaders: {
        sass: ExtractTextPlugin.extract('css!sass')
      }
    },
    plugins: [
      new RestoreDirname(),
      new ExtractTextPlugin('./static/css/components.scss')
    ],
    devtool: 'source-map'
  }, cb);
});

gulp.task('watch', function () {
  gulp.watch('./src/static/css/**/*.scss', ['sass']);
  gulp.watch(['./src/**/*.js', '!./src/entry.js', '!./src/static/js/**/*.js'], ['webpack']);
});
