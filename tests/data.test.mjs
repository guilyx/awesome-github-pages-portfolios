import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadData, loadPortfolios } from '../scripts/lib/data.mjs';

/** Create a throwaway data/ folder and load it. */
async function load(portfolios, { tools = '[]', articles = '[]' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'agpp-'));
  try {
    await mkdir(join(root, 'data/portfolios'), { recursive: true });
    await writeFile(join(root, 'data/tools.yml'), tools);
    await writeFile(join(root, 'data/articles.yml'), articles);
    for (const [name, content] of Object.entries(portfolios)) {
      await writeFile(join(root, 'data/portfolios', name), content);
    }
    return await loadData({ root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const valid = 'name: Jane Doe\nrepo: jane/jane.github.io\ndemo: https://jane.github.io/\n';
const messages = (result) => result.problems.map((p) => `${p.file}:${p.line} ${p.message}`);

test('the real data in this repository is valid', async () => {
  const { problems, entries } = await loadPortfolios();
  assert.deepEqual(problems, []);
  assert.ok(entries.length > 0);
});

test('accepts a minimal entry and fills in the added date', async () => {
  const result = await load({ 'jane-doe.yml': valid });
  assert.deepEqual(result.problems, []);
  assert.equal(result.portfolios[0].slug, 'jane-doe');
  assert.match(result.portfolios[0].added, /^\d{4}-\d{2}-\d{2}$/);
});

test('accepts every optional field', async () => {
  const result = await load({
    'jane-doe.yml': `${valid}description: A minimal dark portfolio built with Astro.\ntags: [astro, minimal, dark-mode]\nadded: 2024-01-31\n`,
  });
  assert.deepEqual(result.problems, []);
  assert.equal(result.portfolios[0].added, '2024-01-31');
});

test('reports missing fields', async () => {
  const result = await load({ 'jane-doe.yml': 'name: Jane Doe\nrepo: jane/site\n' });
  assert.deepEqual(messages(result), ['data/portfolios/jane-doe.yml:1 missing required field "demo"']);
});

test('reports unknown fields on the right line', async () => {
  const result = await load({ 'jane-doe.yml': `${valid}website: https://jane.dev\n` });
  assert.equal(result.problems.length, 1);
  assert.equal(result.problems[0].line, 4);
  assert.match(result.problems[0].message, /unknown field "website"/);
});

test('rejects a full URL in repo and http:// demos', async () => {
  const result = await load({
    'jane-doe.yml': 'name: Jane Doe\nrepo: https://github.com/jane/site\ndemo: http://jane.dev\n',
  });
  assert.deepEqual(
    result.problems.map((p) => [p.line, p.message.split(' ')[0]]),
    [
      [2, '"repo"'],
      [3, '"demo"'],
    ],
  );
});

test('rejects bad tags, dates and descriptions', async () => {
  const result = await load({
    'jane-doe.yml': `${valid}tags: [React]\nadded: 2024-02-30\ndescription: short\n`,
  });
  assert.deepEqual(
    result.problems.map((p) => p.message.split(' ')[0]).sort(),
    ['"added"', '"description"', '"tags"'],
  );
});

test('rejects dates in the future', async () => {
  const result = await load({ 'jane-doe.yml': `${valid}added: 2999-01-01\n` });
  assert.match(messages(result)[0], /cannot be in the future/);
});

test('rejects markdown or HTML characters in names', async () => {
  const result = await load({ 'jane-doe.yml': valid.replace('Jane Doe', 'Jane | <b>Doe</b>') });
  assert.match(messages(result)[0], /"name"/);
});

test('rejects template placeholders and the template file name', async () => {
  const result = await load({
    'your-name.yml': 'name: Your Name\nrepo: your-username/your-username.github.io\ndemo: https://your-username.github.io/\n',
  });
  assert.equal(result.problems.length, 4);
});

test('rejects the repository page used as the demo', async () => {
  const result = await load({ 'jane-doe.yml': valid.replace('https://jane.github.io/', 'https://github.com/jane/jane.github.io') });
  assert.match(messages(result)[0], /must be the live site/);
});

test('rejects bad file names', async () => {
  const result = await load({ 'Jane_Doe.yml': valid, 'jane.yaml': valid });
  assert.equal(result.problems.length, 2);
});

test('reports YAML syntax errors with a line number', async () => {
  const result = await load({ 'jane-doe.yml': 'name: Jane\nrepo: [oops\n' });
  assert.match(messages(result)[0], /^data\/portfolios\/jane-doe\.yml:\d+ YAML syntax error/);
});

test('detects duplicate repositories and demos regardless of case or trailing slash', async () => {
  const result = await load({
    'jane-doe.yml': valid,
    'jane-again.yml': 'name: Jane Again\nrepo: JANE/jane.github.io\ndemo: https://other.dev\n',
    'jane-copy.yml': 'name: Jane Copy\nrepo: jane/copy\ndemo: https://Jane.github.io\n',
  });
  // Files load alphabetically, so jane-doe.yml is the one flagged as the duplicate.
  assert.deepEqual(result.problems.map((p) => p.message), [
    '"repo" is already listed in data/portfolios/jane-again.yml',
    '"demo" is already listed in data/portfolios/jane-copy.yml',
  ]);
  assert.ok(result.problems.every((p) => p.file === 'data/portfolios/jane-doe.yml'));
});

test('validates tools and articles', async () => {
  const result = await load({}, { tools: '- name: Tool\n  url: ftp://nope\n', articles: '- url: https://x.dev\n' });
  assert.equal(result.problems.length, 2);
});

test('sorts portfolios alphabetically, ignoring case and accents', async () => {
  const result = await load({
    'b.yml': 'name: émile\nrepo: a/b\ndemo: https://b.dev\n',
    'a.yml': 'name: Zed\nrepo: a/a\ndemo: https://a.dev\n',
    'c.yml': 'name: alice\nrepo: a/c\ndemo: https://c.dev\n',
  });
  assert.deepEqual(result.portfolios.map((p) => p.name), ['alice', 'émile', 'Zed']);
});

test('allows several entries from one repository when their branches differ', async () => {
  const result = await load({
    'a.yml': 'name: Design A\nrepo: jane/site\nbranch: design-a\ndemo: https://a.dev\n',
    'b.yml': 'name: Design B\nrepo: jane/site\nbranch: feat/design-b\ndemo: https://b.dev\n',
    'c.yml': 'name: Main\nrepo: jane/site\ndemo: https://c.dev\n',
  });
  assert.deepEqual(result.problems, []);
  assert.equal(result.portfolios.length, 3);
});

test('rejects the same repository and branch twice, and invalid branch names', async () => {
  const result = await load({
    'a.yml': 'name: Design A\nrepo: jane/site\nbranch: design-a\ndemo: https://a.dev\n',
    'b.yml': 'name: Design B\nrepo: JANE/site\nbranch: design-a\ndemo: https://b.dev\n',
    'c.yml': 'name: Design C\nrepo: jane/site\nbranch: bad branch\ndemo: https://c.dev\n',
  });
  assert.deepEqual(messages(result), [
    'data/portfolios/c.yml:3 "branch" must be a valid git branch name, e.g. gh-pages or feat/dark-theme',
    'data/portfolios/b.yml:2 "repo" is already listed in data/portfolios/a.yml',
  ]);
});
