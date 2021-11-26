/* eslint-env node */



const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');

module.exports = {
  module: {
    rules: [
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
    clean: true,
    filename: '[name]-bundle.js',
    publicPath: '/assets/',
  },
  plugins: [new VueLoaderPlugin()],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 8080,
  },
};
