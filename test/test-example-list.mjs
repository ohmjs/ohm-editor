/* eslint-env node */

import 'global-jsdom/register';
import './codeMirrorStub.js';

import testUtils from '@vue/test-utils';
import * as ohm from 'ohm-js';
import {test} from 'uvu';
import * as assert from 'uvu/assert';
import Vue from 'vue/dist/vue.common.js';

import ExampleList from '../src/components/example-list.js';
import ohmEditor from '../src/ohmEditor.js';

let localStorageExamples;

test.before(async () => {
  global.localStorage = {
    getItem() {
      return '[]';
    },
    setItem(name, value) {
      assert.is(name, 'examples');
      localStorageExamples = JSON.parse(value);
    },
  };
});

let wrapper;

test.before.each(() => {
  wrapper = testUtils.mount(ExampleList);
  ohmEditor.examples.getSelected = wrapper.vm.getSelected;
  simulateGrammarEdit('');
});

test.after.each(() => {
  ohmEditor.examples.getSelected = null;
});

// Helpers
// -------

async function simulateGrammarEdit(source) {
  await ohmEditor.emit('change:grammars', source);
  await Vue.nextTick();

  await ohmEditor.emit('parse:grammars', null, ohm.grammars(source), [], null);
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
  assert.is(vm.getSelected(), undefined);

  const id = vm.addExample();
  assert.is(vm.selectedId, id); // adding selects the new example
  assert.equal(vm.getSelected(), {
    text: '',
    selectedGrammar: '',
    startRule: '',
    shouldMatch: true,
  });

  vm.setExample(id, 'woooo', '', 'Start');
  assert.equal(vm.getSelected(), {
    text: 'woooo',
    selectedGrammar: '',
    startRule: 'Start',
    shouldMatch: true,
  });

  vm.setExample(id, 'woooo', '', 'Start', false);
  assert.equal(vm.getSelected(), {
    text: 'woooo',
    selectedGrammar: '',
    startRule: 'Start',
    shouldMatch: false,
  });

  const id2 = vm.addExample();
  assert.equal(vm.selectedId, id2);
  assert.equal(vm.getSelected(), {
    text: '',
    selectedGrammar: '',
    startRule: '',
    shouldMatch: true,
  });

  await simulateGrammarEdit('BestGrammar { start = }');
  const id3 = vm.addExample();
  assert.equal(vm.selectedId, id3);

  // Once there is a grammar, it will be used as the selectedGrammar for a
  // newly-added example.
  assert.equal(vm.getSelected(), {
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
  assert.equal(vm.selectedId, null);
  assert.equal(vm.getSelected(), undefined);

  // Now, add two examples.
  const id1 = vm.addExample();
  let id2 = vm.addExample();

  vm.setExample(id1, "hi i'm id1");
  assert.is(vm.selectedId, id2); // the second example is selected

  await Vue.nextTick();
  vm.deleteExample(id2);
  assert.is(vm.selectedId, id1); // after deleting it, the first example is selected

  // Now add one more example, and delete the first one.
  id2 = vm.addExample();
  vm.setExample(id2, "hi i'm id2");

  await Vue.nextTick();
  vm.deleteExample(id1);
  assert.is(vm.selectedId, id2); // after deleting first example, second is selected

  await Vue.nextTick();
  // localStorage should hold the id2 example.
  assert.equal(localStorageExamples, [
    {text: "hi i'm id2", selectedGrammar: '', startRule: '', shouldMatch: true},
  ]);
});

test('toggleShouldMatch', async () => {
  const {vm} = wrapper;
  localStorageExamples = [];

  const id = vm.addExample();
  vm.toggleShouldMatch(id);

  const example = vm.getSelected();
  assert.is(example.shouldMatch, false);

  await Vue.nextTick();
  assert.equal(localStorageExamples, [
    {text: '', selectedGrammar: '', startRule: '', shouldMatch: false},
  ]);

  vm.toggleShouldMatch(id); // Toggle it back.
  assert.is(example.shouldMatch, true);

  await Vue.nextTick();
  assert.equal(localStorageExamples, [
    {text: '', selectedGrammar: '', startRule: '', shouldMatch: true},
  ]);
});

test('pass/fail status', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  vm.setExample(id, 'abcdefg');
  await Vue.nextTick();

  // status is undefined without a grammar
  assert.is(vm.exampleStatus[id].className, 'fail');
  assert.equal(vm.exampleStatus[id].err, {message: 'No grammar defined'});

  await simulateGrammarEdit('G { start = letter+ }');
  assert.is(vm.exampleStatus[id].className, 'pass');

  vm.exampleValues[id].shouldMatch = false;
  await Vue.nextTick();
  assert.is(vm.exampleStatus[id].className, 'fail');

  await simulateGrammarEdit('G { start = digit+ }');
  assert.is(vm.exampleStatus[id].className, 'pass');

  const id2 = vm.addExample();
  vm.setExample(id2, '123');
  await Vue.nextTick();
  assert.is(vm.exampleStatus[id2].className, 'pass');

  ohmEditor.emit('change:grammars', '');

  await Vue.nextTick();
  for (const k of Object.keys(vm.exampleStatus)) {
    assert.is(vm.exampleStatus[k], undefined);
  }
});

