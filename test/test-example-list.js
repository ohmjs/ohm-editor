/* global global */
/* eslint-env jest */

'use strict';

const {mount} = require('@vue/test-utils');
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
ohmEditor.examples.getSelected;

let localStorageExamples;

beforeAll(() => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    return '[]';
  });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((name, value) => {
    assert.equal(name, 'examples');
    localStorageExamples = JSON.parse(value);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

let wrapper;

beforeEach(() => {
  wrapper = mount(ExampleList);
  ohmEditor.examples.getSelected = wrapper.vm.getSelected;
  simulateGrammarEdit('');
});

afterEach(() => {
  ohmEditor.examples.getSelected = null;
});

const ExampleList =
  require('../src/components/example-list.vue').default ||
  require('../src/components/example-list.vue');

// Helpers
// -------

async function simulateGrammarEdit(source) {
  await ohmEditor.emit('change:grammars', source);
  await Vue.nextTick();

  await ohmEditor.emit('parse:grammars', null, ohm.grammars(source), null);
  await flushQueue();
}

const findEl = (vm, query) => vm.$el.querySelector(query);

const getDropdownOptionValues = (dropdownWrapper) =>
  Array.from(dropdownWrapper.element.querySelectorAll('option')).map(
    (opt) => opt.value
  );

const flushQueue = () => new Promise((cb) => setTimeout(cb, 0));

// Tests
// -----

test('adding and updating examples', async () => {
  const {vm} = wrapper;
  expect(vm.getSelected()).toEqual(undefined);

  const id = vm.addExample();
  expect(vm.selectedId).toBe(id); // adding selects the new example
  expect(vm.getSelected()).toEqual({
    text: '',
    selectedGrammar: '',
    startRule: '',
    shouldMatch: true,
  });

  vm.setExample(id, 'woooo', '', 'Start');
  expect(vm.getSelected()).toEqual({
    text: 'woooo',
    selectedGrammar: '',
    startRule: 'Start',
    shouldMatch: true,
  });

  vm.setExample(id, 'woooo', '', 'Start', false);
  expect(vm.getSelected()).toEqual({
    text: 'woooo',
    selectedGrammar: '',
    startRule: 'Start',
    shouldMatch: false,
  });

  const id2 = vm.addExample();
  expect(vm.selectedId).toEqual(id2);
  expect(vm.getSelected()).toEqual({
    text: '',
    selectedGrammar: '',
    startRule: '',
    shouldMatch: true,
  });

  await simulateGrammarEdit('BestGrammar { start = }');
  const id3 = vm.addExample();
  expect(vm.selectedId).toEqual(id3);

  // Once there is a grammar, it will be used as the selectedGrammar for a
  // newly-added example.
  expect(vm.getSelected()).toEqual({
    text: '',
    selectedGrammar: 'BestGrammar',
    startRule: '',
    shouldMatch: true,
  });
});

test('deleting', async () => {
  const {vm} = wrapper;
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
  expect(vm.selectedId).toBe(id1); // after deleting it, the first example is selected

  // Now add one more example, and delete the first one.
  id2 = vm.addExample();
  vm.setExample(id2, "hi i'm id2");

  await Vue.nextTick();
  vm.deleteExample(id1);
  expect(vm.selectedId).toBe(id2); // after deleting first example, second is selected

  await Vue.nextTick();
  // localStorage should hold the id2 example.
  expect(localStorageExamples).toEqual([
    {text: "hi i'm id2", selectedGrammar: '', startRule: '', shouldMatch: true},
  ]);
});

test('toggleShouldMatch', async () => {
  const {vm} = wrapper;
  localStorageExamples = [];

  const id = vm.addExample();
  vm.toggleShouldMatch(id);

  const example = vm.getSelected();
  expect(example.shouldMatch).toBe(false);

  await Vue.nextTick();
  expect(localStorageExamples).toEqual([
    {text: '', selectedGrammar: '', startRule: '', shouldMatch: false},
  ]);

  vm.toggleShouldMatch(id); // Toggle it back.
  expect(example.shouldMatch).toBe(true);

  await Vue.nextTick();
  expect(localStorageExamples).toEqual([
    {text: '', selectedGrammar: '', startRule: '', shouldMatch: true},
  ]);
});

test('pass/fail status', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  vm.setExample(id, 'abcdefg');
  await Vue.nextTick();

  // status is undefined without a grammar
  expect(vm.exampleStatus[id].className).toBe('fail');
  expect(vm.exampleStatus[id].err).toEqual({message: 'No grammar defined'});

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

  ohmEditor.emit('change:grammars', '');

  await Vue.nextTick();
  for (const k of Object.keys(vm.exampleStatus)) {
    expect(vm.exampleStatus[k]).toBeUndefined();
  }
});

test('start rule text', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();

  await simulateGrammarEdit('G { start = letter }');
  expect(findEl(vm, '.startRule').textContent).toBe('');

  vm.setExample(id, '', '', 'noSuchRule');
  await Vue.nextTick();
  expect(findEl(vm, '.startRule').textContent).toBe('noSuchRule');

  vm.setExample(id, '', 'MyGrammar', 'start');
  await Vue.nextTick();
  expect(findEl(vm, '.startRule').textContent).toBe('MyGrammar ▸ start');

  await simulateGrammarEdit('');
  expect(findEl(vm, '.startRule').textContent).toBe('MyGrammar ▸ start');
});

