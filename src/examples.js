/* eslint-env browser */

'use strict';

var Vue = require('vue');
var ohmEditor = require('./ohmEditor');

var ExampleList = Vue.extend(require('./components/example-list.vue'));

var exampleList = new ExampleList({  // eslint-disable-line no-unused-vars
  el: '#exampleContainer',
  propsData: {}
});

Object.assign(ohmEditor.examples, {
  addExample: exampleList.addExample,
  getExample: exampleList.getExample,
  setExample: exampleList.setExample,
  getExamples: exampleList.getExamples,
  getSelected: exampleList.getSelected,
  setSelected: exampleList.setSelected,
  saveExamples: exampleList.saveExamples,
  restoreExamples: exampleList.restoreExamples
});
