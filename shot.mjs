import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('Regenerating output...');
  execSync('MAKEFUN_OUTPUT_DIR=out node main.ts --input /data/work/token-radar-01-kit/input/snapshot.json', { stdio: 'inherit' });

  fs.mkdirSync('screenshots', { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const htmlPath = path.resolve('out/dashboard/index.html');
  await page.goto(`file://${htmlPath}`);
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: 'screenshots/1-board.jpg', quality: 80, type: 'jpeg' });

  const firstRow = page.locator('table tbody tr, .row, [role="row"]').first();
  if (await firstRow.count() > 0) {
    await firstRow.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: 'screenshots/2-detail.jpg', quality: 80, type: 'jpeg' });

  const filterSelect = page.locator('select, [role="combobox"], button').first();
  if (await filterSelect.count() > 0) {
    await filterSelect.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'screenshots/3-filtered.jpg', quality: 80, type: 'jpeg' });

  await browser.close();
  console.log('Screenshots saved successfully.');
}

main().catch(err => {
  console.error('Playwright error:', err);
  process.exit(1);
});
