#!/usr/bin/env node
// Regenerates README.md from data/ and templates/README.md.
//   npm run readme            write README.md
//   npm run readme -- --check exit 1 if README.md is out of date
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from './lib/project.mjs';
import { loadDataOrExit } from './lib/data.mjs';
import { renderReadme } from './lib/readme.mjs';

const { values: args } = parseArgs({ options: { check: { type: 'boolean', default: false } } });

const readmePath = join(ROOT, 'README.md');
const data = await loadDataOrExit();
const next = await renderReadme(data);
const current = await readFile(readmePath, 'utf8').catch(() => '');

if (args.check) {
  if (current !== next) {
    console.error('README.md is out of date. Run "npm run readme" to regenerate it.');
    process.exit(1);
  }
  console.log('README.md is up to date.');
} else if (current === next) {
  console.log(`README.md is already up to date (${data.portfolios.length} portfolios).`);
} else {
  await writeFile(readmePath, next);
  console.log(`README.md regenerated (${data.portfolios.length} portfolios).`);
}
