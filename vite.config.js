import { defineConfig } from 'vite';
import blogPosts from './src/blog-posts.json' with { type: 'json' };

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Shanghai',
});
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => htmlEntities[character]);

function renderBlogPosts() {
  const posts = blogPosts.map((post) => {
    const published = new Date(post.publishedAt);
    if (!Number.isFinite(published.getTime())) throw new Error(`Invalid publication date for ${post.title}`);
    return { ...post, published };
  });

  return posts.toSorted((a, b) => b.published - a.published).map((post) => `
    <li>
      <a class="blog-card" href="${escapeHtml(post.url)}">
        <div class="blog-date"><span>Published</span><time datetime="${escapeHtml(post.publishedAt)}">${dateFormatter.format(post.published)}</time><span class="blog-source">Zhihu</span></div>
        <div class="blog-copy"><h3 lang="zh-CN">${escapeHtml(post.title)}</h3><p>Read on Zhihu</p></div>
        <svg class="icon" aria-hidden="true"><use href="#arrow-up-right"></use></svg>
      </a>
    </li>`).join('');
}

export default defineConfig({
  plugins: [{
    name: 'blog-widget',
    transformIndexHtml(html) {
      return html.replace('<!-- blog-posts -->', renderBlogPosts());
    },
  }],
});
