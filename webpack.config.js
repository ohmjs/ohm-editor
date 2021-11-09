/* eslint-env node */

'use strict';

const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');

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
    publicPath: '/assets/',
    filename: '[name]-bundle.js',
  },
  plugins: [new VueLoaderPlugin()],
  devServer: {
    static: {
      directory: path.join(__dirname, 'src'),
    },
    port: 8080,
  },
};
