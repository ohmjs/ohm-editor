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

// Tests
// -----

test('adding and updating examples', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  t.equal(vm.getSelected(), undefined);

  var id = vm.addExample();
  t.equal(vm.selectedId, id, 'adding selects the new example');
  t.deepEqual(vm.getSelected(), {text: '', startRule: null, shouldMatch: true});

  vm.setExample(id, 'woooo', 'Start');
  t.deepEqual(vm.getSelected(), {text: 'woooo', startRule: 'Start', shouldMatch: true});

  vm.setExample(id, 'woooo', 'Start', false);
  t.deepEqual(vm.getSelected(), {text: 'woooo', startRule: 'Start', shouldMatch: false});

  var id2 = vm.addExample();
  t.equal(vm.selectedId, id2);
  t.deepEqual(vm.getSelected(), {text: '', startRule: null, shouldMatch: true});

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
              [{text: "hi i'm id2", startRule: null, shouldMatch: true}]);

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
        [{text: '', startRule: null, shouldMatch: false}],
        'new value is saved to localStorage');

    vm.toggleShouldMatch(id);  // Toggle it back.
    t.equal(example.shouldMatch, true);

    Vue.nextTick(function() {
      t.deepEqual(
          localStorageExamples,
          [{text: '', startRule: null, shouldMatch: true}],
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
      t.equal(vm.exampleStatus[id], 'pass');
      vm.exampleValues[id].shouldMatch = false;

      Vue.nextTick(function() {
        t.equal(vm.exampleStatus[id], 'fail', 'fails now that shouldMatch is false');

        simulateGrammarEdit('G { start = digit+ }', function() {
          t.equal(vm.exampleStatus[id], 'pass', 'passes when example fails matching');

          var id2 = vm.addExample();
          vm.setExample(id2, '123');
          Vue.nextTick(function() {
            t.equal(vm.exampleStatus[id2], 'pass');

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
