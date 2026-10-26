import { html, raw } from './html.mjs';
import { icons } from './icons.mjs';
import { layout } from './layout.mjs';
import { yamlSnippet } from './snippet.mjs';
import { formatCount } from '../../scripts/lib/format.mjs';

const ext = raw('target="_blank" rel="noopener"');

function preview(p, { size = 'card' } = {}) {
  if (p.preview) {
    return html`<img src="${p.preview}" alt="" width="800" height="500" loading="${size === 'hero' ? 'eager' : 'lazy'}" decoding="async">`;
  }
  return html`<div class="placeholder" style="--h:${p.hue}"><span>${p.initials}</span></div>`;
}

function card(p) {
  return html`
      <article class="card" id="${p.slug}" data-name="${p.name.toLowerCase()}" data-added="${p.added}" data-stars="${p.stars ?? 0}" data-updated="${p.pushedAt ?? ''}" data-filters="${p.filters.join(' ')}" data-search="${p.searchText}">
        <a class="card-media" href="${p.demo}" ${ext} tabindex="-1" aria-hidden="true">
          <span class="chrome"><i></i><i></i><i></i><span>${p.host}</span></span>
          <span class="shot">${preview(p)}</span>
          ${p.isNew && html`<span class="badge-new">New</span>`}
        </a>
        <div class="card-body">
          <h3 class="card-title"><a href="${p.demo}" ${ext}>${p.name}</a></h3>
          ${p.description && html`<p class="card-desc">${p.description}</p>`}
          <p class="card-meta">
            ${p.language && html`<span class="lang"><i style="--c:${p.languageColor}"></i>${p.language}</span>`}
            ${p.stars != null && html`<span class="stars" title="${p.stars} GitHub stars">${icons.star}${formatCount(p.stars)}</span>`}
            <span title="Added on ${p.added}">Added ${p.addedLabel}</span>
          </p>
          ${p.tags.length > 0 && html`<ul class="tags" aria-label="Tags">${p.tags.map((t) => html`<li>${t}</li>`)}</ul>`}
          <div class="card-actions">
            <a class="btn btn-primary btn-sm" href="${p.demo}" ${ext}>Visit site ${icons.external}</a>
            <a class="btn btn-ghost btn-sm" href="${p.repoUrl}" ${ext}>${icons.github} Source</a>
          </div>
        </div>
      </article>`;
}

function linkCard(item) {
  return html`
          <li>
            <a class="link-card" href="${item.url}" ${ext}>
              <span class="link-title">${item.name}</span>
              ${item.description && html`<span class="muted">${item.description}</span>`}
              ${item.author && html`<span class="link-author">${item.author}</span>`}
            </a>
          </li>`;
}

export function renderIndex(ctx) {
  const { portfolios, tools, articles, filters, stats, project } = ctx;
  const showcase = ctx.showcase;

  const body = html`
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <p class="eyebrow"><span class="dot"></span>${portfolios.length} portfolios · updated ${ctx.buildLabel}</p>
          <h1>Portfolios that live on <span class="gradient-text">GitHub&nbsp;Pages</span></h1>
          <p class="lead">${project.tagline} Open source, free to host, ready to fork.</p>
          <div class="cta-row">
            <a class="btn btn-primary btn-lg" href="#gallery">Browse the gallery ${icons.arrow}</a>
            <a class="btn btn-ghost btn-lg" href="guide/">Build &amp; add yours</a>
          </div>
          <dl class="stats">
            <div><dt>Portfolios</dt><dd>${portfolios.length}</dd></div>
            ${stats.stars > 0 && html`<div><dt>Combined stars</dt><dd>${formatCount(stats.stars)}</dd></div>`}
            ${stats.languages > 0 && html`<div><dt>Languages</dt><dd>${stats.languages}</dd></div>`}
            <div><dt>Hosting cost</dt><dd>$0</dd></div>
          </dl>
        </div>
        <div class="hero-visual" aria-hidden="true">
          ${showcase.map(
            (p, i) => html`<div class="window window-${i + 1}">
            <span class="chrome"><i></i><i></i><i></i><span>${p.host}</span></span>
            <span class="shot">${preview(p, { size: 'hero' })}</span>
          </div>`,
          )}
        </div>
      </div>
    </section>

    <section id="gallery" class="section">
      <div class="container">
        <div class="section-head">
          <h2>Gallery</h2>
          <p class="muted">Search, filter and open any site in one click.</p>
        </div>
        <div class="toolbar">
          <label class="search">
            ${icons.search}
            <span class="sr-only">Search portfolios</span>
            <input id="search" type="search" placeholder="Search by name, language, tag…" autocomplete="off" spellcheck="false">
            <kbd aria-hidden="true">/</kbd>
          </label>
          <label class="select">
            <span class="sr-only">Sort by</span>
            <select id="sort">
              <option value="added">Recently added</option>
              ${ctx.hasMetadata && html`<option value="stars">Most stars</option><option value="updated">Recently updated</option>`}
              <option value="name">Name (A–Z)</option>
            </select>
          </label>
        </div>
        ${filters.length > 0 && html`
        <div class="chips" role="group" aria-label="Filter by language or tag">
          <button class="chip" type="button" data-filter="" aria-pressed="true">All</button>
          ${filters.map(
            (f) => html`<button class="chip" type="button" data-filter="${f.id}" aria-pressed="false">${f.color && html`<i style="--c:${f.color}"></i>`}${f.label}<span class="chip-count">${f.count}</span></button>`,
          )}
        </div>`}
        <p class="result-count" aria-live="polite"><span id="count">${portfolios.length}</span> of ${portfolios.length} portfolios</p>
        <div class="grid" id="grid">${portfolios.map(card)}
        </div>
        <div class="empty" id="empty" hidden>
          <p>No portfolio matches your search.</p>
          <button class="btn btn-ghost" type="button" data-clear>Clear filters</button>
        </div>
      </div>
    </section>

    <section id="resources" class="section">
      <div class="container resources">
        <div>
          <h2>Tools</h2>
          <ul class="link-list">${tools.map(linkCard)}
          </ul>
        </div>
        <div>
          <h2>Articles</h2>
          <ul class="link-list">${articles.map(linkCard)}
          </ul>
        </div>
      </div>
    </section>

    <section id="add" class="section">
      <div class="container">
        <div class="cta-band">
          <div class="cta-copy">
            <p class="eyebrow">Contribute</p>
            <h2>Add your portfolio in two minutes</h2>
            <p class="muted">No README editing. Create one small YAML file: CI checks it, regenerates the list and redeploys this site with a fresh screenshot of yours.</p>
            <ol class="mini-steps">
              <li><span><b>Create</b> <code>data/portfolios/your-name.yml</code></span></li>
              <li><span><b>Open</b> a pull request</span></li>
              <li><span><b>Merge</b>: you're in the gallery 🎉</span></li>
            </ol>
            <div class="cta-row">
              <a class="btn btn-primary" href="${ctx.newEntryUrl}" ${ext}>Create my entry ${icons.external}</a>
              <a class="btn btn-ghost" href="guide/#submit">Step-by-step tutorial</a>
            </div>
          </div>
          ${yamlSnippet()}
        </div>
      </div>
    </section>`;

  return layout(ctx, {
    page: 'gallery',
    path: './',
    title: '',
    description: `${portfolios.length} portfolio templates and personal sites hosted on GitHub Pages, with live previews. ${project.tagline}`,
    body,
  });
}
