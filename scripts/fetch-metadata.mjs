#!/usr/bin/env node
// Fetches stars, language and description of every portfolio repository into
// .cache/metadata.json, used by the gallery for sorting and filtering.
// Uses GITHUB_TOKEN when available (CI). Never fails the build: if GitHub can't
// be reached, the last known values are kept.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, project } from './lib/project.mjs';
import { loadDataOrExit } from './lib/data.mjs';
import { mapLimit } from './lib/concurrency.mjs';

const FILE = join(ROOT, '.cache/metadata.json');
const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const headers = {
  accept: 'application/vnd.github+json',
  'user-agent': `${project.repo} gallery builder`,
  'x-github-api-version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN && { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
};

const data = await loadDataOrExit();
const previous = await readFile(FILE, 'utf8').then(JSON.parse, () => ({ repos: {} }));
const repos = [...new Set([project.repo, ...data.portfolios.map((p) => p.repo)])];
const next = {};
let failed = 0;

await mapLimit(repos, 8, async (repo) => {
  const key = repo.toLowerCase();
  try {
    const res = await fetch(`${API}/repos/${repo}`, { headers, signal: AbortSignal.timeout(15_000) });
    if (res.status === 404) throw Object.assign(new Error('repository not found'), { gone: true });
    if (!res.ok) throw new Error(`GitHub API answered HTTP ${res.status}`);
    const info = await res.json();
    next[key] = {
      fullName: info.full_name,
      description: info.description || null,
      language: info.language || null,
      stars: info.stargazers_count,
      forks: info.forks_count,
      topics: info.topics ?? [],
      pushedAt: info.pushed_at,
      archived: info.archived,
    };
  } catch (error) {
    failed += 1;
    if (!error.gone && previous.repos[key]) next[key] = previous.repos[key];
    console.warn(`⚠ ${repo}: ${error.message}${next[key] ? ' (keeping previous values)' : ''}`);
  }
});

const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
await mkdir(join(ROOT, '.cache'), { recursive: true });
await writeFile(FILE, `${JSON.stringify({ fetchedAt: new Date().toISOString(), repos: sorted }, null, 2)}\n`);
console.log(`✔ Metadata for ${repos.length - failed}/${repos.length} repositories saved to .cache/metadata.json`);
