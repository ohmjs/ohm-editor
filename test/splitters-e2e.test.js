import {test, expect} from '@playwright/test';
import { initNetworkReplay } from './playwrightHelpers.js';

test('splitters', async ({page}) => {
  initNetworkReplay(page);

  await page.goto('http://localhost:8080/');
  await expect(page).toHaveTitle(/Ohm Editor/);

  await expect(page).toHaveScreenshot('topSplitter-before-drag.png');

  // 1. Drag the top splitter to the left, making the grammar pane smaller.
  const topSplitter = page.locator('#topSplitter div');
  await topSplitter.dragTo(page.locator('body'), {
    targetPosition: { x: 200, y: 400 }
  });
  await expect(page).toHaveScreenshot('topSplitter-after-drag-1.png');

  // 2. Drag it to the right, making the examples pane smaller.
  await topSplitter.dragTo(page.locator('body'), {
    targetPosition: { x: 900, y: 400 }
  });
  await expect(page).toHaveScreenshot('topSplitter-after-drag-2.png');

  // 3. Double-click the splitter to return it to its original position.
  await topSplitter.dblclick();
  await expect(page).toHaveScreenshot('topSplitter-before-drag.png');

  // 4. Drag the main splitter up, making the visualizer pane bigger -- far
  // enough that the examples pane isn't fully visible.
  const mainSplitter = page.locator('#mainSplitter div');
  await mainSplitter.dragTo(page.locator('body'), {
    targetPosition: { x: 200, y: 100 }
  });
  await expect(page).toHaveScreenshot('mainSplitter-after-drag-1.png');

  // 5. Double-click the splitter to return it to its original position.
  await mainSplitter.dblclick();
  await expect(page).toHaveScreenshot('topSplitter-before-drag.png');
});
