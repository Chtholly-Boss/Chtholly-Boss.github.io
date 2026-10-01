# Chtholly's personal homepage

The personal profile and project index at **https://chtholly-boss.github.io/**.

## Content

- **Introduction:** loaded from [`Chtholly-Boss/Chtholly-Boss/README.md`](https://github.com/Chtholly-Boss/Chtholly-Boss#readme). Edit that README to update the introduction on GitHub and this site. The browser fetches its current Markdown, sanitizes the rendered HTML, and resolves relative links against the profile repository. A bundled snapshot and static HTML keep the introduction readable when JavaScript or GitHub is unavailable.
- **Projects:** Bit-IKET's public site, the tutorials repository, and NVIDIA SASS notes. The private Bit-IKET repository is not linked.
- **Favorites:** interests from the profile README and a selection of public GitHub stars.
- **Profiles:** GitHub and the profile README. Update the cards in `index.html` as more links are added.

The tutorial project is a separate repository at https://github.com/Chtholly-Boss/tutorials. This homepage does not publish or change its Pages configuration.

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

## Publishing

GitHub Pages uses **GitHub Actions** as its source. Pushing to `main` builds with Vite and publishes `dist/` through `.github/workflows/pages.yml`.

## Assets

- Avatar: the public Chtholly-Boss GitHub avatar.
- Bit-IKET preview: a screenshot of https://chtholly-boss.github.io/bitiket/.
- DM Sans and Lora: locally hosted font files under the SIL Open Font License; licenses are included in `public/assets/fonts/`.
