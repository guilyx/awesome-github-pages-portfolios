import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ROOT } from './project.mjs';
import { byName, normalizeUrl, today } from './format.mjs';

export const PORTFOLIOS_DIR = 'data/portfolios';
export const LINK_LISTS = { tools: 'data/tools.yml', articles: 'data/articles.yml' };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);
const validatePortfolio = ajv.compile(readJson('schema/portfolio.schema.json'));
const validateLinkList = ajv.compile(readJson('schema/link-list.schema.json'));

/** Human-friendly explanations for schema failures, keyed by field name. */
const HINTS = {
  name: 'must be 2-50 characters on one line, without < > [ ] | or ` characters',
  repo: 'must be the GitHub repository written as "owner/name", e.g. octocat/octocat.github.io (not a full URL)',
  demo: 'must be the full https:// URL of the live site, e.g. https://octocat.github.io/',
  description: 'must be one line of 10-160 characters, without < > | or ` characters',
  tags: 'must be a list of at most 5 unique lowercase-kebab-case words, e.g. [react, minimal, dark-mode]',
  added: 'must be a real date written as YYYY-MM-DD',
  url: 'must be a full https:// URL',
  author: 'must be 1-60 characters',
};

/** Values copied from the template that must be replaced. */
const PLACEHOLDERS = {
  name: /^your name$/i,
  repo: /^your-username\//i,
  demo: /^https:\/\/your-username\.github\.io/i,
};

/**
 * @typedef {{ file: string, line?: number, message: string }} Problem
 * A problem found in a data file. `line` is 1-based.
 */

const pointerToPath = (pointer) =>
  pointer
    .split('/')
    .slice(1)
    .map((s) => (/^\d+$/.test(s) ? Number(s) : s.replaceAll('~1', '/').replaceAll('~0', '~')));

/** Line number of the YAML node at `path` (or its closest existing parent). */
function lineOf(doc, lineCounter, path, { key = false } = {}) {
  let node;
  if (key) {
    const parent = path.length > 1 ? doc.getIn(path.slice(0, -1), true) : doc.contents;
    node = parent?.items?.find((pair) => (pair.key?.value ?? pair.key) === path.at(-1))?.key;
  }
  for (let p = path; !node; p = p.slice(0, -1)) {
    node = p.length ? doc.getIn(p, true) : doc.contents;
    if (!p.length) break;
  }
  const offset = node?.range?.[0];
  return offset === undefined ? 1 : lineCounter.linePos(offset).line;
}

function parseYaml(text, file) {
  const lineCounter = new YAML.LineCounter();
  const doc = YAML.parseDocument(text, { lineCounter, uniqueKeys: true });
  const problems = doc.errors.map((err) => ({
    file,
    line: err.linePos?.[0]?.line ?? 1,
    message: `YAML syntax error: ${err.message.split('\n')[0]}`,
  }));
  return { doc, lineCounter, value: problems.length ? undefined : doc.toJS(), problems };
}

/** Turn Ajv errors into readable problems with line numbers. */
function schemaProblems(errors, { file, doc, lineCounter }) {
  const seen = new Set();
  const problems = [];
  for (const error of errors ?? []) {
    const path = pointerToPath(error.instancePath);
    let message;
    let line;
    if (error.keyword === 'required') {
      message = `missing required field "${error.params.missingProperty}"`;
      line = lineOf(doc, lineCounter, path);
    } else if (error.keyword === 'additionalProperties') {
      const allowed = Object.keys(error.parentSchema.properties).join(', ');
      message = `unknown field "${error.params.additionalProperty}" (allowed fields: ${allowed})`;
      line = lineOf(doc, lineCounter, [...path, error.params.additionalProperty], { key: true });
    } else if (error.keyword === 'type' && path.length === 0) {
      message = error.params.type === 'object' ? 'file must contain "key: value" fields' : 'file must contain a YAML list';
    } else {
      const field = path.findLast((s) => typeof s === 'string');
      message = HINTS[field] ? `"${field}" ${HINTS[field]}` : `"${path.join('.')}" ${error.message}`;
      line = lineOf(doc, lineCounter, path);
    }
    const id = `${line}:${message}`;
    if (!seen.has(id)) {
      seen.add(id);
      problems.push({ file, line, message });
    }
  }
  return problems;
}

/**
 * Date each portfolio file was first committed, from git history.
 * Requires a full clone (fetch-depth: 0) to be accurate in CI.
 */
function gitAddedDates(root) {
  try {
    const out = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--format=>%as', '--name-only', '--', PORTFOLIOS_DIR],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const dates = new Map();
    let date;
    // Newest commits come first, so the oldest "added" date wins.
    for (const line of out.split('\n')) {
      if (line.startsWith('>')) date = line.slice(1);
      else if (line.trim()) dates.set(line.trim(), date);
    }
    return dates;
  } catch {
    return new Map();
  }
}

