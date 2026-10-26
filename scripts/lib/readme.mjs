import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, project, newEntryUrl } from './project.mjs';
import { displayUrl, escapeLinkText, escapeTableCell, githubUrl } from './format.mjs';

export const README_TEMPLATE = 'templates/README.md';

const NOTICE = `<!--
  ⚠️ This file is generated. Do not edit it by hand: your changes would be overwritten.
  - To add or change a portfolio, edit the files in data/ (see CONTRIBUTING.md).
  - To change the surrounding text, edit ${README_TEMPLATE}.
  CI regenerates this file on every push to the default branch.
-->
`;

function portfolioTable(portfolios) {
  const rows = portfolios.map(
    ({ name, repo, demo }) =>
      `| ${escapeTableCell(name)} | [${escapeLinkText(repo)}](${githubUrl(repo)}) | [${escapeLinkText(displayUrl(demo))}](${demo}) |`,
  );
  return ['| Name | Repository | Live Demo |', '| --- | --- | --- |', ...rows].join('\n');
}

function linkList(items, { quote = false } = {}) {
  return items
    .map(({ name, url, author, description }) => {
      const text = quote ? `"${name}"` : name;
      let line = `- [${escapeLinkText(text)}](${url})`;
      if (description) line += ` - ${description}`;
      if (author) line += ` - *${author}*`;
      return line;
    })
    .join('\n');
}

/** Render README.md from the template and the data. */
export async function renderReadme({ portfolios, tools, articles }) {
  const template = await readFile(join(ROOT, README_TEMPLATE), 'utf8');
  const values = {
    title: project.title,
    tagline: project.tagline,
    repo: project.repo,
    branch: project.branch,
    site_url: project.siteUrl,
    new_entry_url: newEntryUrl(),
    count: String(portfolios.length),
    portfolios: portfolioTable(portfolios),
    tools: linkList(tools),
    articles: linkList(articles, { quote: true }),
  };
  const body = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`Unknown placeholder ${match} in ${README_TEMPLATE}`);
    return values[key];
  });
  return NOTICE + body;
}
