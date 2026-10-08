# Chtholly's personal homepage

The personal profile and project index at **https://chtholly-boss.github.io/**.

## Content

- **Introduction:** loaded from [`Chtholly-Boss/Chtholly-Boss/README.md`](https://github.com/Chtholly-Boss/Chtholly-Boss#readme). Edit that README to update the introduction on GitHub and this site. The browser fetches its current Markdown, sanitizes the rendered HTML, and resolves relative links against the profile repository. A bundled snapshot and static HTML keep the introduction readable when JavaScript or GitHub is unavailable.
- **Projects:** only [binet's public site](https://chtholly-boss.github.io/binet/).
- **Blogs:** add only article URLs to `src/blog-links.json`. Development and production builds fetch their titles and original publication dates, then display the posts newest first. The finished widget works without JavaScript or live Zhihu requests from visitors.
- **Favorites:** interests from the profile README, with only [DeepGEMM](https://github.com/deepseek-ai/DeepGEMM) and [tvm-ffi](https://github.com/apache/tvm-ffi) on the starred shelf.
- **Profiles:** GitHub and Zhihu. Update the cards in `index.html` as more links are added.

## Development

Use Node.js 24 or later.

```sh
npm ci
npm run dev
npm run build
npm run check
```

The browser check uses installed Chrome on Windows. On other systems, run `npx playwright install chromium` first, or set `CHROME_PATH` to a Chrome executable. Screenshots are saved to `.preview/`.

`src/style.css` contains the visual styles. `src/main.js` handles the README embed and the copy-link button. `src/profile-fallback.md` is the offline snapshot of the profile README.

To add a blog post, paste its Zhihu article URL into `src/blog-links.json`. Entry order does not matter. Run `npm run build` or `npm run dev` as usual; `npm run blogs:refresh` also refreshes the list independently. Titles and dates are read from the article's page metadata, using Jina Reader as a fallback when direct access fails. No Zhihu login is needed.

`src/blog-posts.json` is a generated cache; keep it committed so temporary access failures can use the last successful metadata. New links with no readable metadata or cache produce an explicit error. Removing a URL removes it from the widget. Dates display in Asia/Shanghai time, and later edits do not change the original publication order.

## Publishing

GitHub Pages uses **GitHub Actions** as its source. Pushing to `main` builds with Vite and publishes `dist/` through `.github/workflows/pages.yml`.

## Assets

- Avatar: the public Chtholly-Boss GitHub avatar.
- binet preview: a frame of the film at https://chtholly-boss.github.io/binet/ (the swimlane scene), captured with Playwright at 1120×600.
- DM Sans and Lora: locally hosted font files under the SIL Open Font License; licenses are included in `public/assets/fonts/`.
