'use strict';

var path = require('path');

module.exports = {
  module: {
    loaders: [
      {test: /\.vue$/, loader: 'vue'}
    ]
  },
  entry: {
    visualizer: './src/index.js'
  },
  resolve: {
    // Use the standalone version of Vue that includes the template compiler.
    alias: {'vue$': 'vue/dist/vue.common.js'}  // eslint-disable-line quote-props
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
