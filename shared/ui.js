/** DOM construction that treats string children as text, including imported user input. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (/^on[A-Z]/.test(key) && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else if (key === 'className' || key === 'class') {
      node.className = value;
    } else if (key === 'htmlFor') {
      node.htmlFor = value;
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child != null && child !== false) node.append(child);
  }
  if ('value' in (attrs || {}) && 'value' in node) node.value = attrs.value;
  return node;
}

export function download(filename, content, mimeType = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

let timer;
export function notify(message) {
  let toast = document.getElementById('workspace-notice');
  if (!toast) {
    toast = el('div', { id: 'workspace-notice', role: 'status', 'aria-live': 'polite' });
    document.body.append(toast);
  }
  toast.textContent = String(message);
  toast.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => {
    toast.hidden = true;
  }, 5500);
}
