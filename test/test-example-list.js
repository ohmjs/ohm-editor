'use strict';

var Vue = require('vue');
var assert = require('assert');
var ohm = require('ohm-js');
var test = require('tape');

// Dependencies w/ mocks
// ---------------------

// Returns a stub instance of CodeMirror.
global.CodeMirror = function() {
  return {
    focus: function() {},
    setOption: function() {},
    setValue: function(val) {}
  };
};

var ohmEditor = require('../src/ohmEditor');  // Requires CodeMirror()

var localStorageExamples;

var exampleListInjector = require('!!vue?inject!../src/components/example-list.vue');
var ExampleList = Vue.extend(exampleListInjector({
  'global/window': {
    localStorage: {
      getItem: function() {
        return '[]';
      },
      setItem: function(name, value) {
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
  Vue.nextTick(function() {
    ohmEditor.emit('parse:grammar', null, ohm.grammar(source), null);
    Vue.nextTick(cb);
  });
}

function findEl(vm, query) {
  return vm.$el.querySelector(query);
}

function getDropdownOptionValues(dropdown) {
  var options = dropdown.querySelectorAll('option');
  return Array.prototype.map.call(options, function(opt) { return opt.value; });
}

// Tests
// -----

test('adding and updating examples', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  t.equal(vm.getSelected(), undefined);

  var id = vm.addExample();
  t.equal(vm.selectedId, id, 'adding selects the new example');
  t.deepEqual(vm.getSelected(), {text: '', startRule: '', shouldMatch: true});

  vm.setExample(id, 'woooo', 'Start');
  t.deepEqual(vm.getSelected(), {text: 'woooo', startRule: 'Start', shouldMatch: true});

  vm.setExample(id, 'woooo', 'Start', false);
  t.deepEqual(vm.getSelected(), {text: 'woooo', startRule: 'Start', shouldMatch: false});

  var id2 = vm.addExample();
  t.equal(vm.selectedId, id2);
  t.deepEqual(vm.getSelected(), {text: '', startRule: '', shouldMatch: true});

  t.end();
});

test('deleting', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  localStorageExamples = [];

  // First, try adding a single example then deleting it.
  var id = vm.addExample();
  vm.setExample(id, 'first');

  Vue.nextTick(function() {
    vm.deleteExample(id);
    t.equal(vm.selectedId, null);
    t.equal(vm.getSelected(), undefined);

    // Now, add two examples.
    var id1 = vm.addExample();
    var id2 = vm.addExample();

    vm.setExample(id1, "hi i'm id1");
    t.equal(vm.selectedId, id2, 'the second example is selected');

    Vue.nextTick(function() {
      vm.deleteExample(id2);
      t.equal(vm.selectedId, id1, 'after deleting it, the first example is selected');

      // Now add one more example, and delete the first one.
      id2 = vm.addExample();
      vm.setExample(id2, "hi i'm id2");
      Vue.nextTick(function() {
        vm.deleteExample(id1);
        t.equal(vm.selectedId, id2, 'after deleting first example, second is selected');

        Vue.nextTick(function() {
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

test('toggleShouldMatch', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  localStorageExamples = [];

  var id = vm.addExample();
  vm.toggleShouldMatch(id);

  var example = vm.getSelected();
  t.equal(example.shouldMatch, false);

  Vue.nextTick(function() {
    t.deepEqual(
        localStorageExamples,
        [{text: '', startRule: '', shouldMatch: false}],
        'new value is saved to localStorage');

    vm.toggleShouldMatch(id);  // Toggle it back.
    t.equal(example.shouldMatch, true);

    Vue.nextTick(function() {
      t.deepEqual(
          localStorageExamples,
          [{text: '', startRule: '', shouldMatch: true}],
          'new value is saved to localStorage');

      t.end();
    });
  });
});

test('pass/fail status', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  var id = vm.addExample();
  vm.setExample(id, 'abcdefg');

  Vue.nextTick(function() {
    t.equal(vm.exampleStatus[id], undefined, 'status is undefined without a grammar');

    simulateGrammarEdit('G { start = letter+ }', function() {
      t.equal(vm.exampleStatus[id].className, 'pass');
      vm.exampleValues[id].shouldMatch = false;

      Vue.nextTick(function() {
        t.equal(vm.exampleStatus[id].className, 'fail', 'fails now that shouldMatch is false');

        simulateGrammarEdit('G { start = digit+ }', function() {
          t.equal(vm.exampleStatus[id].className, 'pass', 'passes when example fails matching');

          var id2 = vm.addExample();
          vm.setExample(id2, '123');
          Vue.nextTick(function() {
            t.equal(vm.exampleStatus[id2].className, 'pass');

            ohmEditor.emit('change:grammar', '');
            Vue.nextTick(function() {
              for (var k in vm.exampleStatus) {
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

test('start rule text', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  var id = vm.addExample();

  simulateGrammarEdit('G { start = letter }', function() {
    t.equal(findEl(vm, '.startRule').textContent, '');

    vm.setExample(id, '', 'noSuchRule');
    Vue.nextTick(function() {
      t.equal(findEl(vm, '.startRule').textContent, 'noSuchRule');
      vm.setExample(id, '', 'start');

      Vue.nextTick(function() {
        t.equal(findEl(vm, '.startRule').textContent, 'start');

        t.end();
      });
    });
  });
});

test('start rule dropdown', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  var id = vm.addExample();
  t.equal(vm.selectedId, id);

  Vue.nextTick(function() {
    var dropdown = findEl(vm, '#startRuleDropdown');
    t.equal(dropdown.value, '');
    t.deepEqual(getDropdownOptionValues(dropdown), ['']);

    simulateGrammarEdit('G { start = letter }', function() {
      Vue.nextTick(function() {
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

test('start rule errors', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  var id = vm.addExample();
  vm.setExample(id, '', 'nein');

  simulateGrammarEdit('G {}', function() {
    t.equal(findEl(vm, '.toolbar .errorIcon').title, 'Rule nein is not declared in grammar G');

    simulateGrammarEdit('G { nein = }', function() {
      t.notOk(findEl(vm, '.toolbar .errorIcon'), 'error disappears when rule exists');

      vm.setExample(id, '', 'nope');
      Vue.nextTick(function() {
        t.equal(findEl(vm, '.toolbar .errorIcon').title, 'Rule nope is not declared in grammar G');

        vm.setExample(id, '', '');
        Vue.nextTick(function() {
          t.notOk(findEl(vm, '.toolbar .errorIcon'),
              'error disappears when example uses default start rule');
          t.end();
        });
      });
    });

  });
});

test('example editing', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  vm.addExample();
  simulateGrammarEdit('G { start = letter* }', function() {
    var li = findEl(vm, 'li');
    t.ok(li.classList.contains('pass'));

    ohmEditor.emit('change:inputEditor', 'asdf');
    Vue.nextTick(function() {
      t.equal(vm.getSelected().text, '', "example is not updated after 'change:inputEditor'");
      t.notOk(
          li.classList.contains('pass') || li.classList.contains('fail'),
          'after editing, example is not passing or failing');

      ohmEditor.emit('change:input', 'asdf');
      Vue.nextTick(function() {
        t.equal(vm.getSelected().text, 'asdf', "example is updated after 'change:input' event");
        t.ok(li.classList.contains('pass'), 'test is shown as passing again');

        t.end();
      });
    });
  });
});

test('thumbs up button', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  var id = vm.addExample();
  simulateGrammarEdit('G { start = any }', function() {
    t.equal(vm.exampleStatus[id].className, 'fail', 'initially fails');

    findEl(vm, '.thumbsUpButton').click();  // Fake a button click.
    Vue.nextTick(function() {
      t.equal(vm.exampleStatus[id].className, 'pass', 'passes after toggling');

      t.end();
    });
  });
});

test('editor - thumbs up button', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  var id = vm.addExample();
  simulateGrammarEdit('G { start = any }', function() {
    t.equal(vm.exampleStatus[id].className, 'fail', 'initially fails');
    findEl(vm, '#exampleEditor .thumbsUpButton').click();  // Fake a button click.

    Vue.nextTick(function() {
      t.equal(vm.exampleStatus[id].className, 'pass', 'passes after toggling');
      t.end();
    });
  });
});
