'use strict';

var webpackConfig = require('./webpack.config');

// Remove 'entry' because the tests don't have the same entry point.
delete webpackConfig.entry;

module.exports = function(config) {
  config.set({
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-phantomjs-launcher'),
      require('karma-tap'),
      require('karma-webpack')
    ],
    basePath: '',
    frameworks: ['tap'],
    files: ['test/index.js'],
    preprocessors: {
      'test/index.js': ['webpack']
    },
    webpack: webpackConfig,
    webpackMiddleware: {noInfo: true},  // Avoid annoying logging messages.

    reporters: ['dots'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['Chrome']
  });
};
