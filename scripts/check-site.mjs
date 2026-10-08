import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { preview } from 'vite';

await fs.mkdir('.preview', { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
const windowsChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.CHROME_PATH || (existsSync(windowsChrome) ? windowsChrome : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
const origin = 'http://127.0.0.1:4173';
const rawReadme = 'https://raw.githubusercontent.com/Chtholly-Boss/Chtholly-Boss/main/README.md';
const apiReadme = 'https://api.github.com/repos/Chtholly-Boss/Chtholly-Boss/readme';
const snapshot = await fs.readFile('src/profile-fallback.md', 'utf8');
let context;

try {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  await context.route(rawReadme, (route) => route.fulfill({ contentType: 'text/plain', body: snapshot }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.getAttribute('html', 'data-profile-source'), 'github');
  assert.match(await page.locator('#profile-readme').innerText(), /I'm Chtholly Boss/);

  for (const id of ['projects', 'favorites', 'profiles']) {
    await page.locator(`.directory a[href="#${id}"]`).click();
    assert.equal(new URL(page.url()).hash, `#${id}`);
    assert.ok(await page.locator(`#${id} h2`).isVisible());
  }
  await page.locator('#copy-link').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://chtholly-boss.github.io/');
  assert.match(await page.locator('#copy-status').innerText(), /copied/);

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '.preview/home-desktop.png', fullPage: true });
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.preview/home-mobile.png', fullPage: true });
  assert.deepEqual(await page.locator('img').evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src)), []);
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile layouts, section cards, clipboard, images, and no JavaScript errors.');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(accessibility.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target }) => target) })), []);
  console.log('PASS: automated WCAG accessibility checks.');

  const references = await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.href));
  for (const href of references) {
    const url = new URL(href);
    if (url.origin === origin && url.hash) assert.equal(await page.locator(`[id="${url.hash.slice(1)}"]`).count(), 1);
  }
  assert.ok(references.includes('https://chtholly-boss.github.io/binet/'));
  assert.ok(!references.includes('https://chtholly-boss.github.io/bitiket/'));

  await context.route('https://example.invalid/**', (route) => route.abort());
  await context.route(rawReadme, (route) => route.fulfill({ contentType: 'text/plain', body: '## Updated introduction\n\nNew words from the source. [Notes](notes.md)\n\n<script>window.unsafe = true</script><img src="https://example.invalid/avatar.png" onerror="window.unsafe = true">' }));
  await page.reload({ waitUntil: 'networkidle' });
  assert.match(await page.locator('#profile-readme').innerText(), /New words from the source/);
  assert.equal(await page.locator('#profile-readme a').getAttribute('href'), 'https://github.com/Chtholly-Boss/Chtholly-Boss/blob/main/notes.md');
  assert.equal(await page.locator('#profile-readme script, #profile-readme [onerror]').count(), 0);
  assert.equal(await page.evaluate(() => window.unsafe), undefined);
  console.log('PASS: updated upstream Markdown renders, relative links resolve, and unsafe HTML is removed.');

  await context.route(rawReadme, (route) => route.abort());
  await context.route(apiReadme, (route) => route.fulfill({ contentType: 'text/plain', body: '## API fallback\n\nStill updated from GitHub.' }));
  await page.reload({ waitUntil: 'networkidle' });
  assert.match(await page.locator('#profile-readme').innerText(), /Still updated from GitHub/);
  await context.route(apiReadme, (route) => route.abort());
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getAttribute('html', 'data-profile-source'), 'fallback');
  assert.match(await page.locator('#profile-readme').innerText(), /I'm Chtholly Boss/);
  console.log('PASS: API fallback and offline README snapshot remain readable.');

  const noJavaScript = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJavaScript.newPage();
  await staticPage.goto(origin);
  assert.match(await staticPage.locator('#profile-readme').innerText(), /I'm Chtholly Boss/);
  await staticPage.locator('.directory a[href="#projects"]').click();
  assert.equal(new URL(staticPage.url()).hash, '#projects');
  await noJavaScript.close();
  console.log('PASS: introduction and navigation work without JavaScript.');
} finally {
  await context?.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
