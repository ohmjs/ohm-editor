'use strict';

var path = require('path');
var webpack = require('webpack');

/* eslint-disable quote-props */

module.exports = {
  module: {
    loaders: [
      {test: /\.vue$/, loader: 'vue'},
      {test: /\.(?:jpg|gif|png)$/, loader: 'file'}
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
  plugins: [
    new webpack.DefinePlugin({
      // Ensure this processes's NODE_ENV is exposed to the built scripts.
      'process.env': {NODE_ENV: process.env.NODE_ENV}
    })
  ],
  node: {
    fs: 'empty'
  },
  devServer: {
    contentBase: path.join(__dirname, 'src'),
    inline: true,
    port: 8080,
    publicPath: '/assets/'
  },
  vue: {
    esModule: false
  },
  'file-loader': {
    useRelativePath: true
  }
};
