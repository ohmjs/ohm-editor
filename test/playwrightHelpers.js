import {expect} from '@playwright/test';

export async function initNetworkReplay(page) {
  // Avoid hitting GitHub, especially since we can get rate limited.
  await page.routeFromHAR('test/data/har/api.github.com.har', {
    url: /^https:\/\/api.github.com\//,
  });
  await page.routeFromHAR('test/data/har/unpkg.com.har', {
    url: /^https:\/\/unpkg.com\//,
  });

  // Kill requests to analytics script.
  await page.route(/^https:\/\/thirteen-six.ohmjs.org\//, route =>
    route.abort()
  );
}

export async function selectArithmeticGrammar(page) {
  // Select the Arithmetic grammar.
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
}

export async function loadEditorWithArithmeticGrammar(page) {
  await initNetworkReplay(page);
  await page.goto('http://localhost:8080/');
  await expect(page).toHaveTitle(/Ohm Editor/);
  await selectArithmeticGrammar(page);
}
