#!/usr/bin/env node
// Builds the static gallery into dist/.
//
// Inputs: data/ (required), plus optional caches produced by earlier steps:
//   .cache/metadata.json          GitHub stars, language… (npm run metadata)
//   .cache/previews/manifest.json screenshots           (npm run previews)
//   .cache/og.png                 social preview image   (npm run previews)
// Everything optional degrades gracefully: missing screenshots become placeholders.
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ROOT, project, newEntryUrl } from './lib/project.mjs';
import { loadDataOrExit } from './lib/data.mjs';
import { displayUrl, formatMonth, githubUrl, today } from './lib/format.mjs';
import { languageColor } from '../site/templates/languages.mjs';
import { renderIndex } from '../site/templates/index.mjs';
import { renderGuide } from '../site/templates/guide.mjs';
import { renderNotFound } from '../site/templates/not-found.mjs';

const DIST = join(ROOT, 'dist');
const CACHE = join(ROOT, '.cache');
const NEW_FOR_DAYS = 30;

const readJson = (path, fallback) =>
  readFile(path, 'utf8').then(JSON.parse, () => fallback);
const exists = (path) => access(path).then(() => true, () => false);
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex').slice(0, 10);
const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slugify = (text) => fold(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Placeholder colour per slug: FNV-1a plus a murmur3 finaliser, so near-identical
// slugs (…-v1, …-v2) still get clearly different hues.
function hue(text) {
  let h = [...text].reduce((acc, c) => Math.imul(acc ^ c.charCodeAt(0), 16777619), 2166136261);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) % 360;
}
const initials = (name) =>
  name
    .split(/[\s-]+/)
    .filter((w) => /^\p{L}|\d/u.test(w))
    .slice(0, 2)
    .map((w) => [...w][0].toUpperCase())
    .join('');
const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const data = await loadDataOrExit();
const metadata = await readJson(join(CACHE, 'metadata.json'), { repos: {} });
const previews = await readJson(join(CACHE, 'previews/manifest.json'), {});
const hasMetadata = Object.keys(metadata.repos).length > 0;

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, 'previews'), { recursive: true });
await mkdir(join(DIST, 'guide'), { recursive: true });

// Static assets, with a content hash in the URL so updates are never stale.
await cp(join(ROOT, 'site/assets'), join(DIST, 'assets'), { recursive: true });
const assets = {};
for (const name of ['styles.css', 'app.js']) {
  assets[name] = `assets/${name}?v=${hash(await readFile(join(ROOT, 'site/assets', name)))}`;
}

// View models for the templates.
const newSince = new Date(Date.now() - NEW_FOR_DAYS * 86_400_000).toISOString().slice(0, 10);
const portfolios = [];
for (const p of data.portfolios) {
  const meta = metadata.repos[p.repo.toLowerCase()] ?? {};
  const shot = previews[p.slug];
  let preview = null;
  if (shot?.file && (await exists(join(CACHE, 'previews', shot.file)))) {
    const source = join(CACHE, 'previews', shot.file);
    await cp(source, join(DIST, 'previews', shot.file));
    preview = `previews/${shot.file}?v=${hash(await readFile(source))}`;
  }
  const language = meta.language ?? null;
  const tags = p.tags ?? [];
  const host = displayUrl(p.demo).split('/')[0];
  const description = truncate((p.description ?? meta.description ?? '').trim(), 160);
  portfolios.push({
    slug: p.slug,
    name: p.name,
    repo: p.repo,
    branch: p.branch ?? null,
    repoUrl: githubUrl(p.repo, p.branch),
    demo: p.demo,
    host,
    description,
    tags,
    added: p.added,
    addedLabel: formatMonth(p.added),
    isNew: p.added >= newSince,
    language,
    languageColor: languageColor(language),
    stars: meta.stars ?? null,
    pushedAt: meta.pushedAt ?? null,
    preview,
    hue: hue(p.slug),
    initials: initials(p.name) || '?',
    filters: [...(language ? [`lang:${slugify(language)}`] : []), ...tags.map((t) => `tag:${t}`)],
    searchText: fold([p.name, p.repo, displayUrl(p.demo), description, language ?? '', ...tags].join(' ')),
  });
}
portfolios.sort((a, b) => b.added.localeCompare(a.added) || a.name.localeCompare(b.name));

