#!/usr/bin/env node
// Validates everything in data/.
//
//   npm run validate                                   offline checks (schema, duplicates, file names)
//   npm run validate -- --online                       also check that every demo site and repository is reachable
//   npm run validate -- --online --base origin/master  only check entries changed since that ref, and make
//                                                      sure README.md was not edited by hand
import { appendFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, project } from './lib/project.mjs';
import { LINK_LISTS, loadData, reportProblems } from './lib/data.mjs';
import { renderReadme } from './lib/readme.mjs';
import { mapLimit } from './lib/concurrency.mjs';
import { escapeTableCell } from './lib/format.mjs';

const { values: args } = parseArgs({
  options: {
    online: { type: 'boolean', default: false },
    base: { type: 'string' },
  },
});

const USER_AGENT = `Mozilla/5.0 (compatible; awesome-github-pages-portfolios-bot; +${project.repoUrl})`;
const GITHUB_API = process.env.GITHUB_API_URL || 'https://api.github.com';
const token = process.env.GITHUB_TOKEN;

function changedFiles(base) {
  const out = execFileSync('git', ['diff', '--name-only', '--diff-filter=AMR', `${base}...HEAD`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return new Set(out.split('\n').filter(Boolean));
}

/** @returns {Promise<{ level: 'error' | 'warning', message: string } | null>} */
async function checkSite(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(20_000),
    });
    await res.body?.cancel();
    if (res.ok) return null;
    if ([401, 403, 429, 503].includes(res.status)) {
      return { level: 'warning', message: `${url} answered HTTP ${res.status}; it may block bots, please double-check it loads` };
    }
    return { level: 'error', message: `${url} answered HTTP ${res.status}; the live demo must be online` };
  } catch (error) {
    return { level: 'error', message: `${url} could not be reached (${error.cause?.code ?? error.name})` };
  }
}

async function checkRepo(repo) {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}`, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': USER_AGENT,
        ...(token && { authorization: `Bearer ${token}` }),
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 404) return { level: 'error', message: `repository ${repo} was not found; is it public?` };
    if (!res.ok) return { level: 'warning', message: `could not check ${repo} (GitHub API answered HTTP ${res.status})` };
    const info = await res.json();
    if (info.full_name.toLowerCase() !== repo.toLowerCase()) {
      return { level: 'warning', message: `repository ${repo} has moved to ${info.full_name}; please update "repo"` };
    }
    if (info.archived) return { level: 'warning', message: `repository ${repo} is archived` };
    return null;
  } catch (error) {
    return { level: 'warning', message: `could not check ${repo} (${error.cause?.code ?? error.name})` };
  }
}

const data = await loadData();
const problems = [...data.problems];
const warnings = [];
const changed = args.base ? changedFiles(args.base) : null;

// README.md is generated. Reject hand edits, but accept a correctly regenerated one.
if (changed?.has('README.md')) {
  const readme = await readFile(join(ROOT, 'README.md'), 'utf8');
  if (!data.problems.length && readme !== (await renderReadme(data))) {
    problems.push({
      file: 'README.md',
      line: 1,
      message:
        'README.md is generated automatically. Please revert your changes to it and add a file in data/portfolios/ instead (see CONTRIBUTING.md).',
    });
  }
}

const report = [];
if (args.online) {
  const portfolios = data.portfolios.filter((p) => !changed || changed.has(p.file));
  const links = Object.entries(LINK_LISTS)
    .filter(([, file]) => !changed || changed.has(file))
    .flatMap(([list, file]) => data[list].map((item) => ({ ...item, file })));

  const record = (result, problem) => {
    if (result) (result.level === 'error' ? problems : warnings).push({ ...problem, message: result.message });
  };

  console.log(`Checking ${portfolios.length} portfolio(s) and ${links.length} link(s) online…`);
  await mapLimit(portfolios, 6, async (p) => {
    const [site, repo] = await Promise.all([checkSite(p.demo), checkRepo(p.repo)]);
    record(site, { file: p.file, line: p.lines.demo });
    record(repo, { file: p.file, line: p.lines.repo });
    const status = [site, repo].some((r) => r?.level === 'error') ? '❌' : site || repo ? '⚠️' : '✅';
    report.push(`| ${status} | ${escapeTableCell(p.name)} | [site](${p.demo}) · [repo](https://github.com/${p.repo}) |`);
  });
  await mapLimit(links, 6, async (link) => record(await checkSite(link.url), { file: link.file }));
}

reportProblems(warnings, 'warning');
reportProblems(problems);

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [problems.length ? `### ❌ ${problems.length} problem(s) found` : '### ✅ Data is valid'];
  if (problems.length) lines.push('', ...problems.map((p) => `- \`${p.file}${p.line ? `:${p.line}` : ''}\` ${p.message}`));
  if (warnings.length) lines.push('', '#### Warnings', '', ...warnings.map((w) => `- \`${w.file}\` ${w.message}`));
  if (report.length) lines.push('', '#### Online checks', '', '| | Portfolio | Links |', '| --- | --- | --- |', ...report.sort());
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s) found. See CONTRIBUTING.md for the expected format.`);
  process.exit(1);
}
console.log(`✔ ${data.portfolios.length} portfolios, ${data.tools.length} tools and ${data.articles.length} articles are valid.`);
