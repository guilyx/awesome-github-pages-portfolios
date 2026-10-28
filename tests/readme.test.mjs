import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReadme } from '../scripts/lib/readme.mjs';
import { loadData } from '../scripts/lib/data.mjs';
import { displayUrl, escapeLinkText, escapeTableCell, formatCount, githubUrl } from '../scripts/lib/format.mjs';

test('displayUrl strips protocol, query, hash and trailing slash', () => {
  assert.equal(displayUrl('https://Example.GitHub.io/'), 'example.github.io');
  assert.equal(displayUrl('https://site.dev/a/b/?x=1#/home'), 'site.dev/a/b');
});

test('githubUrl links to a branch when one is given', () => {
  assert.equal(githubUrl('jane/site'), 'https://github.com/jane/site');
  assert.equal(githubUrl('jane/site', 'feat/dark theme'), 'https://github.com/jane/site/tree/feat/dark%20theme');
});

test('markdown escaping keeps tables intact', () => {
  assert.equal(escapeTableCell('a | b'), 'a \\| b');
  assert.equal(escapeLinkText('[x]'), '\\[x\\]');
});

test('formatCount abbreviates thousands', () => {
  assert.deepEqual([999, 1000, 1250, 15_400].map(formatCount), ['999', '1k', '1.3k', '15k']);
});

test('README lists every portfolio once, alphabetically, in a table', async () => {
  const data = await loadData();
  const readme = await renderReadme(data);
  const rows = readme.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Name') && !l.startsWith('| ---'));
  assert.equal(rows.length, data.portfolios.length);
  for (const p of data.portfolios) assert.ok(readme.includes(`(${githubUrl(p.repo, p.branch)})`), p.repo);
  assert.match(readme, /^<!--\n {2}⚠️ This file is generated/);
  assert.doesNotMatch(readme, /\{\{/);
});

test('README rendering is deterministic', async () => {
  const data = await loadData();
  assert.equal(await renderReadme(data), await renderReadme(data));
});
