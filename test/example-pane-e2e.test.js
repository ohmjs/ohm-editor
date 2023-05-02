import {test, expect} from '@playwright/test';
import {loadEditorWithArithmeticGrammar} from './playwrightHelpers.js';

test('sizing, collapsing, expanding', async ({page}) => {
  await loadEditorWithArithmeticGrammar(page);

  const expectInitialScreenshot = async opts => {
    // To avoid inconsistencies with the hover state of the examples, always
    // hover the first example before taking the screenshot.
    await page.hover('.example');
    await expect(page).toHaveScreenshot('hSplitter-before-drag.png', opts);
  };

  const makeHeightGetter = sel => {
    return async () => (await page.locator(sel).boundingBox()).height;
  };

  await expectInitialScreenshot();

  const exampleContainerHeight = makeHeightGetter('#exampleContainer');
  const exampleContainerContentsHeight = makeHeightGetter(
    '#userExampleContainer > .contents'
  );
  const fullHeightBefore = await exampleContainerHeight();
  const contentsHeightBefore = await exampleContainerContentsHeight();
  const heightExcludingContents = fullHeightBefore - contentsHeightBefore;
  const pageHeight = (await page.viewportSize()).height;

  // 1. Minize the examples, and check that the full height of the panel
  // is equal to the height of the header only.
  await page.getByLabel('Collapse').click();
  expect(await exampleContainerHeight()).toBe(heightExcludingContents);

  // Check that the panel is at the bottom of the screen.
  const box = await page.locator('#exampleContainer').boundingBox();
  expect(box.y + box.height).toBe(pageHeight);

  // 2. Expand the panel again.
  await page.getByLabel('Expand').click();

  // We should be back in the initial state.
  // Set the threshold slightly higher (default is 0.2) to avoid trigger a diff
  // due to anti-aliasing artifacts on webkit.
  await expectInitialScreenshot({threshold: 0.25});

  // 3. Drag the splitter downwards, nearly to the bottom of the screen.
  const hSplitter = page.locator('.main-grid .splitter:not(.vertical)');
  await hSplitter.dragTo(page.locator('body'), {
    targetPosition: {x: 100, y: pageHeight - 20},
  });

  // Check that the panel isn't smaller than in its minimized state.
  // Round to avoid a difference of 0.5 (not sure why)
  expect(await exampleContainerHeight()).toBe(
    Math.round(heightExcludingContents)
  );

  // 4. Expand the panel again.
  await page.getByLabel('Expand').click();

  // We should be back in the initial state again.
  await expectInitialScreenshot({threshold: 0.25});

  // 5. Drag the splitter downwards, but not as far as before.
  await hSplitter.dragTo(page.locator('body'), {
    targetPosition: {x: 100, y: pageHeight - 200},
  });

  // Expect that contents of the panel are visible (not just the header).
  const fullHeightBeforeCollapsing = await exampleContainerHeight();
  expect(fullHeightBeforeCollapsing).toBeGreaterThan(heightExcludingContents);
  expect(await exampleContainerContentsHeight()).toBeGreaterThan(0);

  // 6. Collapse the panel.
  await page.getByLabel('Collapse').click();
  expect(await exampleContainerHeight()).toBe(heightExcludingContents);

  // 7. Expand it again.
  await page.getByLabel('Expand').click();

  // Check that it has the same height as before.
  expect(await exampleContainerHeight()).toEqual(fullHeightBeforeCollapsing);
});
