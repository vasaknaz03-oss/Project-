// Collects pin image URLs from a Pinterest search, for moodboards.
//
//   node tools/pinterest.mjs "bakery instagram highlight covers" pins.json
//
// Pinterest renders results with JavaScript, so the page is opened in headless Chromium
// through the environment's HTTPS proxy. Pins are other people's work: use them as
// references only, never copy them into the designs.
import fs from 'node:fs';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const [,, query, out = 'pins.json'] = process.argv;
const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
const page = await browser.newPage({ viewport: { width: 1400, height: 2200 }, locale: 'en-US' });
await page.goto('https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(query), { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
for (let i = 0; i < 3; i++) {
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(1500);
}
const pins = await page.evaluate(() => [...document.querySelectorAll('img')]
  .filter((img) => /i\.pinimg\.com\/(236x|474x|564x|736x|originals)\//.test(img.currentSrc || img.src))
  .map((img) => ({
    pin: img.closest('a')?.href || '',
    image: (img.currentSrc || img.src).replace(/\/(\d+x|originals)\//, '/474x/'),
    alt: img.alt,
  })));
fs.writeFileSync(out, JSON.stringify(pins, null, 1));
console.log(`${query} → ${pins.length} pins → ${out}`);
await browser.close();
