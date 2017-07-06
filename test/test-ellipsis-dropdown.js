'use strict';

var Vue = require('vue');
var test = require('tape');

var EllipsisDropdown = Vue.extend(require('../src/components/ellipsis-dropdown.vue'));

var ArrayProto = Array.prototype;

// Helpers
// -------

function findEl(vm, query) {
  return vm.$el.querySelector(query);
}

// Tests
// -----

test('showing and hiding the dropdown', function(t) {
  var counts = {Foo: 0, Bar: 0};
  var vm = new EllipsisDropdown({
    propsData: {
      items: {
        Foo: function() { counts.Foo++; },
        Bar: null
      }
    }
  });
  vm.$mount();

  t.equal(vm.hidden, true);

  var button = findEl(vm, 'button');
  button.click();

  t.equal(vm.hidden, false, 'hidden is false after clicking button');
  Vue.nextTick(function() {
    var links = ArrayProto.slice.call(vm.$el.querySelectorAll('li > a'));

    var labels = links.map(function(el) { return el.textContent; });
    t.deepEqual(labels, ['Foo', 'Bar'], 'labels are correct');

    links[0].click();
    Vue.nextTick(function() {
      t.equal(counts.Foo, 1, 'Foo callback ran');
      t.equal(counts.Bar, 0);
      t.equal(vm.hidden, true, 'click caused menu to hide');

      button.click();
      links[0].click();
      t.equal(counts.Foo, 2, 'Foo callback ran again');
      t.equal(vm.hidden, true, 'menu is hidden again');

      var disabledItem = findEl(vm, '.disabled');
      t.equal(disabledItem.textContent, links[1].textContent, 'Bar item is disabled');

      button.click();
      links[1].click();
      t.equal(vm.hidden, true, 'menu is hidden when disabled item is clicked');

      t.end();
    });
  });
});
