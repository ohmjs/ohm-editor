'use strict';

var path = require('path');

module.exports = {
  entry: {
    visualizer: './src/index.js'
  },
  output: {
    path: 'dist',
    publicPath: 'assets',
    filename: '[name]-bundle.js'
  },
  devServer: {
    contentBase: path.join(__dirname, 'src'),
    inline: true
  }
};
