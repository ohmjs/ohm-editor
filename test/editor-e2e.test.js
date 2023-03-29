import {test, expect} from '@playwright/test';
import { initNetworkReplay } from './playwrightHelpers.js';

test('basic behaviour', async ({page}) => {
  initNetworkReplay(page);

  await page.goto('http://localhost:8080/');
  await expect(page).toHaveTitle(/Ohm Editor/);

  // 1️. Select the Arithmetic grammar.
  await page
    .getByRole('combobox', {name: 'Selected grammar'})
    .selectOption({label: 'Arithmetic'});

  // Wait for the grammar to be loaded...
  await page.waitForFunction(`
    ohmEditor.ui.grammarEditor.getValue().startsWith('Arithmetic {')
  `);

  // ...and the examples.
  const listItems = page
    .getByRole('list', {name: 'Examples'})
    .getByRole('listitem');
  await expect(listItems).toHaveCount(5);

  await expect(page).toHaveScreenshot('arithmetic-all-examples-green.png');

  // 2. Switch the first example from "should match" to "should NOT match".
  await page
    .getByRole('list', {name: 'Examples'})
    .getByRole('switch')
    .first()
    .click();
  await expect(page).toHaveScreenshot('arithmetic-first-example-red.png');

  // 3. Add a new example.
  await page.getByRole('button', {name: 'Add example'}).click();
  await page.keyboard.type('1 + 2');
  await page.getByRole('button', {name: 'Done'}).click();

  await expect(page).toHaveScreenshot('arithmetic-new-example-done.png');
});
