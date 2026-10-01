import './style.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import fallbackReadme from './profile-fallback.md?raw';

const profileRepository = 'https://github.com/Chtholly-Boss/Chtholly-Boss';
const rawBase = 'https://raw.githubusercontent.com/Chtholly-Boss/Chtholly-Boss/main/';
const intro = document.querySelector('#profile-readme');

function renderReadme(markdown) {
  const clean = DOMPurify.sanitize(marked.parse(markdown, { gfm: true }), {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'br', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'del'],
    ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'width', 'height'],
  });
  const template = document.createElement('template');
  template.innerHTML = clean;
  template.content.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!/^[a-z][a-z\d+.-]*:/i.test(href) && !href.startsWith('//')) {
      link.href = new URL(href.replace(/^\//, ''), `${profileRepository}/blob/main/`).href;
    }
    link.rel = 'noopener noreferrer';
  });
  template.content.querySelectorAll('img[src]').forEach((image) => {
    const src = image.getAttribute('src');
    if (!/^[a-z][a-z\d+.-]*:/i.test(src) && !src.startsWith('//')) image.src = new URL(src.replace(/^\//, ''), rawBase).href;
    image.loading = 'lazy';
  });
  intro.replaceChildren(template.content);
}

renderReadme(fallbackReadme);
document.documentElement.dataset.profileSource = 'fallback';

async function refreshIntroduction() {
  const sources = [
    { url: `${rawBase}README.md` },
    { url: 'https://api.github.com/repos/Chtholly-Boss/Chtholly-Boss/readme', headers: { Accept: 'application/vnd.github.raw+json' } },
  ];
  for (const source of sources) {
    try {
      const response = await fetch(source.url, { headers: source.headers, cache: 'no-cache', signal: AbortSignal.timeout(6000) });
      if (!response.ok) continue;
      const markdown = await response.text();
      if (!markdown.trim()) continue;
      renderReadme(markdown);
      document.documentElement.dataset.profileSource = 'github';
      return;
    } catch {
      // The introduction stays readable from its bundled snapshot.
    }
  }
}
refreshIntroduction();

const copyButton = document.querySelector('#copy-link');
copyButton.hidden = false;
const copyLabel = copyButton.querySelector('span');
const copyStatus = document.querySelector('#copy-status');
let labelTimeout;
copyButton.addEventListener('click', async () => {
  clearTimeout(labelTimeout);
  try {
    await navigator.clipboard.writeText('https://chtholly-boss.github.io/');
    copyLabel.textContent = 'Link copied!';
    copyStatus.textContent = 'Homepage link copied to the clipboard.';
  } catch {
    copyLabel.textContent = 'chtholly-boss.github.io';
    copyStatus.textContent = 'Copy this address: https://chtholly-boss.github.io/';
  }
  labelTimeout = setTimeout(() => { copyLabel.textContent = 'Copy this page’s link'; }, 3500);
});

const navLinks = [...document.querySelectorAll('.header-nav a')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-10% 0px -50% 0px' });
document.querySelectorAll('.content-section').forEach((section) => observer.observe(section));
