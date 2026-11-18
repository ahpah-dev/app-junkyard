import { el } from './shared/ui.js';

function inline(text) {
  return text.split(/(\x60[^\x60]+\x60|\*\*.+?\*\*|\[[^\]]+\]\([^)]+\))/g).map((part) => {
    if (part.startsWith('`') && part.endsWith('`')) return el('code', {}, part.slice(1, -1));
    if (part.startsWith('**') && part.endsWith('**')) return el('strong', {}, part.slice(2, -2));
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link?.[2] === '../../README.md') return el('a', { href: './' }, link[1]);
    if (link && /^https:\/\//.test(link[2]))
      return el('a', { href: link[2], target: '_blank', rel: 'noopener noreferrer' }, link[1]);
    return link ? link[1] : part;
  });
}

export async function openGuide(app, href) {
  const content = el('article', { className: 'guide-content' }, el('p', {}, 'Loading guide…'));
  const dialog = el(
    'dialog',
    { className: 'backup-dialog guide-dialog', 'aria-label': app.name + ' guide' },
    el(
      'div',
      { className: 'dialog-head' },
      el('h2', {}, 'App guide'),
      el('button', { 'aria-label': 'Close app guide', onClick: () => dialog.close() }, '×'),
    ),
    content,
  );
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  try {
    const response = await fetch(href);
    if (!response.ok) throw new Error();
    const paragraphs = (await response.text()).trim().split(/\r?\n\s*\r?\n/);
    content.replaceChildren(
      ...paragraphs.map((block) => {
        const heading = /^(#{1,3}) (.+)$/.exec(block);
        if (heading) return el(heading[1].length === 1 ? 'h3' : 'h4', {}, ...inline(heading[2]));
        return el('p', {}, ...inline(block));
      }),
    );
  } catch {
    content.replaceChildren(el('p', { role: 'alert' }, 'The guide could not load.'));
  }
}
