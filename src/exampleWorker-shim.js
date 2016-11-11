/* global self */
'use strict';

// This module provides the real worker entry point when running in the browser, allowing tests
// to require exampleWorker.js directly and mock the WorkerGlobalScope.

require('./exampleWorker')(self);
