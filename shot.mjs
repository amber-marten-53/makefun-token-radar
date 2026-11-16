import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  const screenshotsDir = path.resolve('screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const indexPath = 'file://' + path.resolve('out/dashboard/index.html');
  await page.goto(indexPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1-board.jpg
  await page.screenshot({ path: path.join(screenshotsDir, '1-board.jpg'), quality: 80, type: 'jpeg' });

  // Click first data row for 2-detail.jpg
  // Try table tbody tr first row, or list item / card
  const row = page.locator('tbody tr, .token-row, .card, tr').first();
  if (await row.count() > 0) {
    await row.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(screenshotsDir, '2-detail.jpg'), quality: 80, type: 'jpeg' });

  // Choose a category filter for 3-filtered.jpg
  // Look for select or filter buttons/chips
  const filterSelect = page.locator('select, [data-filter], .filter-btn, button').first();
  if (await filterSelect.count() > 0) {
    const tagName = await filterSelect.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'select') {
      const options = await filterSelect.locator('option').allInnerTexts();
      if (options.length > 1) {
        await filterSelect.selectOption({ index: 1 });
      }
    } else {
      await filterSelect.click();
    }
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(screenshotsDir, '3-filtered.jpg'), quality: 80, type: 'jpeg' });

  await browser.close();
  console.log('Screenshots captured successfully.');
}

main().catch(err => {
  console.error('Playwright error:', err);
  process.exit(1);
});
