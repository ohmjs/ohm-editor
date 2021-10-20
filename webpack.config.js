/* eslint-env node */

'use strict';

const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');
const webpack = require('webpack');

module.exports = {
  module: {
    rules: [
      {test: /\.(?:jpg|gif|png)$/, type: 'asset/resource'},
      {test: /\.vue$/, loader: 'vue-loader'},
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader'],
      },
    ],
  },
  entry: {
    visualizer: './src/index.js',
  },
  resolve: {
    // Use the standalone version of Vue that includes the template compiler.
    alias: {vue$: 'vue/dist/vue.esm.js'}, // eslint-disable-line quote-props
    fallback: {fs: false},
  },
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: 'assets/',
    filename: '[name]-bundle.js',
  },
  plugins: [
    new webpack.DefinePlugin({
      // Ensure this processes's NODE_ENV is exposed to the built scripts.
      'process.env': {NODE_ENV: process.env.NODE_ENV},
    }),
    new VueLoaderPlugin(),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'src'),
    inline: true,
    port: 8080,
    publicPath: '/assets/',
  },
};
