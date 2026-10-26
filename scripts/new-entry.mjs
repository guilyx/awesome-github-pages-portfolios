#!/usr/bin/env node
// Interactive helper that creates data/portfolios/<slug>.yml.
//   npm run new
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import YAML from 'yaml';
import { ROOT } from './lib/project.mjs';
import { PORTFOLIOS_DIR, loadPortfolios } from './lib/data.mjs';
import { today } from './lib/format.mjs';

const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const rl = createInterface({ input, output, terminal: input.isTTY });
const lines = rl[Symbol.asyncIterator]();
async function ask(question, fallback = '') {
  output.write(question);
  const { value = '' } = await lines.next();
  return value.trim() || fallback;
}

console.log('Add a portfolio to the list. Press Enter to skip optional fields.\n');
const name = await ask('Name (your name or the template name): ');
let repo = await ask('GitHub repository (owner/name or URL): ');
repo = repo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$|\/+$/g, '');
const demo = await ask('Live site URL (https://…): ');
const description = await ask('Description (optional, 10-160 chars): ');
const tags = (await ask('Tags (optional, comma separated, e.g. react, minimal): '))
  .split(',')
  .map((t) => slugify(t))
  .filter(Boolean);
let slug = await ask(`File name [${slugify(name)}]: `, slugify(name));
slug = slugify(slug.replace(/\.ya?ml$/, ''));
rl.close();

const file = join(ROOT, PORTFOLIOS_DIR, `${slug}.yml`);
if (existsSync(file)) {
  console.error(`\n✖ ${PORTFOLIOS_DIR}/${slug}.yml already exists. Run again and pick another file name.`);
  process.exit(1);
}

const entry = { name, repo, demo };
if (description) entry.description = description;
if (tags.length) entry.tags = tags;
entry.added = today();

const doc = new YAML.Document(entry);
const tagsNode = doc.get('tags', true);
if (tagsNode) tagsNode.flow = true; // tags: [react, minimal]
await writeFile(file, `# yaml-language-server: $schema=../../schema/portfolio.schema.json\n${doc.toString({ flowCollectionPadding: false })}`);

const { problems } = await loadPortfolios();
const mine = problems.filter((p) => p.file.endsWith(`/${slug}.yml`));
if (mine.length) {
  console.error(`\nCreated ${PORTFOLIOS_DIR}/${slug}.yml, but it needs fixing:`);
  for (const p of mine) console.error(`  ✖ line ${p.line}: ${p.message}`);
  process.exit(1);
}
console.log(`\n✔ Created ${PORTFOLIOS_DIR}/${slug}.yml`);
console.log('Next: commit this file and open a pull request. CI does the rest.');
