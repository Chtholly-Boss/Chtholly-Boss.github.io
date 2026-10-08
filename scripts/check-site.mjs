import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { preview } from 'vite';
import { HOMEPAGE_BLOG_LIMIT } from './render-blogs.mjs';

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

  for (const id of ['projects', 'blogs', 'favorites', 'profiles']) {
    await page.locator(`.directory a[href="#${id}"]`).click();
    assert.equal(new URL(page.url()).hash, `#${id}`);
    assert.ok(await page.locator(`#${id} h2`).isVisible());
  }
  const configuredBlogLinks = JSON.parse(await fs.readFile('src/blog-links.json', 'utf8'));
  const blogLinks = [...new Set(configuredBlogLinks.map((link) => {
    const url = new URL(link);
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  }))].sort();
  const cachedPosts = JSON.parse(await fs.readFile('src/blog-posts.json', 'utf8'));
  const recentLinks = cachedPosts.toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, HOMEPAGE_BLOG_LIMIT).map((post) => post.url);
  assert.deepEqual(await page.locator('.blog-card').evaluateAll((links) => links.map((link) => link.href)), recentLinks);
  const publicationDates = await page.locator('.blog-card time').evaluateAll((dates) => dates.map((date) => Date.parse(date.dateTime)));
  assert.equal(publicationDates.length, Math.min(HOMEPAGE_BLOG_LIMIT, blogLinks.length));
  assert.ok(publicationDates.every((date, index) => Number.isFinite(date) && (index === 0 || publicationDates[index - 1] >= date)));
  console.log('PASS: blog posts show their original publication dates in newest-first order.');
  await page.locator('#copy-link').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://chtholly-boss.github.io/');
  assert.match(await page.locator('#copy-status').innerText(), /copied/);

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '.preview/home-desktop.png', fullPage: true });
  await page.locator('#blogs').screenshot({ path: '.preview/blogs-desktop.png' });
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.preview/home-mobile.png', fullPage: true });
  await page.locator('#blogs').screenshot({ path: '.preview/blogs-mobile.png' });
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

  await page.locator('.blog-more').click();
  assert.equal(new URL(page.url()).pathname, '/blogs/');
  assert.equal(await page.locator('h1').innerText(), 'Blog archive.');
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(await page.locator('.blog-card').evaluateAll((links) => links.map((link) => link.href).sort()), blogLinks);
  const archiveDates = await page.locator('.blog-card time').evaluateAll((dates) => dates.map((date) => Date.parse(date.dateTime)));
  assert.ok(archiveDates.every((date, index) => Number.isFinite(date) && (index === 0 || archiveDates[index - 1] >= date)));
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Archive overflow at ${width}px`);
  }
  await page.screenshot({ path: '.preview/archive-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.preview/archive-mobile.png', fullPage: true });
  const archiveAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(archiveAccessibility.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target }) => target) })), []);
  assert.deepEqual(errors, []);
  await page.getByRole('link', { name: '← Back to home' }).click();
  await page.waitForLoadState('networkidle');
  assert.equal(new URL(page.url()).hash, '#blogs');
  console.log('PASS: More opens the complete archive; direct navigation, responsive layouts, accessibility, and the return link work.');

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

  const noJavaScript = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  const staticPage = await noJavaScript.newPage();
  await staticPage.goto(origin);
  assert.match(await staticPage.locator('#profile-readme').innerText(), /I'm Chtholly Boss/);
  assert.deepEqual(await staticPage.locator('.blog-card').evaluateAll((links) => links.map((link) => link.href)), recentLinks);
  await staticPage.locator('.directory a[href="#projects"]').click();
  assert.equal(new URL(staticPage.url()).hash, '#projects');
  await staticPage.locator('.blog-more').click();
  assert.equal(new URL(staticPage.url()).pathname, '/blogs/');
  assert.deepEqual(await staticPage.locator('.blog-card').evaluateAll((links) => links.map((link) => link.href).sort()), blogLinks);
  await noJavaScript.close();
  console.log('PASS: introduction, recent blog posts, archive, and navigation work without JavaScript.');
} finally {
  await context?.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
