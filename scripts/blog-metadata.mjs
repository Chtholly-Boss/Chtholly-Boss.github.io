import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeHtml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (!key.startsWith('#')) return entities[key];
    const codePoint = key.startsWith('#x') ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : match;
  });
}

export function parseArticleMetadata(html, url) {
  const metadata = new Map();
  for (const [tag] of html.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const attributes = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      .map(([, name, doubleQuoted, singleQuoted]) => [name.toLowerCase(), doubleQuoted ?? singleQuoted]));
    const name = attributes.itemprop || attributes.property || attributes.name;
    if (name && attributes.content) metadata.set(name.toLowerCase(), decodeHtml(attributes.content).trim());
  }
  const title = metadata.get('headline') || metadata.get('og:title');
  const publishedAt = metadata.get('datepublished') || metadata.get('article:published_time');
  if (!title || !publishedAt || !Number.isFinite(Date.parse(publishedAt))) {
    throw new Error(`Missing article title or original publication date: ${url}`);
  }
  return { url, title, publishedAt: new Date(publishedAt).toISOString() };
}

async function fetchHtml(source) {
  if (process.platform === 'win32') {
    // PowerShell uses the Windows system proxy, which Node fetch does not inherit.
    const command = `$ErrorActionPreference = 'Stop';
      [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new();
      $headers = @{ Accept = 'text/html'; 'User-Agent' = 'Mozilla/5.0'; 'X-Return-Format' = 'html' };
      $response = Invoke-WebRequest -UseBasicParsing -Uri $env:BLOG_METADATA_URL -Headers $headers -TimeoutSec $env:BLOG_METADATA_TIMEOUT;
      [Console]::Write($response.Content);`;
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      env: { ...process.env, BLOG_METADATA_URL: source.url, BLOG_METADATA_TIMEOUT: String(source.timeout / 1000) },
      encoding: 'utf8', windowsHide: true, timeout: source.timeout + 5000, maxBuffer: 8 * 1024 * 1024,
    });
    return stdout;
  }
  const response = await fetch(source.url, { headers: source.headers, signal: AbortSignal.timeout(source.timeout) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(source.url).hostname}`);
  return response.text();
}

async function fetchArticleMetadata(url) {
  const sources = [
    { url, headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 },
    { url: `https://r.jina.ai/${url}`, headers: { 'X-Return-Format': 'html' }, timeout: 25000 },
  ];
  let lastError;
  for (const source of sources) {
    try {
      return parseArticleMetadata(await fetchHtml(source), url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function refreshBlogPosts(links, cachedPosts, fetchPost = fetchArticleMetadata) {
  const urls = [...new Set(links.map((link) => {
    const url = new URL(link);
    if (url.protocol !== 'https:' || url.hostname !== 'zhuanlan.zhihu.com' || !/^\/p\/\d+\/?$/.test(url.pathname)) {
      throw new Error(`Expected a Zhihu article URL: ${link}`);
    }
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  }))];
  const warnings = [];
  const posts = await Promise.all(urls.map(async (url) => {
    try {
      return await fetchPost(url);
    } catch (error) {
      const cached = cachedPosts.find((post) => post.url === url);
      if (!cached?.title || !Number.isFinite(Date.parse(cached.publishedAt))) {
        throw new Error(`Could not fetch ${url}, and no cached article is available. Retry the refresh.`, { cause: error });
      }
      warnings.push(`Using cached article for ${url}: ${error.message}`);
      return { url, title: cached.title, publishedAt: cached.publishedAt };
    }
  }));
  return { posts: posts.toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)), warnings };
}
