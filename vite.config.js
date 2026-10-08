import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import blogPosts from './src/blog-posts.json' with { type: 'json' };
import { renderBlogPreview, renderBlogArchive } from './scripts/render-blogs.mjs';

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        archive: fileURLToPath(new URL('./blogs/index.html', import.meta.url)),
      },
    },
  },
  plugins: [{
    name: 'blog-widget',
    transformIndexHtml(html) {
      return html.replace('<!-- blog-posts -->', renderBlogPreview(blogPosts))
        .replace('<!-- blog-archive -->', renderBlogArchive(blogPosts));
    },
  }],
});
