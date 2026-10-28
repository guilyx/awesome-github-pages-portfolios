/** Escape text for safe use in HTML element content and quoted attributes. */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Escape text for a Markdown table cell. */
export function escapeTableCell(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');
}

/** Escape text used as Markdown link text. */
export function escapeLinkText(value) {
  return escapeTableCell(value).replace(/[[\]]/g, '\\$&');
}

/** "https://Example.com/path/?q#x" -> "example.com/path" */
export function displayUrl(url) {
  const { host, pathname } = new URL(url);
  return `${host}${pathname}`.replace(/\/+$/, '');
}

/** Normalised form of a URL used to detect duplicates. */
export function normalizeUrl(url) {
  const { host, pathname, search } = new URL(url);
  return `${host.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}${search}`.toLowerCase();
}

/** Link to a repository, or to one of its branches. */
export function githubUrl(repo, branch) {
  if (!branch) return `https://github.com/${repo}`;
  return `https://github.com/${repo}/tree/${branch.split('/').map(encodeURIComponent).join('/')}`;
}

/** Case- and accent-insensitive alphabetical order, with a stable tie-break. */
export function byName(a, b) {
  return (
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true }) ||
    a.name.localeCompare(b.name, 'en') ||
    a.repo.localeCompare(b.repo, 'en')
  );
}

/** 1234 -> "1.2k" */
export function formatCount(n) {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(n / 1000)}k`;
}

/** 2026-10-26 -> "Oct 2026" */
export function formatMonth(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const today = () => new Date().toISOString().slice(0, 10);
