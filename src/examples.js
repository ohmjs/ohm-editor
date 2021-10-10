/* eslint-env browser */

'use strict';

const Vue = require('vue').default;
const ohmEditor = require('./ohmEditor');

const ExampleList = Vue.extend(
  require('./components/example-list.vue').default
);

const exampleList = new ExampleList({
  el: '#exampleContainer',
  propsData: {},
});

Object.assign(ohmEditor.examples, {
  addExample: exampleList.addExample,
  getExample: exampleList.getExample,
  setExample: exampleList.setExample,
  getExamples: exampleList.getExamples,
  getSelected: exampleList.getSelected,
  setSelected: exampleList.setSelected,
  saveExamples: exampleList.saveExamples,
  restoreExamples: exampleList.restoreExamples,
});
