'use strict';

const Vue = require('vue').default;
const test = require('tape');

const EllipsisDropdown = Vue.extend(require('../src/components/ellipsis-dropdown.vue').default);

const ArrayProto = Array.prototype;

// Helpers
// -------

function findEl(vm, query) {
  return vm.$el.querySelector(query);
}

// Tests
// -----

test('showing and hiding the dropdown', (t) => {
  const counts = {Foo: 0, Bar: 0};
  const vm = new EllipsisDropdown({
    propsData: {
      items: {
        Foo() {counts.Foo++;},
        Bar: null,
      },
    },
  });
  vm.$mount();

  t.equal(vm.hidden, true);

  const button = findEl(vm, 'button');
  button.click();

  t.equal(vm.hidden, false, 'hidden is false after clicking button');
  Vue.nextTick(() => {
    const links = ArrayProto.slice.call(vm.$el.querySelectorAll('li > a'));

    const labels = links.map((el) => el.textContent);
    t.deepEqual(labels, ['Foo', 'Bar'], 'labels are correct');

    links[0].click();
    Vue.nextTick(() => {
      t.equal(counts.Foo, 1, 'Foo callback ran');
      t.equal(counts.Bar, 0);
      t.equal(vm.hidden, true, 'click caused menu to hide');

      button.click();
      links[0].click();
      t.equal(counts.Foo, 2, 'Foo callback ran again');
      t.equal(vm.hidden, true, 'menu is hidden again');

      const disabledItem = findEl(vm, '.disabled');
      t.equal(disabledItem.textContent, links[1].textContent, 'Bar item is disabled');

      button.click();
      links[1].click();
      t.equal(vm.hidden, true, 'menu is hidden when disabled item is clicked');

      t.end();
    });
  });
});
