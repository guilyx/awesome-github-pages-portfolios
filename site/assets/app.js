// Progressive enhancement: the pages work without JavaScript, this adds
// search, filters, sorting, the theme toggle and copy buttons.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function setupTheme() {
  const root = document.documentElement;
  const prefersDark = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme ?? (prefersDark.matches ? 'dark' : 'light');
  for (const button of $$('[data-theme-toggle]')) {
    button.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch {
        // Storage can be unavailable (private mode); the toggle still works for this page.
      }
    });
  }
}

function setupCopyButtons() {
  for (const button of $$('[data-copy]')) {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.dataset.copied = '';
        setTimeout(() => delete button.dataset.copied, 1500);
      } catch {
        // Clipboard access denied: nothing useful to do.
      }
    });
  }
}

function setupGallery() {
  const grid = $('#grid');
  if (!grid) return;
  const cards = $$('.card', grid);
  const search = $('#search');
  const sort = $('#sort');
  const count = $('#count');
  const empty = $('#empty');
  const chips = $$('.chip[data-filter]');

  const sorters = {
    added: (a, b) => b.dataset.added.localeCompare(a.dataset.added) || a.dataset.name.localeCompare(b.dataset.name),
    stars: (a, b) => Number(b.dataset.stars) - Number(a.dataset.stars) || sorters.added(a, b),
    updated: (a, b) => b.dataset.updated.localeCompare(a.dataset.updated) || sorters.added(a, b),
    name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
  };

  // Restore state from the URL so filtered views can be shared.
  const params = new URLSearchParams(location.search);
  let filter = chips.some((chip) => chip.dataset.filter === params.get('filter')) ? params.get('filter') : '';
  search.value = params.get('q') ?? '';
  if ([...sort.options].some((option) => option.value === params.get('sort'))) sort.value = params.get('sort');

  function apply({ updateUrl = true } = {}) {
    const terms = fold(search.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      const visible =
        (!filter || card.dataset.filters.split(' ').includes(filter)) &&
        terms.every((term) => card.dataset.search.includes(term));
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    grid.append(...[...cards].sort(sorters[sort.value] ?? sorters.added));
    count.textContent = String(shown);
    empty.hidden = shown > 0;
    for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter));

    if (updateUrl) {
      const next = new URLSearchParams();
      if (search.value.trim()) next.set('q', search.value.trim());
      if (filter) next.set('filter', filter);
      if (sort.value !== 'added') next.set('sort', sort.value);
      const query = next.toString();
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    }
  }

  search.addEventListener('input', () => apply());
  sort.addEventListener('change', () => apply());
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      filter = chip.dataset.filter === filter ? '' : chip.dataset.filter;
      apply();
    });
  }
  $('[data-clear]')?.addEventListener('click', () => {
    search.value = '';
    filter = '';
    apply();
    search.focus();
  });

  // "/" focuses the search box, Escape clears it.
  document.addEventListener('keydown', (event) => {
    const typing = event.target.closest('input, textarea, select, [contenteditable]');
    if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      search.focus();
    }
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && search.value) {
      search.value = '';
      apply();
    }
  });

  if (search.value || filter || sort.value !== 'added') apply({ updateUrl: false });
}

setupTheme();
setupCopyButtons();
setupGallery();
