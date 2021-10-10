'use strict';

const open = require('open');
const path = require('path');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

const webpackConfig = require('./webpack.config');
webpackConfig.devServer.port = webpackConfig.devServer.port || 8080; // Use 8080 as the default.

const OHM_BUNDLE_PATH = path.join(__dirname, 'node_modules/ohm-js/dist/ohm.min.js');

function clone(obj) {
  return Object.assign({}, obj);
}

function createModifiedWebpackConfig() {
  // Copy the root config and the object referenced by its 'entry' property.
  const config = Object.assign(clone(webpackConfig), {entry: clone(webpackConfig.entry)});

  if (config.devServer.inline) {
    // This is done automagically by the webpack-dev-server CLI when the '--inline' option is
    // used, but we have to do it manually here. 🙈
    // See https://webpack.github.io/docs/webpack-dev-server.html#inline-mode-with-node-js-api
    const clientEntry = 'webpack-dev-server/client?http://localhost:' + config.devServer.port + '/';
    config.entry.visualizer = [clientEntry].concat(config.entry.visualizer);
  }

  return config;
}

function Server() {
  const config = createModifiedWebpackConfig();
  const compiler = webpack(config);
  const server = new WebpackDevServer(compiler, config.devServer);

  this._webpackDevServer = server;
  this.indexURL = 'http://localhost:' + config.devServer.port + '/webpack-dev-server/';

  server.app.get('/assets/ohm.min.js', function(req, res) {
    res.sendFile(OHM_BUNDLE_PATH);
  });

  server.listen(config.devServer.port); // TODO: Maybe use portfinder here?
}

Server.prototype.close = function() {
  this._webpackDevServer.close();
};

if (require.main === module) {
  const server = new Server();
  open(server.indexURL);
}

module.exports = Server;
