'use strict';

var Server = require('./server');
var electron = require('electron');

var app = electron.app;  // Module to control application life.
var BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

app.on('ready', function() {
  var devServer = new Server();

  mainWindow = new BrowserWindow({width: 1400, height: 900});
  mainWindow.loadURL(devServer.indexURL);

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
