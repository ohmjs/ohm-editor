// Because the tests need to be run through Webpack, we use this file as a single
// entry point for all the tests, so any tests to be run must be require()'d here.

'use strict';

require('../src/utils');  // For Object.assign polyfill

require('./test-TraceElementWalker');
require('./test-ellipsis-dropdown');
require('./test-example-list');
