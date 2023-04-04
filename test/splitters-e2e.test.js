import {test, expect} from '@playwright/test';
import {loadEditorWithArithmeticGrammar} from './playwrightHelpers.js';

test('vertical splitter', async ({page}) => {
  await loadEditorWithArithmeticGrammar(page);

  const expectInitialScreenshot = async () => {
    // To avoid inconsistencies with the hover state of the examples, always
    // hover the first example before taking the screenshot.
    await page.hover('.example');
    await expect(page).toHaveScreenshot('vSplitter-before-drag.png');
  };

  await expectInitialScreenshot();

  const getVizWidth = async () =>
    (await page.locator('#visualizerContainer').boundingBox()).width;
  const vizWidthBeforeDrag = await getVizWidth();

  // 1. Drag the vertical splitter to the left, making the grammar pane smaller.
  const vSplitter = page.locator('.main-grid .splitter.vertical');
  await vSplitter.dragTo(page.locator('body'), {
    targetPosition: {x: 200, y: 400},
  });
  expect((await getVizWidth()) - vizWidthBeforeDrag).toBe(440.5);

  // 2. Drag it to the right, making the visualizer pane smaller.
  await vSplitter.dragTo(page.locator('body'), {
    targetPosition: {x: 900, y: 400},
  });
  expect((await getVizWidth()) - vizWidthBeforeDrag).toBe(440.5 - 700 + 1);

  // 3. Double-click the splitter to return it to its original position.
  await vSplitter.dblclick();
  await expectInitialScreenshot();
});
