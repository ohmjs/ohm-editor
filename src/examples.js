/* eslint-env browser */

'use strict';

var Vue = require('vue');

var ExampleList = Vue.extend(require('./components/example-list.vue'));

var exampleList = new ExampleList({  // eslint-disable-line no-unused-vars
  el: '#exampleContainer',
  propsData: {}
});

require('./exampleGenerationLinks');
require('./exampleGenerationRequests');