/** Load and validate every file in data/portfolios/. Entries are sorted by name. */
export async function loadPortfolios({ root = ROOT } = {}) {
  const problems = [];
  const entries = [];
  const addedDates = gitAddedDates(root);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  for (const fileName of (await readdir(join(root, PORTFOLIOS_DIR))).sort()) {
    if (fileName.startsWith('.')) continue;
    const file = `${PORTFOLIOS_DIR}/${fileName}`;
    if (!fileName.endsWith('.yml')) {
      problems.push({ file, line: 1, message: 'portfolio files must use the ".yml" extension' });
      continue;
    }
    const slug = fileName.slice(0, -'.yml'.length);
    const fileProblems = [];
    if (!SLUG_RE.test(slug)) {
      fileProblems.push({
        file,
        line: 1,
        message: 'file name must be lowercase-kebab-case, e.g. "jane-doe.yml"',
      });
    }
    if (slug === 'your-name') {
      fileProblems.push({ file, line: 1, message: 'rename "your-name.yml" to something unique, e.g. "jane-doe.yml"' });
    }

    const parsed = parseYaml(await readFile(join(root, file), 'utf8'), file);
    fileProblems.push(...parsed.problems);
    const { value, doc, lineCounter } = parsed;

    if (value !== undefined && !validatePortfolio(value)) {
      fileProblems.push(...schemaProblems(validatePortfolio.errors, { file, doc, lineCounter }));
    } else if (value !== undefined) {
      const at = (field) => lineOf(doc, lineCounter, [field]);
      for (const [field, pattern] of Object.entries(PLACEHOLDERS)) {
        if (pattern.test(value[field])) {
          fileProblems.push({ file, line: at(field), message: `"${field}" still has the template placeholder - replace it with your own` });
        }
      }
      if (new URL(value.demo).hostname === 'github.com') {
        fileProblems.push({ file, line: at('demo'), message: '"demo" must be the live site, not the GitHub repository page' });
      }
      if (value.added && value.added > tomorrow) {
        fileProblems.push({ file, line: at('added'), message: '"added" cannot be in the future' });
      }
      if (!fileProblems.length) {
        entries.push({
          slug,
          file,
          ...value,
          added: value.added ?? addedDates.get(file) ?? today(),
          lines: { repo: at('repo'), demo: at('demo') },
        });
      }
    }
    problems.push(...fileProblems);
  }

  // Cross-file checks: the same repository or site must not be listed twice.
  const seen = { repo: new Map(), demo: new Map() };
  for (const entry of entries) {
    for (const [field, key] of [
      ['repo', entry.repo.toLowerCase()],
      ['demo', normalizeUrl(entry.demo)],
    ]) {
      const other = seen[field].get(key);
      if (other) {
        problems.push({ file: entry.file, line: entry.lines[field], message: `"${field}" is already listed in ${other}` });
      } else {
        seen[field].set(key, entry.file);
      }
    }
  }

  return { entries: entries.sort(byName), problems };
}

/** Load and validate a list of links (tools or articles). Order is kept as written. */
export async function loadLinkList(file, { root = ROOT } = {}) {
  const { value, doc, lineCounter, problems } = parseYaml(await readFile(join(root, file), 'utf8'), file);
  if (value !== undefined && !validateLinkList(value)) {
    problems.push(...schemaProblems(validateLinkList.errors, { file, doc, lineCounter }));
  }
  return { items: problems.length ? [] : value, problems };
}

/** Load everything in data/. */
export async function loadData({ root = ROOT } = {}) {
  const [portfolios, tools, articles] = await Promise.all([
    loadPortfolios({ root }),
    loadLinkList(LINK_LISTS.tools, { root }),
    loadLinkList(LINK_LISTS.articles, { root }),
  ]);
  return {
    portfolios: portfolios.entries,
    tools: tools.items,
    articles: articles.items,
    problems: [...portfolios.problems, ...tools.problems, ...articles.problems],
  };
}

const escapeData = (s) => String(s).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
const escapeProperty = (s) => escapeData(s).replaceAll(':', '%3A').replaceAll(',', '%2C');

/**
 * Print problems for humans. On GitHub Actions also emit annotations, which
 * show up inline on the pull request's "Files changed" tab.
 * @param {Problem[]} problems
 * @param {'error' | 'warning'} level
 */
export function reportProblems(problems, level = 'error') {
  for (const { file, line, message } of problems) {
    const where = line ? `${file}:${line}` : file;
    if (process.env.GITHUB_ACTIONS === 'true') {
      const title = level === 'error' ? 'Needs a fix' : 'Please double-check';
      const props = [`file=${escapeProperty(file)}`, line && `line=${line}`, `title=${title}`].filter(Boolean);
      console.log(`::${level} ${props.join(',')}::${escapeData(message)}`);
    }
    console.error(`${level === 'error' ? '✖' : '⚠'} ${where}  ${message}`);
  }
}

/** Load data for a build step; exit with an error if anything is invalid. */
export async function loadDataOrExit() {
  const data = await loadData();
  if (data.problems.length) {
    reportProblems(data.problems);
    console.error(`\n${data.problems.length} problem(s) found. Run "npm run validate" for details.`);
    process.exit(1);
  }
  return data;
}
