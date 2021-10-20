/* eslint-env jest */

'use strict';

const { mount } = require('@vue/test-utils');
const Vue = require('vue').default || require('vue');

// eslint-disable-next-line max-len
const EllipsisDropdown = require('../src/components/ellipsis-dropdown.vue').default || require('../src/components/ellipsis-dropdown.vue');

// Helpers
// -------

function findEl(vm, query) {
  return vm.$el.querySelector(query);
}

// Tests
// -----

test('showing and hiding the dropdown',  async () => {
  const counts = {Foo: 0, Bar: 0};
  const {vm} = mount(EllipsisDropdown, {
    propsData: {
      items: {
        Foo() {
          counts.Foo++;
        },
        Bar: null,
      },
    },
  });

  expect(vm.hidden).toEqual(true);

  const button = findEl(vm, 'button');
  button.click();

  expect(vm.hidden).toEqual(false); // hidden is false after clicking button
  await Vue.nextTick();

  const links = Array.from(vm.$el.querySelectorAll('li > a'));

  const labels = links.map((el) => el.textContent);
  expect(labels).toEqual(['Foo', 'Bar'], 'labels are correct');

  links[0].click();

  await Vue.nextTick();

  expect(counts.Foo).toEqual(1); // Foo callback ran
  expect(counts.Bar).toEqual(0);
  expect(vm.hidden).toEqual(true); // click caused menu to hide

  button.click();
  links[0].click();
  expect(counts.Foo).toEqual(2); // Foo callback ran again
  expect(vm.hidden).toEqual(true); // menu is hidden again

  const disabledItem = findEl(vm, '.disabled');
  expect(disabledItem.textContent).toBe(links[1].textContent) // Bar item is disabled

  button.click();
  links[1].click();
  
  expect(vm.hidden).toEqual(true) // hidden is false after clicking button
});
