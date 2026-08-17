/**
 * Screenshots a built page so the UI can be eyeballed, not assumed.
 *
 *   npm run shot -- dist/self-scout.html dist/self-scout.png
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const [input = 'dist/self-scout.html', output = 'dist/self-scout.png'] = process.argv.slice(2);

// Use the environment's preinstalled Chromium when the pinned Playwright build
// does not match it, rather than downloading a second copy.
const preinstalled = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(
  existsSync(preinstalled) ? { executablePath: preinstalled } : {},
);
const page = await browser.newPage({
  viewport: { width: 820, height: 700 },
  deviceScaleFactor: 2,
});
await page.goto(pathToFileURL(resolve(input)).href);
await page.screenshot({ path: resolve(output), fullPage: true });
await browser.close();

console.log(`wrote ${output}`);
