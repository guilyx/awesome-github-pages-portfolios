import { html, raw } from './html.mjs';
import { icons } from './icons.mjs';
import { formatCount } from '../../scripts/lib/format.mjs';

// Runs before first paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

/**
 * Shared page shell.
 * @param {object} ctx  build context (project, assets, base, …)
 * @param {{ title: string, description: string, path: string, body: unknown, page: string }} page
 */
export function layout(ctx, { title, description, path, body, page }) {
  const { project, base } = ctx;
  const url = new URL(path, project.siteUrl).href;
  const fullTitle = title ? `${title} · ${project.shortTitle}` : project.shortTitle;
  const nav = [
    ['gallery', `${base}#gallery`, 'Gallery'],
    ['guide', `${base}guide/`, 'Tutorial'],
    ['submit', `${base}guide/#submit`, 'Add yours'],
  ];

  return html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${project.shortTitle}">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  ${ctx.hasOgImage && html`<meta property="og:image" content="${new URL('og.png', project.siteUrl).href}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">`}
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f7fb">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#07080c">
  <link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${base}${ctx.assets['styles.css']}">
  <script>${raw(themeScript)}</script>
  <script type="module" src="${base}${ctx.assets['app.js']}"></script>
</head>
<body data-page="${page}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="${base || './'}">${icons.logo}<span>${project.shortTitle}</span></a>
      <nav class="site-nav" aria-label="Main">
        ${nav.map(([id, href, label]) => html`<a href="${href}"${page === id ? raw(' aria-current="page"') : ''}>${label}</a>`)}
      </nav>
      <div class="header-actions">
        <a class="btn btn-ghost btn-sm" href="${project.repoUrl}" rel="noopener">
          ${icons.github}<span class="hide-sm">Star</span>${ctx.repoStars != null && html`<span class="count">${formatCount(ctx.repoStars)}</span>`}
        </a>
        <button class="icon-btn" type="button" data-theme-toggle aria-label="Toggle dark mode" title="Toggle dark mode">
          <span class="icon-sun">${icons.sun}</span><span class="icon-moon">${icons.moon}</span>
        </button>
      </div>
    </div>
  </header>

  <main id="main">
${body}
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div>
        <a class="brand brand-sm" href="${base || './'}">${icons.logo}<span>${project.shortTitle}</span></a>
        <p class="muted">Community-curated, open data, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>. Screenshots are refreshed weekly.</p>
      </div>
      <nav class="footer-links" aria-label="Footer">
        <a href="${project.repoUrl}">Source on GitHub</a>
        <a href="${project.repoUrl}/blob/${project.branch}/CONTRIBUTING.md">Contributing</a>
        <a href="${project.repoUrl}/issues/new/choose">Report a problem</a>
        <a href="${base}portfolios.json">JSON data</a>
      </nav>
    </div>
  </footer>
</body>
</html>
`;
}