test('start rule text', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();

  await simulateGrammarEdit('G { start = letter }');
  assert.is(findEl(vm, '.startRule').textContent, 'G ▸ (default)');

  vm.setExample(id, '', '', 'noSuchRule');
  await Vue.nextTick();
  assert.is(findEl(vm, '.startRule').textContent, 'noSuchRule');

  vm.setExample(id, '', 'MyGrammar', 'start');
  await Vue.nextTick();
  assert.is(findEl(vm, '.startRule').textContent, 'MyGrammar ▸ start');

  await simulateGrammarEdit('');
  assert.is(findEl(vm, '.startRule').textContent, 'MyGrammar ▸ start');
});

test('start rule dropdown', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  assert.is(vm.selectedId, id);

  await Vue.nextTick();

  // Note: we need to call `find` again each time the dropdown gets re-rendered.
  let dropdown = wrapper.find('#startRuleDropdown');
  assert.is(dropdown.element.value, '.');
  assert.equal(getDropdownOptionValues(dropdown), ['.']);

  await simulateGrammarEdit('G { start = letter }');
  dropdown = wrapper.find('#startRuleDropdown');
  assert.equal(getDropdownOptionValues(dropdown), ['.', 'G.', 'G.start']);
  assert.is(dropdown.element.value, '.');
  assert.is(vm.getSelected().selectedGrammar, '');

  // Ensure the example is updated a new value is selected in the dropdown.
  wrapper.find('#startRuleDropdown').setValue('G.');
  const {selectedGrammar, startRule} = vm.getSelected();
  assert.is(selectedGrammar, 'G');
  assert.is(startRule, '');

  // Removing the grammar G doesn't affect the selected option.
  await simulateGrammarEdit('G2 { start = letter }');
  dropdown = wrapper.find('#startRuleDropdown');
  assert.is(vm.getSelected().selectedGrammar, 'G');
  assert.is(dropdown.element.value, 'G.');

  // ...but the unselected options should be updated.
  assert.equal(getDropdownOptionValues(dropdown), ['G.', 'G2.', 'G2.start']);
});

test('start rule errors', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  vm.setExample(id, '', '', 'nein');

  simulateGrammarEdit('G {}');
  await flushQueue();
  assert.is(
    findEl(vm, '.toolbar .errorIcon').title,
    'Rule nein is not declared in grammar G'
  );

  simulateGrammarEdit('G { nein = }');
  await flushQueue();
  assert.not(findEl(vm, '.toolbar .errorIcon')); // error disappears when rule exists

  vm.setExample(id, '', '', 'nope');
  await flushQueue();
  assert.is(
    findEl(vm, '.toolbar .errorIcon').title,
    'Rule nope is not declared in grammar G'
  );

  vm.setExample(id, '', '', '');
  await flushQueue();
  // error disappears when example uses default start rule
  assert.not(findEl(vm, '.toolbar .errorIcon'));

  // Try setting a grammar that does not exist.
  vm.setExample(id, '', 'NoSuchGrammar');
  await flushQueue();
  assert.is(
    wrapper.find('.toolbar .errorIcon').element.title,
    "Unknown grammar 'NoSuchGrammar'"
  );
});

test('example editing', async () => {
  const {vm} = wrapper;
  vm.addExample();
  simulateGrammarEdit('G { start = letter* }');
  await flushQueue();
  const li = findEl(vm, 'li');
  assert.ok(li.classList.contains('pass'));

  ohmEditor.emit('change:inputEditor', 'asdf');
  await flushQueue();
  assert.is(vm.getSelected().text, ''); // example is not updated after 'change:inputEditor'

  // after editing, example is not passing or failing
  assert.not(li.classList.contains('pass') || li.classList.contains('fail'));

  ohmEditor.emit('change:input', 'asdf');
  await flushQueue();
  assert.is(vm.getSelected().text, 'asdf'); // example is updated after 'change:input' event
  assert.ok(li.classList.contains('pass')); // test is shown as passing again
});

test('thumbs up button', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  simulateGrammarEdit('G { start = any }');
  await flushQueue();
  assert.is(vm.exampleStatus[id].className, 'fail'); // initially fails

  findEl(vm, '.thumbsUpButton').click(); // Fake a button click.
  await flushQueue();
  assert.is(vm.exampleStatus[id].className, 'pass'); // passes after toggling
});

test('editor - thumbs up button', async () => {
  const {vm} = wrapper;
  const id = vm.addExample();
  simulateGrammarEdit('G { start = any }');
  await flushQueue();
  assert.is(vm.exampleStatus[id].className, 'fail'); // initially fails

  findEl(vm, '#exampleEditor .thumbsUpButton').click(); // Fake a button click.
  await flushQueue();
  assert.is(vm.exampleStatus[id].className, 'pass'); // passes after toggling
});

test.run();
