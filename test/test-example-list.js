'use strict';

const Vue = require('vue').default;
const assert = require('assert');
const ohm = require('ohm-js');
const test = require('tape');

// Dependencies w/ mocks
// ---------------------

// Returns a stub instance of CodeMirror.
global.CodeMirror = () => {
  return {
    focus() {},
    setOption() {},
    setValue(val) {}
  };
};

const ohmEditor = require('../src/ohmEditor');  // Requires CodeMirror()

let localStorageExamples;

const exampleListInjector = require('!!vue?inject!../src/components/example-list.vue').default;
const ExampleList = Vue.extend(exampleListInjector({
  'global/window': {
    localStorage: {
      getItem() {
        return '[]';
      },
      setItem(name, value) {
        assert.equal(name, 'examples');
        localStorageExamples = JSON.parse(value);
      }
    }
  }
}));

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
  return Array.prototype.map.call(options, opt => opt.value);
}

// Tests
// -----

test('adding and updating examples', t => {
  const vm = new ExampleList();
  vm.$mount();

  t.equal(vm.getSelected(), undefined);

  const id = vm.addExample();
  t.equal(vm.selectedId, id, 'adding selects the new example');
  t.deepEqual(vm.getSelected(), {text: '', startRule: '', shouldMatch: true});

  vm.setExample(id, 'woooo', 'Start');
  t.deepEqual(vm.getSelected(), {text: 'woooo', startRule: 'Start', shouldMatch: true});

  vm.setExample(id, 'woooo', 'Start', false);
  t.deepEqual(vm.getSelected(), {text: 'woooo', startRule: 'Start', shouldMatch: false});

  const id2 = vm.addExample();
  t.equal(vm.selectedId, id2);
  t.deepEqual(vm.getSelected(), {text: '', startRule: '', shouldMatch: true});

  t.end();
});

test('deleting', t => {
  const vm = new ExampleList();
  vm.$mount();

  localStorageExamples = [];

  // First, try adding a single example then deleting it.
  const id = vm.addExample();
  vm.setExample(id, 'first');

  Vue.nextTick(() => {
    vm.deleteExample(id);
    t.equal(vm.selectedId, null);
    t.equal(vm.getSelected(), undefined);

    // Now, add two examples.
    const id1 = vm.addExample();
    let id2 = vm.addExample();

    vm.setExample(id1, "hi i'm id1");
    t.equal(vm.selectedId, id2, 'the second example is selected');

    Vue.nextTick(() => {
      vm.deleteExample(id2);
      t.equal(vm.selectedId, id1, 'after deleting it, the first example is selected');

      // Now add one more example, and delete the first one.
      id2 = vm.addExample();
      vm.setExample(id2, "hi i'm id2");
      Vue.nextTick(() => {
        vm.deleteExample(id1);
        t.equal(vm.selectedId, id2, 'after deleting first example, second is selected');

        Vue.nextTick(() => {
          // localStorage should hold the id2 example.
          t.deepEqual(
              localStorageExamples,
              [{text: "hi i'm id2", startRule: '', shouldMatch: true}]);

          t.end();
        });
      });
    });
  });
});

test('toggleShouldMatch', t => {
  const vm = new ExampleList();
  vm.$mount();

  localStorageExamples = [];

  const id = vm.addExample();
  vm.toggleShouldMatch(id);

  const example = vm.getSelected();
  t.equal(example.shouldMatch, false);

  Vue.nextTick(() => {
    t.deepEqual(
        localStorageExamples,
        [{text: '', startRule: '', shouldMatch: false}],
        'new value is saved to localStorage');

    vm.toggleShouldMatch(id);  // Toggle it back.
    t.equal(example.shouldMatch, true);

    Vue.nextTick(() => {
      t.deepEqual(
          localStorageExamples,
          [{text: '', startRule: '', shouldMatch: true}],
          'new value is saved to localStorage');

      t.end();
    });
  });
});

test('pass/fail status', t => {
  const vm = new ExampleList();
  vm.$mount();

  const id = vm.addExample();
  vm.setExample(id, 'abcdefg');

  Vue.nextTick(() => {
    t.equal(vm.exampleStatus[id], undefined, 'status is undefined without a grammar');

    simulateGrammarEdit('G { start = letter+ }', () => {
      t.equal(vm.exampleStatus[id].className, 'pass');
      vm.exampleValues[id].shouldMatch = false;

      Vue.nextTick(() => {
        t.equal(vm.exampleStatus[id].className, 'fail', 'fails now that shouldMatch is false');

        simulateGrammarEdit('G { start = digit+ }', () => {
          t.equal(vm.exampleStatus[id].className, 'pass', 'passes when example fails matching');

          const id2 = vm.addExample();
          vm.setExample(id2, '123');
          Vue.nextTick(() => {
            t.equal(vm.exampleStatus[id2].className, 'pass');

            ohmEditor.emit('change:grammar', '');
            Vue.nextTick(() => {
              for (const k in vm.exampleStatus) {
                t.equal(vm.exampleStatus[k], undefined);
              }
              t.end();
            });
          });
        });
      });
    });
  });
});

