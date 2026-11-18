import { el } from './shared/ui.js';
async function api(path, body) {
  const options =
    body === undefined
      ? {}
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const r = await fetch('./api/' + path, options);
  const value = await r.json();
  if (!r.ok) throw new Error(value.error || 'The request failed.');
  return value;
}

export function openBackups(app, read, restore) {
  const content = el('div', { className: 'stack' });
  const status = el('p', { role: 'status', className: 'muted' });
  const dialog = el(
    'dialog',
    { 'aria-labelledby': 'backup-title', className: 'backup-dialog' },
    el(
      'div',
      { className: 'dialog-head' },
      el('h2', { id: 'backup-title' }, 'Workspace backups'),
      el('button', { type: 'button', 'aria-label': 'Close backups', onClick: () => dialog.close() }, '×'),
    ),
    content,
    status,
  );
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
  const endpoint = 'backups/' + app.id;
  let busy = false;
  async function run(fn) {
    if (busy) return;
    busy = true;
    status.textContent = 'Working…';
    try {
      const message = await fn();
      status.textContent = message || '';
    } catch (e) {
      status.textContent = e.message;
    } finally {
      busy = false;
    }
  }
  async function refresh() {
    const session = await api('session');
    if (!session.handle) {
      const user = el('input', { required: true, autocomplete: 'username', minlength: 3, maxlength: 40 });
      const password = el('input', {
        required: true,
        type: 'password',
        minlength: 12,
        maxlength: 256,
        autocomplete: 'current-password',
      });
      const form = el(
        'form',
        {
          className: 'stack',
          onSubmit: (event) => {
            event.preventDefault();
            run(async () => {
              await api(event.submitter?.value || 'login', { handle: user.value, password: password.value });
              await refresh();
            });
          },
        },
        el('label', {}, 'Handle', user),
        el('label', {}, 'Password (12 characters or more)', password),
        el(
          'div',
          { className: 'actions' },
          el('button', { className: 'primary', value: 'login' }, 'Sign in'),
          el('button', { value: 'register' }, 'Create account'),
        ),
      );
      content.replaceChildren(
        el(
          'p',
          {},
          'Keep up to five private backups per app on this server. Browser drafts stay on this device.',
        ),
        form,
      );
      return;
    }
    const { items } = await api(endpoint);
    content.replaceChildren(
      el('p', {}, 'Signed in as ' + session.handle + '. Backups belong to this account.'),
      el(
        'div',
        { className: 'actions' },
        el(
          'button',
          {
            className: 'primary',
            onClick: () =>
              run(async () => {
                await api(endpoint, { data: read() });
                await refresh();
                return 'Saved a backup.';
              }),
          },
          'Back up current draft',
        ),
        el(
          'button',
          {
            onClick: () =>
              run(async () => {
                await api('logout', {});
                await refresh();
              }),
          },
          'Sign out',
        ),
      ),
    );
    if (!items.length) content.append(el('p', { className: 'muted' }, 'No backups for this app yet.'));
    for (const item of items) {
      const row = el(
        'div',
        { className: 'revision' },
        el('span', {}, new Date(item.created).toLocaleString()),
      );
      const button = el(
        'button',
        {
          onClick: () => {
            row.replaceChildren(
              el('span', {}, 'Replace the current browser draft?'),
              el(
                'button',
                { onClick: () => run(async () => restore((await api(endpoint + '/' + item.id)).data)) },
                'Restore backup',
              ),
              el('button', { onClick: () => run(refresh) }, 'Cancel'),
            );
          },
        },
        'Restore…',
      );
      row.append(button);
      content.append(row);
    }
  }
  run(refresh);
}
