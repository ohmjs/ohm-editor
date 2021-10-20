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
const exp = require('constants');

// Helpers
// -------

function simulateGrammarEdit(source, cb) {
  ohmEditor.emit('change:grammar', source);
  Vue.nextTick(() => {
    ohmEditor.emit('parse:grammar', null, ohm.grammar(source), null);
    Vue.nextTick(cb);
  });
}

function findEl(vm, query) {
  return vm.$el.querySelector(query);
}

function getDropdownOptionValues(dropdown) {
  const options = dropdown.querySelectorAll('option');
  return Array.prototype.map.call(options, (opt) => opt.value);
}

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

// test('pass/fail status', () => {
//   const {vm} = mount(ExampleList);

//   const id = vm.addExample();
//   vm.setExample(id, 'abcdefg');

//   Vue.nextTick(() => {
//     t.equal(
//       vm.exampleStatus[id],
//       undefined,
//       'status is undefined without a grammar'
//     );

//     simulateGrammarEdit('G { start = letter+ }', () => {
//       expect(vm.exampleStatus[id].className).toEqual('pass');
//       vm.exampleValues[id].shouldMatch = false;

//       Vue.nextTick(() => {
//         t.equal(
//           vm.exampleStatus[id].className,
//           'fail',
//           'fails now that shouldMatch is false'
//         );

//         simulateGrammarEdit('G { start = digit+ }', () => {
//           t.equal(
//             vm.exampleStatus[id].className,
//             'pass',
//             'passes when example fails matching'
//           );

//           const id2 = vm.addExample();
//           vm.setExample(id2, '123');
//           Vue.nextTick(() => {
//             expect(vm.exampleStatus[id2].className).toEqual('pass');

//             ohmEditor.emit('change:grammar', '');
//             Vue.nextTick(() => {
//               for (const k of Object.keys(vm.exampleStatus)) {
//                 expect(vm.exampleStatus[k]).toEqual(undefined);
//               }
//             });
//           });
//         });
//       });
//     });
//   });
// });

// test('start rule text', () => {
//   const {vm} = mount(ExampleList);

//   const id = vm.addExample();

//   simulateGrammarEdit('G { start = letter }', () => {
//     expect(findEl(vm, '.startRule').textContent).toEqual('');

//     vm.setExample(id, '', 'noSuchRule');
//     Vue.nextTick(() => {
//       expect(findEl(vm, '.startRule').textContent).toEqual('noSuchRule');
//       vm.setExample(id, '', 'start');

//       Vue.nextTick(() => {
//         expect(findEl(vm, '.startRule').textContent).toEqual('start');
//       });
//     });
//   });
// });

// test('start rule dropdown', () => {
//   const {vm} = mount(ExampleList);

//   const id = vm.addExample();
//   expect(vm.selectedId).toEqual(id);

//   Vue.nextTick(() => {
//     let dropdown = findEl(vm, '#startRuleDropdown');
//     expect(dropdown.value).toEqual('');
//     t.deepEqual(getDropdownOptionValues(dropdown), ['']);

//     simulateGrammarEdit('G { start = letter }', () => {
//       Vue.nextTick(() => {
//         dropdown = findEl(vm, '#startRuleDropdown');
//         expect(dropdown.value).toEqual('');
//         t.deepEqual(getDropdownOptionValues(dropdown), ['', 'start']);

//         // TODO: Test that changes to the dropdown are reflected in the example value.
//         // Not sure how to do that programatically, as `dropdown.value = ''` doesn't work.
//       });
//     });
//   });
// });

// test('start rule errors', () => {
//   const {vm} = mount(ExampleList);

//   const id = vm.addExample();
//   vm.setExample(id, '', 'nein');

//   simulateGrammarEdit('G {}', () => {
//     t.equal(
//       findEl(vm, '.toolbar .errorIcon').title,
//       'Rule nein is not declared in grammar G'
//     );

//     simulateGrammarEdit('G { nein = }', () => {
//       t.notOk(
//         findEl(vm, '.toolbar .errorIcon'),
//         'error disappears when rule exists'
//       );

//       vm.setExample(id, '', 'nope');
//       Vue.nextTick(() => {
//         t.equal(
//           findEl(vm, '.toolbar .errorIcon').title,
//           'Rule nope is not declared in grammar G'
//         );

//         vm.setExample(id, '', '');
//         Vue.nextTick(() => {
//           t.notOk(
//             findEl(vm, '.toolbar .errorIcon'),
//             'error disappears when example uses default start rule'
//           );
//         });
//       });
//     });
//   });
// });

// test('example editing', () => {
//   const {vm} = mount(ExampleList);

//   vm.addExample();
//   simulateGrammarEdit('G { start = letter* }', () => {
//     const li = findEl(vm, 'li');
//     t.ok(li.classList.contains('pass'));

//     ohmEditor.emit('change:inputEditor', 'asdf');
//     Vue.nextTick(() => {
//       t.equal(
//         vm.getSelected().text,
//         '',
//         "example is not updated after 'change:inputEditor'"
//       );
//       t.notOk(
//         li.classList.contains('pass') || li.classList.contains('fail'),
//         'after editing, example is not passing or failing'
//       );

//       ohmEditor.emit('change:input', 'asdf');
//       Vue.nextTick(() => {
//         t.equal(
//           vm.getSelected().text,
//           'asdf',
//           "example is updated after 'change:input' event"
//         );
//         t.ok(li.classList.contains('pass'), 'test is shown as passing again');
//       });
//     });
//   });
// });

// test('thumbs up button', () => {
//   const {vm} = mount(ExampleList);

//   const id = vm.addExample();
//   simulateGrammarEdit('G { start = any }', () => {
//     expect(vm.exampleStatus[id].className, 'fail').toEqual('initially fails');

//     findEl(vm, '.thumbsUpButton').click(); // Fake a button click.
//     Vue.nextTick(() => {
//       expect(vm.exampleStatus[id].className, 'pass').toEqual(
//         'passes after toggling'
//       );
//     });
//   });
// });

// test('editor - thumbs up button', () => {
//   const {vm} = mount(ExampleList);

//   const id = vm.addExample();
//   simulateGrammarEdit('G { start = any }', () => {
//     expect(vm.exampleStatus[id].className, 'fail').toEqual('initially fails');
//     findEl(vm, '#exampleEditor .thumbsUpButton').click(); // Fake a button click.

//     Vue.nextTick(() => {
//       expect(vm.exampleStatus[id].className, 'pass').toEqual(
//         'passes after toggling'
//       );
//     });
//   });
// });
