export const HOMEPAGE_BLOG_LIMIT = 5;

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Shanghai',
});
const yearFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Shanghai' });
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => htmlEntities[character]);

function sortedPosts(posts) {
  return posts.map((post) => {
    const published = new Date(post.publishedAt);
    if (!Number.isFinite(published.getTime())) throw new Error(`Invalid publication date for ${post.title}`);
    return { ...post, published };
  }).toSorted((a, b) => b.published - a.published);
}

function renderRows(posts) {
  return posts.map((post) => `
    <li>
      <a class="blog-card" href="${escapeHtml(post.url)}">
        <time class="blog-date" datetime="${escapeHtml(post.publishedAt)}">${dateFormatter.format(post.published)}</time>
        <h3 lang="zh-CN">${escapeHtml(post.title)}</h3>
        <svg class="icon" aria-hidden="true"><use href="#arrow-up-right"></use></svg>
      </a>
    </li>`).join('');
}

export function renderBlogPreview(posts) {
  return renderRows(sortedPosts(posts).slice(0, HOMEPAGE_BLOG_LIMIT));
}

export function renderBlogArchive(posts) {
  const years = new Map();
  for (const post of sortedPosts(posts)) {
    const year = yearFormatter.format(post.published);
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(post);
  }
  return [...years].map(([year, entries]) => `
    <section class="archive-year" aria-labelledby="year-${year}">
      <h2 id="year-${year}">${year}</h2>
      <div class="blog-widget"><ol class="blog-list" role="list" aria-label="Posts published in ${year}">${renderRows(entries)}</ol></div>
    </section>`).join('');
}
