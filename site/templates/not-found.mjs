import { html } from './html.mjs';
import { icons } from './icons.mjs';
import { layout } from './layout.mjs';

export function renderNotFound(ctx) {
  const body = html`
    <section class="page-hero not-found">
      <div class="container">
        <p class="eyebrow">404</p>
        <h1>This page wandered off</h1>
        <p class="lead">The page you are looking for does not exist, but there are plenty of portfolios that do.</p>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="${ctx.base}">Back to the gallery ${icons.arrow}</a>
        </div>
      </div>
    </section>`;
  return layout(ctx, { page: '404', path: '404.html', title: 'Page not found', description: 'Page not found.', body });
}
