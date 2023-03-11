import 'global-jsdom/register';

import testUtils from '@vue/test-utils';
import {test} from 'uvu';
import * as assert from 'uvu/assert';
import Vue from 'vue/dist/vue.esm.mjs';

import EllipsisDropdown from '../src/components/ellipsis-dropdown.js';

// Helpers
// -------

function findEl(vm, query) {
  return vm.$el.querySelector(query);
}

// Tests
// -----

test('showing and hiding the dropdown', async () => {
  const counts = {Foo: 0, Bar: 0};
  const {vm} = testUtils.mount(EllipsisDropdown, {
    propsData: {
      items: {
        Foo() {
          counts.Foo++;
        },
        Bar: null,
      },
    },
  });

  assert.equal(vm.hidden, true);

  const button = findEl(vm, 'button');
  button.click();

  assert.equal(vm.hidden, false); // hidden is false after clicking button
  await Vue.nextTick();

  const links = Array.from(vm.$el.querySelectorAll('li > a'));

  const labels = links.map(el => el.textContent);
  assert.equal(labels, ['Foo', 'Bar'], 'labels are correct');

  links[0].click();

  await Vue.nextTick();

  assert.equal(counts.Foo, 1); // Foo callback ran
  assert.equal(counts.Bar, 0);
  assert.equal(vm.hidden, true); // click caused menu to hide

  button.click();
  links[0].click();
  assert.equal(counts.Foo, 2); // Foo callback ran again
  assert.equal(vm.hidden, true); // menu is hidden again

  const disabledItem = findEl(vm, '.disabled');
  assert.is(disabledItem.textContent, links[1].textContent); // Bar item is disabled

  button.click();
  links[1].click();

  assert.equal(vm.hidden, true); // hidden is false after clicking button
});

test.run();
