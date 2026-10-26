import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/** Absolute path to the repository root. */
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const config = JSON.parse(readFileSync(join(ROOT, 'awesome.config.json'), 'utf8'));

const withSlash = (url) => (url.endsWith('/') ? url : `${url}/`);

/**
 * Project settings from awesome.config.json. SITE_URL overrides the site URL
 * (the deploy workflow passes the URL reported by GitHub Pages).
 */
export const project = {
  ...config,
  siteUrl: withSlash(process.env.SITE_URL || config.siteUrl),
  repoUrl: `https://github.com/${config.repo}`,
};

/**
 * Link that opens GitHub's "create new file" editor with a pre-filled entry.
 * GitHub forks the repository for the visitor automatically if needed.
 */
export function newEntryUrl() {
  const template = [
    '# yaml-language-server: $schema=../../schema/portfolio.schema.json',
    'name: Your Name',
    'repo: your-username/your-username.github.io',
    'demo: https://your-username.github.io/',
    '# Optional:',
    '# description: One line about your portfolio (10-160 characters).',
    '# tags: [react, minimal, dark]',
    '',
  ].join('\n');
  // Parentheses are encoded too so the URL is safe inside Markdown links.
  const value = encodeURIComponent(template).replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const query = `filename=your-name.yml&value=${value}`;
  return `${project.repoUrl}/new/${project.branch}/data/portfolios?${query}`;
}
