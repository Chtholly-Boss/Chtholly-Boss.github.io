import assert from 'node:assert/strict';
import test from 'node:test';
import { renderBlogPreview, renderBlogArchive } from './render-blogs.mjs';

test('the homepage keeps only the five newest posts while the archive keeps every post', () => {
  const posts = Array.from({ length: 7 }, (_, index) => ({
    url: `https://zhuanlan.zhihu.com/p/${index + 1}`,
    title: `Post ${index + 1}`,
    publishedAt: `2025-01-0${index + 1}T12:00:00.000Z`,
  }));
  const urls = (html) => [...html.matchAll(/class="blog-card" href="([^"]+)"/g)].map(([, url]) => url);
  const newestFirst = posts.toReversed().map((post) => post.url);
  assert.deepEqual(urls(renderBlogPreview(posts)), newestFirst.slice(0, 5));
  assert.deepEqual(urls(renderBlogArchive(posts)), newestFirst);
});

test('archive year headings use Shanghai dates and article titles remain plain text', () => {
  const html = renderBlogArchive([{
    url: 'https://zhuanlan.zhihu.com/p/1',
    title: '<script>Swizzle & kernels</script>',
    publishedAt: '2025-12-31T20:00:00.000Z',
  }]);
  assert.match(html, /<h2 id="year-2026">2026<\/h2>/);
  assert.match(html, /Jan 1, 2026/);
  assert.match(html, /&lt;script&gt;Swizzle &amp; kernels&lt;\/script&gt;/);
  assert.ok(!html.includes('<script>'));
});
