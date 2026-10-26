import { html, raw } from './html.mjs';
import { icons } from './icons.mjs';
import { layout } from './layout.mjs';
import { yamlSnippet } from './snippet.mjs';

const ext = raw('target="_blank" rel="noopener"');

export function renderGuide(ctx) {
  const { project } = ctx;
  const docs = (path) => `https://docs.github.com/en/pages/${path}`;

  const toc = [
    ['publish', 'Part 1 · Publish on GitHub Pages'],
    ['step-pick', '1. Pick a starting point', true],
    ['step-repo', '2. Create your repository', true],
    ['step-edit', '3. Make it yours', true],
    ['step-pages', '4. Turn on GitHub Pages', true],
    ['step-domain', '5. Custom domain (optional)', true],
    ['step-check', '6. Final checks', true],
    ['submit', 'Part 2 · Add it to this list'],
    ['option-web', 'In your browser', true],
    ['option-cli', 'From the command line', true],
    ['fields', 'The fields', true],
    ['next', 'What happens next', true],
    ['faq', 'FAQ'],
  ];

  const body = html`
    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">Tutorial</p>
        <h1>From zero to a live portfolio, <span class="gradient-text">listed here</span></h1>
        <p class="lead">Part 1 puts your site online for free with GitHub Pages. Part 2 adds it to the gallery. About 15 minutes in total.</p>
      </div>
    </section>

    <div class="container guide">
      <aside class="toc">
        <nav aria-label="On this page">
          <p class="toc-title">On this page</p>
          <ul>${toc.map(([id, label, sub]) => html`<li${sub ? raw(' class="sub"') : ''}><a href="#${id}">${label}</a></li>`)}</ul>
        </nav>
      </aside>

      <article class="prose">
        <h2 id="publish">Part 1 · Publish your portfolio on GitHub Pages</h2>
        <p>GitHub Pages hosts static websites straight from a repository, for free, with HTTPS. Everything in the <a href="../#gallery">gallery</a> runs on it.</p>

        <ol class="steps">
          <li>
            <h3 id="step-pick">Pick a starting point</h3>
            <p>Browse the <a href="../#gallery">gallery</a> and open the source of a design you like. Check the repository's license before reusing it, and keep the credit the author asks for. You can also start from a single <code>index.html</code>.</p>
          </li>
          <li>
            <h3 id="step-repo">Create your repository</h3>
            <p>On the template's GitHub page click <b>Use this template → Create a new repository</b>, or <b>Fork</b> if there is no template button. The repository name decides the address:</p>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Repository name</th><th>Your site's URL</th></tr></thead>
                <tbody>
                  <tr><td><code>&lt;username&gt;.github.io</code></td><td><code>https://&lt;username&gt;.github.io/</code></td></tr>
                  <tr><td>anything else, e.g. <code>portfolio</code></td><td><code>https://&lt;username&gt;.github.io/portfolio/</code></td></tr>
                </tbody>
              </table>
            </div>
            <p class="callout">Each account gets one <code>&lt;username&gt;.github.io</code> site and as many project sites as it likes. The repository must be public on a free plan.</p>
          </li>
          <li>
            <h3 id="step-edit">Make it yours</h3>
            <p>Replace the template's content with yours: name, bio, projects, links, photo. Most templates keep this in one file (<code>config.js</code>, <code>_config.yml</code>, <code>data.json</code>…), so read their README first.</p>
            <p>You can edit on GitHub directly (press <kbd>.</kbd> in the repository to open the web editor) or locally. Templates with a build step usually run with <code>npm install</code> then <code>npm run dev</code>.</p>
          </li>
          <li>
            <h3 id="step-pages">Turn on GitHub Pages</h3>
            <p>In your repository open <b>Settings → Pages</b> and under <b>Build and deployment → Source</b> choose:</p>
            <ul>
              <li><b>Deploy from a branch</b> for plain HTML/CSS/JS or Jekyll sites. Pick your branch (usually <code>main</code>) and the <code>/ (root)</code> or <code>/docs</code> folder.</li>
              <li><b>GitHub Actions</b> for sites that need a build step (React, Vue, Astro, Next.js, Hugo…). GitHub suggests ready-made workflows for popular frameworks.</li>
            </ul>
            <p>A minute or two later the address of your site shows at the top of the Pages settings. <a href="${docs('getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site')}" ${ext}>GitHub docs ${icons.external}</a></p>
            <p class="callout">Using a framework on a project site? Set its base path to <code>/&lt;repository&gt;/</code> (<code>base</code> in Vite and Astro, <code>basePath</code> in Next.js), otherwise styles and scripts will not load.</p>
          </li>
          <li>
            <h3 id="step-domain">Use your own domain <span class="pill">optional</span></h3>
            <p>Enter it in <b>Settings → Pages → Custom domain</b>, then add DNS records at your domain registrar:</p>
            <ul>
              <li>Subdomain such as <code>www.example.com</code>: a <code>CNAME</code> record pointing to <code>&lt;username&gt;.github.io</code>.</li>
              <li>Apex domain such as <code>example.com</code>: four <code>A</code> records pointing to <code>185.199.108.153</code>, <code>185.199.109.153</code>, <code>185.199.110.153</code> and <code>185.199.111.153</code>.</li>
            </ul>
            <p>When the certificate is ready, tick <b>Enforce HTTPS</b>. <a href="${docs('configuring-a-custom-domain-for-your-github-pages-site')}" ${ext}>GitHub docs ${icons.external}</a></p>
          </li>
          <li>
            <h3 id="step-check">Final checks</h3>
            <ul class="checklist">
              <li>It opens over <code>https://</code> and looks right on a phone.</li>
              <li>No leftover template text, placeholder names or broken links.</li>
              <li>The page has a <code>&lt;title&gt;</code> and a meta description, so it previews well when shared.</li>
            </ul>
          </li>
        </ol>

        <h2 id="submit">Part 2 · Add it to this list</h2>
        <p>The list is generated from data: each portfolio is <b>one small YAML file</b> in <code>data/portfolios/</code>. You never edit the README. After your pull request is merged, automation regenerates it and redeploys this site.</p>

        ${yamlSnippet()}

        <h3 id="option-web">Option A · In your browser, no git needed</h3>
        <ol>
          <li>Open the <a href="${ctx.newEntryUrl}" ${ext}><b>pre-filled entry file</b> ${icons.external}</a>. GitHub forks the repository for you if needed.</li>
          <li>Rename <code>your-name.yml</code> to something unique, e.g. <code>jane-doe.yml</code> (lowercase, dashes).</li>
          <li>Replace the placeholder values with yours.</li>
          <li>Click <b>Commit changes…</b> → <b>Propose changes</b> → <b>Create pull request</b>.</li>
        </ol>

        <h3 id="option-cli">Option B · From the command line</h3>
        <p>Fork the repository, then:</p>
        <pre><code>git clone https://github.com/&lt;you&gt;/${project.repo.split('/')[1]}.git
cd ${project.repo.split('/')[1]}
npm install
npm run new        # asks a few questions and writes your file
npm run validate   # runs the same checks as CI
git switch -c add-jane-doe
git add data/portfolios/jane-doe.yml
git commit -m "Add Jane Doe's portfolio"
git push -u origin add-jane-doe</code></pre>
        <p>Then open a pull request from your fork.</p>

        <h3 id="fields">The fields</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Field</th><th>Required?</th><th>What to put</th></tr></thead>
            <tbody>
              <tr><td><code>name</code></td><td><span class="pill pill-req">required</span></td><td>Your name, your handle or the template's name.</td></tr>
              <tr><td><code>repo</code></td><td><span class="pill pill-req">required</span></td><td>The public GitHub repository as <code>owner/name</code>, not a URL.</td></tr>
              <tr><td><code>demo</code></td><td><span class="pill pill-req">required</span></td><td>The live site's full <code>https://</code> URL.</td></tr>
              <tr><td><code>description</code></td><td><span class="pill">optional</span></td><td>One line, 10-160 characters. Defaults to the repository description.</td></tr>
              <tr><td><code>tags</code></td><td><span class="pill">optional</span></td><td>Up to 5 lowercase keywords used by the gallery filters, e.g. <code>[react, minimal, dark]</code>.</td></tr>
              <tr><td><code>added</code></td><td><span class="pill">optional</span></td><td><code>YYYY-MM-DD</code>. Defaults to the date your file was first committed.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Editors with the YAML extension autocomplete and check these fields thanks to the <a href="${project.repoUrl}/blob/${project.branch}/schema/portfolio.schema.json" ${ext}>JSON schema</a>.</p>

        <h3 id="next">What happens next</h3>
        <ol class="timeline">
          <li><b>Automatic checks</b> run on your pull request: format, duplicates, the site is online, the repository exists. Any problem is shown next to the exact line in the <b>Files changed</b> tab.</li>
          <li><b>A maintainer reviews</b> and merges. Please keep to one portfolio per pull request.</li>
          <li><b>Automation takes over:</b> the README is regenerated, a screenshot of your site is taken and the gallery is redeployed, usually within five minutes.</li>
        </ol>

        <h2 id="faq">FAQ</h2>
        <details>
          <summary>How do I update or remove my entry?</summary>
          <p>Edit or delete your file in <code>data/portfolios/</code> and open a pull request. The README and the gallery follow automatically.</p>
        </details>
        <details>
          <summary>A check failed on my pull request. What now?</summary>
          <p>Open the <b>Files changed</b> tab: the error is shown next to the line that needs fixing, and the <b>Checks</b> tab has a summary. Commit the fix to the same branch and the checks run again.</p>
        </details>
        <details>
          <summary>My screenshot is outdated or looks wrong.</summary>
          <p>Screenshots are retaken every week, a few seconds after the page loads, with reduced motion turned on. If yours still looks broken (a loader or cookie banner, for example), <a href="${project.repoUrl}/issues/new/choose" ${ext}>open an issue</a>.</p>
        </details>
        <details>
          <summary>Why one file per portfolio instead of editing the README?</summary>
          <p>Pull requests never conflict with each other, every entry is validated the same way, and the README, this gallery and the <a href="../portfolios.json">JSON feed</a> are all built from the same data.</p>
        </details>
        <details>
          <summary>Can I add a portfolio that isn't mine?</summary>
          <p>Yes, as long as the site and its repository are public and it is hosted on GitHub Pages.</p>
        </details>
      </article>
    </div>`;

  return layout(ctx, {
    page: 'guide',
    path: 'guide/',
    title: 'Tutorial',
    description: 'Publish your portfolio on GitHub Pages for free, then add it to the Awesome GitHub Pages Portfolios gallery in a few minutes.',
    body,
  });
}
