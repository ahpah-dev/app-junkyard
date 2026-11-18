import { el } from './shared/ui.js';
import { drawYard } from './yard.js';

drawYard(document.querySelector('#yard'));
const categories = ['AI', 'Crypto', 'Design', 'Games', 'Business', 'Operations'];
const dom = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const search = dom('search');
let active = categories.includes(params.get('category')) ? params.get('category') : 'All';
search.value = params.get('q') || '';

function card(app) {
  const preview = el('div', { className: 'preview ' + app.category.toLowerCase(), 'aria-hidden': 'true' });
  const image = el('img', { alt: '', loading: 'lazy', src: './previews/' + app.id + '.webp' });
  image.addEventListener('error', () => image.remove(), { once: true });
  preview.append(image);
  return el(
    'a',
    { className: 'app-card', href: './app.html?id=' + app.id },
    preview,
    el(
      'div',
      { className: 'card-body' },
      el('span', { className: 'category-tag ' + app.category.toLowerCase() }, app.category),
      el('h3', {}, app.name, el('span', { 'aria-hidden': 'true' }, '↗')),
      el('p', {}, app.description),
    ),
  );
}

try {
  const response = await fetch('./catalog.json');
  if (!response.ok) throw new Error();
  const apps = await response.json();
  if (apps.length === 1 && !location.search) location.replace('./app.html?id=' + apps[0].id);
  // Interleave categories so the first screen reflects the breadth of the collection.
  const groups = categories.map((c) => apps.filter((a) => a.category === c));
  const interleaved = Array.from({ length: Math.max(...groups.map((group) => group.length)) }, (_, i) =>
    groups.map((group) => group[i]).filter(Boolean),
  ).flat();
  const featured = [
    'label-foundry',
    'crateworks',
    'pattern-press',
    'pool-bench',
    'quote-foundry',
    'sprint-board',
  ];
  const ordered = [
    ...featured.map((id) => apps.find((a) => a.id === id)).filter(Boolean),
    ...interleaved.filter((a) => !featured.includes(a.id)),
  ];
  const available = ['All', ...categories.filter((c) => apps.some((a) => a.category === c))];
  function render() {
    const needle = search.value.trim().toLowerCase();
    const matches = ordered.filter(
      (a) =>
        (active === 'All' || a.category === active) &&
        [a.name, a.id, a.category, a.description, ...a.features].join(' ').toLowerCase().includes(needle),
    );
    for (const button of dom('filters').children)
      button.setAttribute('aria-pressed', String(button.dataset.category === active));
    const cards = dom('cards');
    cards.replaceChildren(...matches.map(card));
    if (!matches.length)
      cards.append(
        el(
          'div',
          { className: 'empty' },
          el('h3', {}, 'No matching apps'),
          el('p', {}, 'Try another search or category.'),
          el(
            'button',
            {
              onClick: () => {
                active = 'All';
                search.value = '';
                render();
                search.focus();
              },
            },
            'Clear filters',
          ),
        ),
      );
    dom('count').textContent = matches.length + (matches.length === 1 ? ' application' : ' applications');
    const next = new URL(location.href);
    if (active !== 'All') next.searchParams.set('category', active);
    else next.searchParams.delete('category');
    if (needle) next.searchParams.set('q', search.value);
    else next.searchParams.delete('q');
    history.replaceState(null, '', next);
  }
  dom('filters').replaceChildren(
    ...available.map((c) =>
      el(
        'button',
        {
          type: 'button',
          dataset: { category: c },
          onClick: () => {
            active = c;
            render();
          },
        },
        c,
      ),
    ),
  );
  search.addEventListener('input', render);
  addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      search.focus();
    }
  });
  render();
} catch {
  dom('cards').append(
    el(
      'p',
      { role: 'alert' },
      'The collection could not load. Start the project with npm start or serve the static build over HTTP.',
    ),
  );
}
