#!/usr/bin/env node

'use strict';

const electronPath = require('electron-prebuilt');
require('child_process').spawn(electronPath, [__dirname], {
  stdio: 'inherit',
  cwd: __dirname,
});
