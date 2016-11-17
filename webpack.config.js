'use strict';

var path = require('path');

module.exports = {
  entry: {
    visualizer: './src/index.js'
  },
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: 'assets/',
    filename: '[name]-bundle.js'
  },
  devServer: {
    contentBase: path.join(__dirname, 'src'),
    inline: true,
    port: 8080,
    publicPath: '/assets/'
  }
};
