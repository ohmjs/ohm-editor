/* global process */
'use strict';

var electron = require('electron');
var path = require('path');
var webpack = require('webpack');
var webpackDevServer = require('webpack-dev-server');

var app = electron.app;  // Module to control application life.
var BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

var webpackConfig = require('./webpack.config');
var devServerPort = webpackConfig.devServer.port;

// This is done automagically by webpack-dev-server when the '--inline' option is used, but
// we have to do it manually here. 🙈
// See https://webpack.github.io/docs/webpack-dev-server.html#inline-mode-with-node-js-api
webpackConfig.entry.visualizer.unshift(
    'webpack-dev-server/client?http://localhost:' + devServerPort + '/');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

function startWebpackDevServer() {
  var server = new webpackDevServer(webpack(webpackConfig), webpackConfig.devServer);
  server.listen(devServerPort);
  return server;
}

app.on('ready', function() {
  var devServer = startWebpackDevServer();

  mainWindow = new BrowserWindow({width: 1400, height: 900});
  mainWindow.loadURL('http://localhost:' + devServerPort + '/webpack-dev-server/');

  // mainWindow.openDevTools();

  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    devServer.close();
  });

  mainWindow.webContents.on('did-finish-load', function() {
    mainWindow.setTitle('Ohm Editor');
  });
});