test('start rule text', t => {
  const vm = new ExampleList();
  vm.$mount();

  const id = vm.addExample();

  simulateGrammarEdit('G { start = letter }', () => {
    t.equal(findEl(vm, '.startRule').textContent, '');

    vm.setExample(id, '', 'noSuchRule');
    Vue.nextTick(() => {
      t.equal(findEl(vm, '.startRule').textContent, 'noSuchRule');
      vm.setExample(id, '', 'start');

      Vue.nextTick(() => {
        t.equal(findEl(vm, '.startRule').textContent, 'start');

        t.end();
      });
    });
  });
});

test('start rule dropdown', t => {
  const vm = new ExampleList();
  vm.$mount();

  const id = vm.addExample();
  t.equal(vm.selectedId, id);

  Vue.nextTick(() => {
    let dropdown = findEl(vm, '#startRuleDropdown');
    t.equal(dropdown.value, '');
    t.deepEqual(getDropdownOptionValues(dropdown), ['']);

    simulateGrammarEdit('G { start = letter }', () => {
      Vue.nextTick(() => {
        dropdown = findEl(vm, '#startRuleDropdown');
        t.equal(dropdown.value, '');
        t.deepEqual(getDropdownOptionValues(dropdown), ['', 'start']);

        // TODO: Test that changes to the dropdown are reflected in the example value.
        // Not sure how to do that programatically, as `dropdown.value = ''` doesn't work.

        t.end();
      });
    });
  });
});

test('start rule errors', t => {
  const vm = new ExampleList();
  vm.$mount();

  const id = vm.addExample();
  vm.setExample(id, '', 'nein');

  simulateGrammarEdit('G {}', () => {
    t.equal(findEl(vm, '.toolbar .errorIcon').title, 'Rule nein is not declared in grammar G');

    simulateGrammarEdit('G { nein = }', () => {
      t.notOk(findEl(vm, '.toolbar .errorIcon'), 'error disappears when rule exists');

      vm.setExample(id, '', 'nope');
      Vue.nextTick(() => {
        t.equal(findEl(vm, '.toolbar .errorIcon').title, 'Rule nope is not declared in grammar G');

        vm.setExample(id, '', '');
        Vue.nextTick(() => {
          t.notOk(findEl(vm, '.toolbar .errorIcon'),
              'error disappears when example uses default start rule');
          t.end();
        });
      });
    });

  });
});

test('example editing', t => {
  const vm = new ExampleList();
  vm.$mount();

  vm.addExample();
  simulateGrammarEdit('G { start = letter* }', () => {
    const li = findEl(vm, 'li');
    t.ok(li.classList.contains('pass'));

    ohmEditor.emit('change:inputEditor', 'asdf');
    Vue.nextTick(() => {
      t.equal(vm.getSelected().text, '', "example is not updated after 'change:inputEditor'");
      t.notOk(
          li.classList.contains('pass') || li.classList.contains('fail'),
          'after editing, example is not passing or failing');

      ohmEditor.emit('change:input', 'asdf');
      Vue.nextTick(() => {
        t.equal(vm.getSelected().text, 'asdf', "example is updated after 'change:input' event");
        t.ok(li.classList.contains('pass'), 'test is shown as passing again');

        t.end();
      });
    });
  });
});

test('thumbs up button', t => {
  const vm = new ExampleList();
  vm.$mount();

  const id = vm.addExample();
  simulateGrammarEdit('G { start = any }', () => {
    t.equal(vm.exampleStatus[id].className, 'fail', 'initially fails');

    findEl(vm, '.thumbsUpButton').click();  // Fake a button click.
    Vue.nextTick(() => {
      t.equal(vm.exampleStatus[id].className, 'pass', 'passes after toggling');

      t.end();
    });
  });
});

test('editor - thumbs up button', t => {
  const vm = new ExampleList();
  vm.$mount();

  const id = vm.addExample();
  simulateGrammarEdit('G { start = any }', () => {
    t.equal(vm.exampleStatus[id].className, 'fail', 'initially fails');
    findEl(vm, '#exampleEditor .thumbsUpButton').click();  // Fake a button click.

    Vue.nextTick(() => {
      t.equal(vm.exampleStatus[id].className, 'pass', 'passes after toggling');
      t.end();
    });
  });
});
