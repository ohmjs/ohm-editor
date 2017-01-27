'use strict';

var Vue = require('vue');
var test = require('tape');

// Returns a stub instance of CodeMirror.
global.CodeMirror = function() {
  return {
    focus: function() {},
    setOption: function() {}
  };
};

var exampleListInjector = require('!!vue?inject!../src/components/example-list.vue');
var ExampleList = Vue.extend(exampleListInjector({
  'global/window': {
    localStorage: {
      getItem: function() {
        return '[]';
      },
      setItem: function() {}
    }
  }
}));

test('adding and deleting', function(t) {
  var vm = new ExampleList();
  vm.$mount();

  t.equal(vm.getSelected(), undefined);

  var id = vm.addExample();
  t.equal(vm.selectedId, id);
  t.deepEqual(vm.getSelected(), {text: '', startRule: null, shouldMatch: true});

  t.end();
});
