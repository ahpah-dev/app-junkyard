import { el, notify, download } from './shared/ui.js';

const root = document.getElementById('workspace');
const id = new URLSearchParams(location.search).get('id') || root.dataset.defaultApp;
try {
  const response = await fetch('./catalog.json');
  if (!response.ok) throw new Error('The catalog could not load.');
  const app = (await response.json()).find((item) => item.id === id);
  if (!app) throw new Error('This application is unavailable.');
  document.title = app.name + ' · App Junkyard';
  document.getElementById('app-name').textContent = app.name;
  document.getElementById('app-summary').textContent = app.description;
  document.getElementById('category').textContent = app.category;
  if (root.dataset.defaultApp) {
    const brand = document.querySelector('.wordmark');
    brand.replaceChildren(brand.querySelector('.logomark'), app.name);
    document.querySelector('.breadcrumb').replaceChildren(document.getElementById('category'));
    document.title = app.name;
  }
  if (!root.dataset.defaultApp) {
    const starter = document.getElementById('starter');
    starter.href = 'https://github.com/ahpah-dev/app-junkyard/releases/download/v1.0.0/' + app.id + '.zip';
    starter.hidden = false;
  }
  const guide = document.getElementById('guide');
  guide.href = './apps/' + app.id + '/README.md';
  guide.hidden = false;
  guide.textContent = 'App guide';
  guide.addEventListener('click', async (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const { openGuide } = await import('./guide.js');
    openGuide(app, guide.href);
  });
  const key = 'app-junkyard:v1:' + new URL('./', location.href).pathname + ':' + app.id;
  let current,
    loaded = false;
  const context = {
    load(fallback) {
      if (!loaded) {
        loaded = true;
        try {
          const stored = localStorage.getItem(key);
          if (stored !== null) current = JSON.parse(stored);
        } catch {
          notify('Browser storage is unavailable or could not be read. Export a copy of your work.');
        }
      }
      if (current === undefined) current = structuredClone(fallback);
      return structuredClone(current);
    },
    save(data) {
      loaded = true;
      current = structuredClone(data);
      try {
        localStorage.setItem(key, JSON.stringify(current));
      } catch {
        notify('Browser storage is full or unavailable. Export a copy before closing.');
      }
    },
    download,
    notify,
  };
  const { mount } = await import('./apps/' + app.id + '/app.js');
  await mount(root, context);
  root.dataset.ready = 'true';
  const runtime = await fetch('./runtime.json')
    .then((r) => r.json())
    .catch(() => ({}));
  if (runtime.accounts) {
    const button = document.getElementById('backups');
    const { openBackups } = await import('./backups.js');
    button.hidden = false;
    button.onclick = () =>
      openBackups(
        app,
        () => context.load(null),
        (data) => {
          // Verify the materialized draft before reloading the editor.
          localStorage.setItem(key, JSON.stringify(data));
          location.reload();
        },
      );
  }
} catch (error) {
  if (!document.getElementById('category').textContent)
    document.getElementById('app-name').textContent = 'Workspace unavailable';
  root.replaceChildren(
    el('p', { role: 'alert' }, error.message),
    el('a', { href: './' }, 'Return to the collection'),
  );
}
