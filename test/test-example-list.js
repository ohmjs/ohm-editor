/* global global */
/* eslint-env jest */

'use strict';

const { mount } = require('@vue/test-utils');
const Vue = require('vue').default || require('vue');
const assert = require('assert');
const ohm = require('ohm-js');

// Dependencies w/ mocks
// ---------------------

// Returns a stub instance of CodeMirror.
global.CodeMirror = () => {
  return {
    focus() {},
    setOption() {},
    setValue(val) {},
  };
};

const ohmEditor = require('../src/ohmEditor'); // Requires CodeMirror()

let localStorageExamples;

beforeAll(() => {
  jest
    .spyOn(Storage.prototype, 'getItem')
    .mockImplementation(() => {
      return '[]';
    });
  jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation((name, value) => {
      assert.equal(name, 'examples');
      localStorageExamples = JSON.parse(value);
    })
});

afterAll(() => {
  jest.restoreAllMocks();
})

// eslint-disable-next-line max-len
const ExampleList = require('../src/components/example-list.vue').default || require('../src/components/example-list.vue');

// Helpers
// -------

async function simulateGrammarEdit(source) {
  await ohmEditor.emit('change:grammar', source);
  await Vue.nextTick();
  
  await ohmEditor.emit('parse:grammar', null, ohm.grammar(source), null);
  await flushQueue();
}

function findEl(vm, query) {
  return vm.$el.querySelector(query);
}

function getDropdownOptionValues(dropdown) {
  const options = dropdown.querySelectorAll('option');
  return Array.prototype.map.call(options, (opt) => opt.value);
}

const flushQueue = () => new Promise((cb) => setTimeout(cb, 0));

// Tests
// -----

test('adding and updating examples', () => {
  const {vm} = mount(ExampleList);

  expect(vm.getSelected()).toEqual(undefined);

  const id = vm.addExample();
  expect(vm.selectedId).toBe(id); // adding selects the new example
  expect(vm.getSelected()).toEqual({text: '', startRule: '', shouldMatch: true});

  vm.setExample(id, 'woooo', 'Start');
  expect(vm.getSelected()).toEqual({
    text: 'woooo',
    startRule: 'Start',
    shouldMatch: true,
  });

  vm.setExample(id, 'woooo', 'Start', false);
  expect(vm.getSelected()).toEqual({
    text: 'woooo',
    startRule: 'Start',
    shouldMatch: false,
  });

  const id2 = vm.addExample();
  expect(vm.selectedId).toEqual(id2);
  expect(vm.getSelected()).toEqual({text: '', startRule: '', shouldMatch: true});
});

test('deleting', async () => {
  const {vm} = mount(ExampleList);

  localStorageExamples = [];

  // First, try adding a single example then deleting it.
  const id = vm.addExample();
  vm.setExample(id, 'first');

  await Vue.nextTick();
  vm.deleteExample(id);
  expect(vm.selectedId).toEqual(null);
  expect(vm.getSelected()).toEqual(undefined);

  // Now, add two examples.
  const id1 = vm.addExample();
  let id2 = vm.addExample();

  vm.setExample(id1, "hi i'm id1");
  expect(vm.selectedId).toBe(id2); // the second example is selected

  await Vue.nextTick();
  vm.deleteExample(id2);
  expect(vm.selectedId).toBe(id1) // after deleting it, the first example is selected

  // Now add one more example, and delete the first one.
  id2 = vm.addExample();
  vm.setExample(id2, "hi i'm id2");

  await Vue.nextTick();
  vm.deleteExample(id1);
  expect(vm.selectedId).toBe(id2); // after deleting first example, second is selected

  await Vue.nextTick();
  // localStorage should hold the id2 example.
  expect(localStorageExamples).toEqual([
    {text: "hi i'm id2", startRule: '', shouldMatch: true},
  ]);
});

test('toggleShouldMatch', async () => {
  const {vm} = mount(ExampleList);

  localStorageExamples = [];

  const id = vm.addExample();
  vm.toggleShouldMatch(id);

  const example = vm.getSelected();
  expect(example.shouldMatch).toBe(false);

  await Vue.nextTick();
  expect(localStorageExamples).toEqual(
    [{text: '', startRule: '', shouldMatch: false}]);

  vm.toggleShouldMatch(id); // Toggle it back.
  expect(example.shouldMatch).toBe(true);

  await Vue.nextTick();
  expect(
    localStorageExamples).toEqual(
    [{text: '', startRule: '', shouldMatch: true}]);
});

