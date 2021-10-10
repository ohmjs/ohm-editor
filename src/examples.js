/* eslint-env browser */

'use strict';

var Vue = require('vue').default;
var ohmEditor = require('./ohmEditor');

var ExampleList = Vue.extend(require('./components/example-list.vue').default);

var exampleList = new ExampleList({
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
