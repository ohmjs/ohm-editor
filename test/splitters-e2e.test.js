import {test, expect} from '@playwright/test';
import { loadEditorWithArithmeticGrammar } from './playwrightHelpers.js';

test('splitters', async ({page}) => {
  await loadEditorWithArithmeticGrammar(page);

  const expectInitialScreenshot = async () => {
    // To avoid inconsistencies with the hover state of the examples, always
    // hover the first example before taking the screenshot.
    await page.hover('.example');
    await expect(page).toHaveScreenshot('topSplitter-before-drag.png');  
  };

  await expectInitialScreenshot();

  // 1. Drag the top splitter to the left, making the grammar pane smaller.
  const topSplitter = page.locator('#topSplitter');
  await topSplitter.dragTo(page.locator('body'), {
    targetPosition: {x: 200, y: 400},
  });
  await expect(page).toHaveScreenshot('topSplitter-after-drag-1.png');

  // 2. Drag it to the right, making the examples pane smaller.
  await topSplitter.dragTo(page.locator('body'), {
    targetPosition: {x: 900, y: 400},
  });
  await expect(page).toHaveScreenshot('topSplitter-after-drag-2.png');

  // 3. Double-click the splitter to return it to its original position.
  await topSplitter.dblclick();
  await expectInitialScreenshot();

  // 4. Drag the main splitter up, making the visualizer pane bigger -- far
  // enough that the examples pane isn't fully visible.
  const mainSplitter = page.locator('#mainSplitter div');
  await mainSplitter.dragTo(page.locator('body'), {
    targetPosition: {x: 200, y: 100},
  });
  await expect(page).toHaveScreenshot('mainSplitter-after-drag-1.png');

  // 5. Double-click the splitter to return it to its original position.
  // Ideally, we could compare to 'topSplitter-before-drag.png', but that
  // doesn't seem to work on Chromium and Firefox, because one of the
  // examples is hovered at this point.
  await mainSplitter.dblclick();
  await expectInitialScreenshot();
});
