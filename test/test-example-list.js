'use strict';

var Vue = require('vue');
var assert = require('assert');
var test = require('tape');

// Returns a stub instance of CodeMirror.
global.CodeMirror = function() {
  return {
    focus: function() {},
    setOption: function() {},
    setValue: function(val) {}
  };
};

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
