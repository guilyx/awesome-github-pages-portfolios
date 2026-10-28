# Contributing

Thanks for helping grow the list! 🎉

> **TL;DR:** add **one YAML file** to `data/portfolios/` and open a pull request.
> Don't touch `README.md`: it is generated, and so is the [gallery](https://guilyx.github.io/awesome-github-pages-portfolios/).

- [Add a portfolio in your browser (no git needed)](#add-a-portfolio-in-your-browser)
- [Add a portfolio from the command line](#add-a-portfolio-from-the-command-line)
- [The fields](#the-fields)
- [What happens after you open the pull request](#what-happens-after-you-open-the-pull-request)
- [Guidelines](#guidelines)
- [Update or remove an entry](#update-or-remove-an-entry)
- [Add a tool or an article](#add-a-tool-or-an-article)
- [Working on the gallery or the automation](#working-on-the-gallery-or-the-automation)

Don't have a portfolio online yet? The [tutorial](https://guilyx.github.io/awesome-github-pages-portfolios/guide/) walks you through publishing one on GitHub Pages first.

## Add a portfolio in your browser

1. **[Click here to create your entry file](https://github.com/guilyx/awesome-github-pages-portfolios/new/master/data/portfolios?filename=your-name.yml&value=%23%20yaml-language-server%3A%20%24schema%3D..%2F..%2Fschema%2Fportfolio.schema.json%0Aname%3A%20Your%20Name%0Arepo%3A%20your-username%2Fyour-username.github.io%0Ademo%3A%20https%3A%2F%2Fyour-username.github.io%2F%0A%23%20Optional%3A%0A%23%20description%3A%20One%20line%20about%20your%20portfolio%20%2810-160%20characters%29.%0A%23%20tags%3A%20%5Breact%2C%20minimal%2C%20dark%5D%0A).**
   GitHub opens an editor with a pre-filled file and forks the repository for you if needed.
2. **Rename** `your-name.yml` to something unique: lowercase letters, numbers and dashes, e.g. `jane-doe.yml`.
3. **Fill in** your values:

   ```yaml
   name: Jane Doe
   repo: janedoe/janedoe.github.io
   demo: https://janedoe.github.io/
   # optional
   description: Minimal dark portfolio built with Astro.
   tags: [astro, minimal, dark]
   ```

4. Click **Commit changes…** → **Propose changes** → **Create pull request**. Done!

## Add a portfolio from the command line

Fork the repository, then:

```sh
git clone https://github.com/<you>/awesome-github-pages-portfolios.git
cd awesome-github-pages-portfolios
npm install                 # Node.js 20 or newer
npm run new                 # asks a few questions and writes data/portfolios/<name>.yml
npm run validate            # the same checks CI runs (add -- --online to also ping the site)

git switch -c add-jane-doe
git add data/portfolios/jane-doe.yml
git commit -m "Add Jane Doe's portfolio"
git push -u origin add-jane-doe
```

Then open a pull request from your fork.

## The fields

| Field | | What to put |
| --- | --- | --- |
| `name` | **required** | Your name, your handle or the template's name. 2-50 characters. |
| `repo` | **required** | The public GitHub repository, written `owner/name` (not a URL). |
| `demo` | **required** | The full `https://` URL of the live site. |
| `branch` | optional | The branch that holds the source, if it isn't the default one. Lets several designs from one repository be listed separately. |
| `description` | optional | One line, 10-160 characters. Defaults to the repository's GitHub description. |
| `tags` | optional | Up to 5 lowercase keywords for the gallery filters, e.g. `[react, minimal, dark]`. |
| `added` | optional | `YYYY-MM-DD`. Defaults to the date your file was first committed. |

The format is defined by a [JSON schema](schema/portfolio.schema.json). Editors with a YAML extension (for example the Red Hat YAML extension for VS Code) autocomplete and check the fields as you type.

## What happens after you open the pull request

1. **Automatic checks** run: file name, format, duplicates, the site responds, the repository exists. If something is wrong, the message appears **next to the exact line** in the *Files changed* tab, and in the summary of the *Checks* tab. Push a fix to the same branch and the checks run again.
2. **A maintainer reviews** and merges.
3. **Automation takes over:** `README.md` is regenerated and committed, a screenshot of your site is taken, and the gallery is redeployed. This usually takes about five minutes.

## Guidelines

- The site must be **live, served over HTTPS and hosted with GitHub Pages**, and its **repository public**.
- **One portfolio per pull request.** Several versions of your own site are fine as separate entries.
- **Real content:** no unmodified template with placeholder text. Templates themselves are welcome when they have a live demo.
- Keep the description factual. No marketing superlatives, no emoji spam.
- Anything not in English is welcome too.

## Update or remove an entry

Edit or delete your file in `data/portfolios/` and open a pull request, exactly like adding one. Found a dead or wrong entry that isn't yours? [Open an issue](https://github.com/guilyx/awesome-github-pages-portfolios/issues/new/choose).

## Add a tool or an article

Append an item to [`data/tools.yml`](data/tools.yml) or [`data/articles.yml`](data/articles.yml):

```yaml
- name: 8 Steps to Publish your Portfolio on GitHub
  url: https://example.com/article
  author: Jane Doe # optional
```

## Working on the gallery or the automation

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests |
| `npm run validate` | Validates everything in `data/` |
| `npm run readme` | Regenerates `README.md` from `data/` and `templates/README.md` |
| `npm run metadata` | Fetches GitHub stars and languages into `.cache/` (set `GITHUB_TOKEN` to avoid rate limits) |
| `npm run previews` | Screenshots every site into `.cache/` (run `npx playwright install chromium` once first) |
| `npm run build:site` | Builds the gallery into `dist/` |
| `npm run dev` | Builds and serves the gallery on <http://localhost:4173> |

Metadata and screenshots are optional: without them the gallery shows coloured placeholders. How the pieces fit together is explained in [docs/MAINTAINING.md](docs/MAINTAINING.md).

By contributing you agree that your contribution is released under [CC0](LICENSE) and you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).
