#!/usr/bin/env node
// Screenshots every portfolio's live site into .cache/previews/ and renders the
// social preview image .cache/og.png. Screenshots are reused until they are
// PREVIEW_MAX_AGE_DAYS old (default 7) or the demo URL changes.
//
//   npm run previews                     capture new, changed and stale sites
//   npm run previews -- --force          recapture everything
//   npm run previews -- --only a,b       recapture these slugs only
//
// Needs a Playwright Chromium: `npx playwright install chromium`, or point
// CHROMIUM_PATH at an existing Chrome/Chromium binary.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { ROOT, project } from './lib/project.mjs';
import { loadDataOrExit } from './lib/data.mjs';
import { mapLimit } from './lib/concurrency.mjs';
import { escapeHtml } from './lib/format.mjs';

const DIR = join(ROOT, '.cache/previews');
const MANIFEST = join(DIR, 'manifest.json');
const DAY = 86_400_000;
const MAX_AGE = Number(process.env.PREVIEW_MAX_AGE_DAYS ?? 7) * DAY;
const VIEWPORT = { width: 1280, height: 800 };
const SCALE = 0.625; // 1280×800 layout rendered as an 800×500 thumbnail
const SETTLE_MS = 2500; // let intro animations and loaders finish
const CONCURRENCY = 4;

const { values: args } = parseArgs({
  options: { force: { type: 'boolean', default: false }, only: { type: 'string' } },
});
const only = args.only ? new Set(args.only.split(',').map((s) => s.trim())) : null;

const data = await loadDataOrExit();
const manifest = await readFile(MANIFEST, 'utf8').then(JSON.parse, () => ({}));
await mkdir(DIR, { recursive: true });

// Forget screenshots of portfolios that were removed from the list.
const slugs = new Set(data.portfolios.map((p) => p.slug));
for (const [slug, shot] of Object.entries(manifest)) {
  if (slugs.has(slug)) continue;
  if (shot.file) await rm(join(DIR, shot.file), { force: true });
  delete manifest[slug];
}

const now = Date.now();
const todo = data.portfolios.filter((p) => {
  if (only) return only.has(p.slug);
  const shot = manifest[p.slug];
  return args.force || !shot?.ok || shot.url !== p.demo || now - Date.parse(shot.capturedAt) > MAX_AGE;
});

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function capture(p) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    reducedMotion: 'reduce',
    acceptDownloads: false,
  });
  const page = await context.newPage();
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
  try {
    const response = await page.goto(p.demo, { waitUntil: 'load', timeout: 30_000 });
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(SETTLE_MS);
    const file = `${p.slug}.jpg`;
    await page.screenshot({ path: join(DIR, file), type: 'jpeg', quality: 80 });
    manifest[p.slug] = { url: p.demo, file, ok: true, capturedAt: new Date().toISOString() };
    console.log(`✔ ${p.slug}`);
  } catch (error) {
    const message = error.message.split('\n')[0];
    const previous = manifest[p.slug];
    if (previous?.ok && previous.url === p.demo) {
      // Keep the last good screenshot; the next run will try again.
      manifest[p.slug] = { ...previous, lastError: message };
    } else {
      if (previous?.file) await rm(join(DIR, previous.file), { force: true });
      manifest[p.slug] = { url: p.demo, ok: false, lastError: message, capturedAt: new Date().toISOString() };
    }
    console.warn(`✖ ${p.slug}: ${message}`);
  } finally {
    await context.close();
  }
}

/** 1200×630 image used when the gallery is shared on social networks. */
async function renderOgImage() {
  const shots = [...data.portfolios]
    .filter((p) => manifest[p.slug]?.ok)
    .sort((a, b) => b.added.localeCompare(a.added))
    .slice(0, 6);
  const tiles = await Promise.all(
    shots.map(async (p) => {
      const jpeg = await readFile(join(DIR, manifest[p.slug].file));
      return `<div class="tile"><img src="data:image/jpeg;base64,${jpeg.toString('base64')}"></div>`;
    }),
  );
  while (tiles.length < 6) tiles.push(`<div class="tile empty" style="--h:${tiles.length * 55 + 230}"></div>`);
  const logo = (await readFile(join(ROOT, 'site/assets/favicon.svg'))).toString('base64');

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; overflow: hidden; font-family: Inter, "Segoe UI", system-ui, sans-serif; color: #eceef5;
      background: radial-gradient(50% 70% at 10% 0%, #3b2a8f 0%, transparent 70%), radial-gradient(40% 60% at 100% 100%, #0e5566 0%, transparent 70%), #07080c; }
    .copy { position: absolute; left: 72px; top: 0; bottom: 0; width: 560px; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
    .logo { width: 64px; height: 64px; }
    h1 { font-size: 64px; line-height: 1.02; letter-spacing: -2px; font-weight: 800; }
    h1 span { background: linear-gradient(100deg, #8b72ff, #22d3ee); -webkit-background-clip: text; color: transparent; }
    p { font-size: 26px; color: #a3a9bf; line-height: 1.35; }
    .url { font: 600 18px ui-monospace, monospace; color: #8b72ff; white-space: nowrap; }
    .grid { position: absolute; left: 650px; top: -90px; display: grid; grid-template-columns: repeat(2, 380px); gap: 22px; transform: rotate(-10deg); }
    .tile { height: 238px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,.12); box-shadow: 0 30px 60px -20px rgba(0,0,0,.7); background: #161a23; }
    .tile img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .empty { background: linear-gradient(135deg, hsl(var(--h) 60% 40%), hsl(calc(var(--h) + 50) 60% 20%)); }
  </style></head><body>
    <div class="copy">
      <img class="logo" src="data:image/svg+xml;base64,${logo}">
      <h1>Awesome GitHub Pages <span>Portfolios</span></h1>
      <p>${data.portfolios.length} portfolio templates &amp; personal sites, with live previews.</p>
      <div class="url">${escapeHtml(new URL(project.siteUrl).host + new URL(project.siteUrl).pathname)}</div>
    </div>
    <div class="grid">${tiles.join('')}</div>
  </body></html>`;

  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: join(ROOT, '.cache/og.png') });
  await page.close();
}

try {
  console.log(`Capturing ${todo.length} of ${data.portfolios.length} sites (others are up to date)…`);
  await mapLimit(todo, CONCURRENCY, capture);
  await renderOgImage();
} finally {
  await browser.close();
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
}

const failed = data.portfolios.filter((p) => !manifest[p.slug]?.ok);
console.log(`✔ ${data.portfolios.length - failed.length}/${data.portfolios.length} sites have a screenshot.`);
if (failed.length) console.log(`  Without screenshot: ${failed.map((p) => p.slug).join(', ')}`);
