'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const webpack = require('webpack');
const RestoreDirname = require('./webpack/restoredirname.webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

gulp.task('default', ['webpack', 'sass']);

gulp.task('sass', ['webpack'], function () {
  gulp.src([
    './src/assets/css/bundle.scss',
    './src/assets/css/composer.scss',
    './src/assets/css/viewer.scss',
    './src/assets/css/preferences.scss',
    './src/assets/css/suggestions.scss'
  ])
      .pipe(sass().on('error', sass.logError))
      .pipe(gulp.dest('./src/assets/css/'));
});

gulp.task('webpack', function (cb) {
  webpack({
    target: 'electron',
    context: __dirname + '/src',
    node: {
      __dirname: false
    },
    entry: {
      'index': './view/index.js',
      'prompt': './view/prompt.js',
      'composer': './view/composer.js',
      'about': './view/about.js',
      'viewer': './view/viewer.js',
      'suggestions': './view/suggestions.js',
      'preferences': './view/preferences.js',
      'entry': './main.js'
    },
    output: {
      path: __dirname + '/src/assets/js',
      publicPath: './js/',
      filename: '[name].js',
      chunkFilename: '[id].js'
    },
    module: {
      loaders: [
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
        {
          test: /\.json$/,
          loader: 'json-loader'
        }
      ],
      noParse: /node_modules\/json-schema\/lib\/validate\.js/
    },
    vue: {
      loaders: {
        sass: ExtractTextPlugin.extract('css-loader!sass-loader')
      }
    },
    plugins: [
      new RestoreDirname(),
      new ExtractTextPlugin('../css/components.scss')
    ],
    devtool: 'source-map',
    externals: { spellchecker: "commonjs spellchecker" }
  }, cb);
});

gulp.task('watch', function () {
  gulp.watch('./src/static/css/**/*.scss', ['sass']);
  gulp.watch(['./src/**/*.js', '!./src/entry.js', '!./src/static/js/**/*.js'], ['webpack']);
});
