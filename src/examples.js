/* eslint-env browser */

import Vue from 'vue/dist/vue.esm.mjs';

import ExampleListBase from './components/example-list.js';
import ohmEditor from './ohmEditor.js';

const ExampleList = Vue.extend(ExampleListBase);

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
