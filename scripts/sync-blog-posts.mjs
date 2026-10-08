import fs from 'node:fs/promises';
import { refreshBlogPosts } from './blog-metadata.mjs';

const linksPath = new URL('../src/blog-links.json', import.meta.url);
const cachePath = new URL('../src/blog-posts.json', import.meta.url);
const links = JSON.parse(await fs.readFile(linksPath, 'utf8'));
let cachedPosts = [];
try {
  cachedPosts = JSON.parse(await fs.readFile(cachePath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const { posts, warnings } = await refreshBlogPosts(links, cachedPosts);
for (const warning of warnings) console.warn(warning);
await fs.writeFile(cachePath, `${JSON.stringify(posts, null, 2)}\n`);
console.log(`Blog metadata ready: ${posts.length} articles, newest first.`);
