import {test, expect} from '@playwright/test';
import { loadEditorWithArithmeticGrammar } from './playwrightHelpers.js';

test('basic behaviour', async ({page}) => {
  await loadEditorWithArithmeticGrammar(page);

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
