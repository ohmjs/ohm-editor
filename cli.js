#!/usr/bin/env node

'use strict';

var electronPath = require('electron-prebuilt');
require('child_process').spawn(electronPath, [__dirname], {stdio: 'inherit', cwd: __dirname});