// Filter chips: up to 10 languages then 12 tags, most common first.
const chips = new Map();
for (const p of portfolios) {
  if (p.language) {
    const id = `lang:${slugify(p.language)}`;
    const chip = chips.get(id) ?? { id, label: p.language, color: p.languageColor, count: 0 };
    chips.set(id, { ...chip, count: chip.count + 1 });
  }
  for (const tag of p.tags) {
    const chip = chips.get(`tag:${tag}`) ?? { id: `tag:${tag}`, label: `#${tag}`, count: 0 };
    chips.set(chip.id, { ...chip, count: chip.count + 1 });
  }
}
const topChips = (prefix, limit) =>
  [...chips.values()]
    .filter((chip) => chip.id.startsWith(prefix))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
const filters = [...topChips('lang:', 10), ...topChips('tag:', 12)];

// Hero: three previews, preferring the most starred sites that have a screenshot.
const showcase = [...portfolios]
  .sort((a, b) => Number(Boolean(b.preview)) - Number(Boolean(a.preview)) || (b.stars ?? 0) - (a.stars ?? 0))
  .slice(0, 3);

const hasOgImage = await exists(join(CACHE, 'og.png'));
if (hasOgImage) await cp(join(CACHE, 'og.png'), join(DIST, 'og.png'));

const ctx = {
  project,
  assets,
  portfolios,
  tools: data.tools,
  articles: data.articles,
  filters,
  showcase,
  hasMetadata,
  hasOgImage,
  newEntryUrl: newEntryUrl(),
  repoStars: metadata.repos[project.repo.toLowerCase()]?.stars ?? null,
  buildLabel: formatMonth(today()),
  stats: {
    stars: portfolios.reduce((sum, p) => sum + (p.stars ?? 0), 0),
    languages: new Set(portfolios.map((p) => p.language).filter(Boolean)).size,
  },
};

const basePath = new URL(project.siteUrl).pathname;
await writeFile(join(DIST, 'index.html'), String(renderIndex({ ...ctx, base: '' })));
await writeFile(join(DIST, 'guide/index.html'), String(renderGuide({ ...ctx, base: '../' })));
// 404.html is served for any missing path, so it needs absolute URLs.
await writeFile(join(DIST, '404.html'), String(renderNotFound({ ...ctx, base: basePath })));

// Machine-readable feed of the list.
const absolute = (path) => new URL(path, project.siteUrl).href;
await writeFile(
  join(DIST, 'portfolios.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: project.repoUrl,
      count: portfolios.length,
      portfolios: [...portfolios]
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
        .map((p) => ({
          name: p.name,
          slug: p.slug,
          repo: p.repo,
          branch: p.branch,
          repoUrl: p.repoUrl,
          demo: p.demo,
          description: p.description || null,
          tags: p.tags,
          added: p.added,
          language: p.language,
          stars: p.stars,
          preview: p.preview ? absolute(p.preview.split('?')[0]) : null,
        })),
    },
    null,
    2,
  )}\n`,
);

await writeFile(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${absolute('./')}</loc><lastmod>${today()}</lastmod></url>
  <url><loc>${absolute('guide/')}</loc><lastmod>${today()}</lastmod></url>
</urlset>
`,
);
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml')}\n`);
await writeFile(join(DIST, '.nojekyll'), '');

const withPreview = portfolios.filter((p) => p.preview).length;
console.log(
  `✔ Built dist/ with ${portfolios.length} portfolios (${withPreview} screenshots, ${hasMetadata ? 'with' : 'without'} GitHub metadata).`,
);
