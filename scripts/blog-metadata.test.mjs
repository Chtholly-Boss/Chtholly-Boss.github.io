import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArticleMetadata, refreshBlogPosts } from './blog-metadata.mjs';

const firstUrl = 'https://zhuanlan.zhihu.com/p/20579515046';
const secondUrl = 'https://zhuanlan.zhihu.com/p/21142007017';
const first = { url: firstUrl, title: 'Swizzle I', publishedAt: '2025-01-28T13:38:22.000Z' };
const second = { url: secondUrl, title: 'Swizzle II', publishedAt: '2025-02-03T09:20:10.000Z' };

test('reads encoded titles and original publication dates from page metadata', () => {
  const html = `<META content='Swizzle &amp; &#x4E2D;&#25991; &quot;notes&quot;' property='og:title'>
    <meta itemprop="dateModified" content="2026-10-09T10:00:00Z">
    <meta content="2025-01-28T21:38:22+08:00" itemprop="datePublished">`;
  assert.deepEqual(parseArticleMetadata(html, firstUrl), { ...first, title: 'Swizzle & 中文 "notes"' });
  assert.throws(() => parseArticleMetadata('<title>Access restricted</title>', firstUrl), /Missing article/);
});

test('URL-only inputs refresh titles, deduplicate links, and sort by publication date', async () => {
  const result = await refreshBlogPosts([firstUrl, secondUrl, `${firstUrl}/?source=share`], [], async (url) => url === firstUrl ? first : second);
  assert.deepEqual(result, { posts: [second, first], warnings: [] });
});

test('temporary access failures keep cached posts and removed links stay removed', async () => {
  const result = await refreshBlogPosts([firstUrl], [first, second], async () => { throw new Error('HTTP 403'); });
  assert.deepEqual(result.posts, [first]);
  assert.match(result.warnings[0], /Using cached article.*HTTP 403/);
});

test('an inaccessible new link fails clearly instead of silently omitting it', async () => {
  await assert.rejects(refreshBlogPosts([firstUrl], [], async () => { throw new Error('HTTP 403'); }), /no cached article/);
});