test('pass/fail status', async () => {
  const {vm} = mount(ExampleList);

  const id = vm.addExample();
  vm.setExample(id, 'abcdefg');
  await Vue.nextTick();

  // status is undefined without a grammar
  expect(vm.exampleStatus[id]).toBeUndefined();

  await simulateGrammarEdit('G { start = letter+ }');
  expect(vm.exampleStatus[id].className).toBe('pass');

  vm.exampleValues[id].shouldMatch = false;
  await Vue.nextTick();
  expect(vm.exampleStatus[id].className).toBe('fail');

  await simulateGrammarEdit('G { start = digit+ }');
  expect(vm.exampleStatus[id].className).toBe('pass');

  const id2 = vm.addExample();
  vm.setExample(id2, '123');
  await Vue.nextTick();
  expect(vm.exampleStatus[id2].className).toBe('pass');

  ohmEditor.emit('change:grammar', '');

  await Vue.nextTick();
  for (const k of Object.keys(vm.exampleStatus)) {
    expect(vm.exampleStatus[k]).toBeUndefined();
  }
});

test('start rule text', async () => {
  const {vm} = mount(ExampleList);

  const id = vm.addExample();

  await simulateGrammarEdit('G { start = letter }');
  expect(findEl(vm, '.startRule').textContent).toBe('');

  vm.setExample(id, '', 'noSuchRule');
  await Vue.nextTick();
  expect(findEl(vm, '.startRule').textContent).toBe('noSuchRule');

  vm.setExample(id, '', 'start');
  await Vue.nextTick();
  expect(findEl(vm, '.startRule').textContent).toBe('start');
});

test('start rule dropdown', async () => {
  const {vm} = mount(ExampleList);

  const id = vm.addExample();
  expect(vm.selectedId).toBe(id);

  await Vue.nextTick();
  let dropdown = findEl(vm, '#startRuleDropdown');
  expect(dropdown.value).toBe('');
  expect(getDropdownOptionValues(dropdown)).toEqual(['']);

  await simulateGrammarEdit('G { start = letter }');
  dropdown = findEl(vm, '#startRuleDropdown');
  expect(dropdown.value).toBe('');
  expect(getDropdownOptionValues(dropdown)).toEqual(['', 'start']);

  // TODO: Test that changes to the dropdown are reflected in the example value.
  // Not sure how to do that programatically, as `dropdown.value = ''` doesn't work.
});

test('start rule errors', async () => {
  const {vm} = mount(ExampleList);

  const id = vm.addExample();
  vm.setExample(id, '', 'nein');

  simulateGrammarEdit('G {}');
  await flushQueue();
  expect(findEl(vm, '.toolbar .errorIcon').title).toBe('Rule nein is not declared in grammar G');

  simulateGrammarEdit('G { nein = }');
  await flushQueue();
  expect(findEl(vm, '.toolbar .errorIcon')).toBeFalsy(); // error disappears when rule exists

  vm.setExample(id, '', 'nope');
  await flushQueue();
  expect(findEl(vm, '.toolbar .errorIcon').title).toBe('Rule nope is not declared in grammar G');

  vm.setExample(id, '', '');
  await flushQueue();
  // error disappears when example uses default start rule
  expect(findEl(vm, '.toolbar .errorIcon')).toBeFalsy();
});

test('example editing', async () => {
  const {vm} = mount(ExampleList);

  vm.addExample();
  simulateGrammarEdit('G { start = letter* }');
  await flushQueue();
  const li = findEl(vm, 'li');
  expect(li.classList.contains('pass')).toBeTruthy();

  ohmEditor.emit('change:inputEditor', 'asdf');
  await flushQueue();
  expect(vm.getSelected().text).toBe(''); // example is not updated after 'change:inputEditor'

  // after editing, example is not passing or failing
  expect(li.classList.contains('pass') || li.classList.contains('fail')).toBeFalsy();

  ohmEditor.emit('change:input', 'asdf');
  await flushQueue();
  expect(vm.getSelected().text).toBe('asdf'); // example is updated after 'change:input' event
  expect(li.classList.contains('pass')).toBeTruthy(); // test is shown as passing again
});

test('thumbs up button', async () => {
  const {vm} = mount(ExampleList);

  const id = vm.addExample();
  simulateGrammarEdit('G { start = any }');
  await flushQueue();
  expect(vm.exampleStatus[id].className).toBe('fail'); // initially fails

  findEl(vm, '.thumbsUpButton').click(); // Fake a button click.
  await flushQueue();
  expect(vm.exampleStatus[id].className).toBe('pass'); // passes after toggling
});

test('editor - thumbs up button', async () => {
  const {vm} = mount(ExampleList);

  const id = vm.addExample();
  simulateGrammarEdit('G { start = any }');
  await flushQueue();
  expect(vm.exampleStatus[id].className).toBe('fail'); // initially fails

  findEl(vm, '#exampleEditor .thumbsUpButton').click(); // Fake a button click.
  await flushQueue();
  expect(vm.exampleStatus[id].className).toBe('pass'); // passes after toggling
});
