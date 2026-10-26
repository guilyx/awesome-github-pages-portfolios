import { html } from './html.mjs';
import { icons } from './icons.mjs';

/** Example entry file with light syntax highlighting and a copy button. */
export function yamlSnippet({ file = 'data/portfolios/jane-doe.yml' } = {}) {
  const lines = [
    ['name', 'Jane Doe'],
    ['repo', 'janedoe/janedoe.github.io'],
    ['demo', 'https://janedoe.github.io/'],
    ['# optional'],
    ['description', 'Minimal dark portfolio built with Astro.'],
    ['tags', '[astro, minimal, dark]'],
  ];
  const text = lines.map(([k, v]) => (v ? `${k}: ${v}` : k)).join('\n');
  return html`<figure class="code-card">
            <figcaption><span>${file}</span><button class="icon-btn" type="button" data-copy="${text}" aria-label="Copy example">${icons.copy}</button></figcaption>
            <pre><code>${lines.map(([k, v], i) =>
              html`${i ? '\n' : ''}${v ? html`<span class="k">${k}</span>: <span class="v">${v}</span>` : html`<span class="c">${k}</span>`}`,
            )}</code></pre>
          </figure>`;
}