test('start rule dropdown', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  expect(vm.selectedId).toBe(id);

  await Vue.nextTick();

  // Note: we need to call `find` again each time the dropdown gets re-rendered.
  let dropdown = wrapper.find('#startRuleDropdown');
  expect(dropdown.element.value).toBe('.');
  expect(getDropdownOptionValues(dropdown)).toEqual(['.']);

  await simulateGrammarEdit('G { start = letter }');
  dropdown = wrapper.find('#startRuleDropdown');
  expect(getDropdownOptionValues(dropdown)).toEqual(['.', 'G.', 'G.start']);
  expect(dropdown.element.value).toBe('.');
  expect(vm.getSelected().selectedGrammar).toBe('');

  // Ensure the example is updated a new value is selected in the dropdown.
  wrapper.find('#startRuleDropdown').setValue('G.');
  const {selectedGrammar, startRule} = vm.getSelected();
  expect(selectedGrammar).toBe('G');
  expect(startRule).toBe('');

  // Removing the grammar G doesn't affect the selected option.
  await simulateGrammarEdit('G2 { start = letter }');
  dropdown = wrapper.find('#startRuleDropdown');
  expect(vm.getSelected().selectedGrammar).toBe('G');
  expect(dropdown.element.value).toBe('G.');

  // ...but the unselected options should be updated.
  expect(getDropdownOptionValues(dropdown)).toEqual(['G.', 'G2.', 'G2.start']);
});

test('start rule errors', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  vm.setExample(id, '', '', 'nein');

  simulateGrammarEdit('G {}');
  await flushQueue();
  expect(findEl(vm, '.toolbar .errorIcon').title).toBe(
    'Rule nein is not declared in grammar G'
  );

  simulateGrammarEdit('G { nein = }');
  await flushQueue();
  expect(findEl(vm, '.toolbar .errorIcon')).toBeFalsy(); // error disappears when rule exists

  vm.setExample(id, '', '', 'nope');
  await flushQueue();
  expect(findEl(vm, '.toolbar .errorIcon').title).toBe(
    'Rule nope is not declared in grammar G'
  );

  vm.setExample(id, '', '', '');
  await flushQueue();
  // error disappears when example uses default start rule
  expect(findEl(vm, '.toolbar .errorIcon')).toBeFalsy();

  // Try setting a grammar that does not exist.
  vm.setExample(id, '', 'NoSuchGrammar');
  await flushQueue();
  expect(wrapper.find('.toolbar .errorIcon').element.title).toBe(
    "Unknown grammar 'NoSuchGrammar'"
  );
});

test('example editing', async () => {
  const {vm} = wrapper;
  vm.addExample();
  simulateGrammarEdit('G { start = letter* }');
  await flushQueue();
  const li = findEl(vm, 'li');
  expect(li.classList.contains('pass')).toBeTruthy();

  ohmEditor.emit('change:inputEditor', 'asdf');
  await flushQueue();
  expect(vm.getSelected().text).toBe(''); // example is not updated after 'change:inputEditor'

  // after editing, example is not passing or failing
  expect(
    li.classList.contains('pass') || li.classList.contains('fail')
  ).toBeFalsy();

  ohmEditor.emit('change:input', 'asdf');
  await flushQueue();
  expect(vm.getSelected().text).toBe('asdf'); // example is updated after 'change:input' event
  expect(li.classList.contains('pass')).toBeTruthy(); // test is shown as passing again
});

test('thumbs up button', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  simulateGrammarEdit('G { start = any }');
  await flushQueue();
  expect(vm.exampleStatus[id].className).toBe('fail'); // initially fails

  findEl(vm, '.thumbsUpButton').click(); // Fake a button click.
  await flushQueue();
  expect(vm.exampleStatus[id].className).toBe('pass'); // passes after toggling
});

test('editor - thumbs up button', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  simulateGrammarEdit('G { start = any }');
  await flushQueue();
  expect(vm.exampleStatus[id].className).toBe('fail'); // initially fails

  findEl(vm, '#exampleEditor .thumbsUpButton').click(); // Fake a button click.
  await flushQueue();
  expect(vm.exampleStatus[id].className).toBe('pass'); // passes after toggling
});
