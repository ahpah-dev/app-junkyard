import { escapeXML, hexColor } from '../../shared/creative.js';

export const gridSize = 24;
export const badges = ['none', 'circle', 'squircle', 'octagon'];
export const fillModes = ['stroke', 'fill', 'duotone'];

export const presets = [
  {
    name: 'Prism',
    values: {
      version: 1,
      name: 'prism-mark',
      mirror: true,
      closed: true,
      curve: 0.25,
      badge: 'squircle',
      fillMode: 'duotone',
      strokeWidth: 3,
      bg: '#1c2f33',
      stroke: '#f7d388',
      fill: '#df6743',
      points: [
        { x: 12, y: 4 },
        { x: 6, y: 12 },
        { x: 12, y: 20 },
      ],
    },
  },
  {
    name: 'Crown',
    values: {
      version: 1,
      name: 'crown-mark',
      mirror: true,
      closed: true,
      curve: 0.15,
      badge: 'circle',
      fillMode: 'fill',
      strokeWidth: 2,
      bg: '#24292e',
      stroke: '#fff5da',
      fill: '#e8a248',
      points: [
        { x: 12, y: 6 },
        { x: 9, y: 12 },
        { x: 5, y: 8 },
        { x: 6, y: 17 },
        { x: 12, y: 17 },
      ],
    },
  },
  {
    name: 'Shield',
    values: {
      version: 1,
      name: 'shield-mark',
      mirror: true,
      closed: true,
      curve: 0.4,
      badge: 'none',
      fillMode: 'duotone',
      strokeWidth: 3,
      bg: '#f4efdc',
      stroke: '#1e3a38',
      fill: '#568c74',
      points: [
        { x: 12, y: 3 },
        { x: 5, y: 6 },
        { x: 6, y: 14 },
        { x: 12, y: 21 },
      ],
    },
  },
  {
    name: 'Wave',
    values: {
      version: 1,
      name: 'wave-mark',
      mirror: false,
      closed: false,
      curve: 0.85,
      badge: 'octagon',
      fillMode: 'stroke',
      strokeWidth: 4,
      bg: '#172830',
      stroke: '#72b8b3',
      fill: '#72b8b3',
      points: [
        { x: 4, y: 14 },
        { x: 8, y: 7 },
        { x: 12, y: 16 },
        { x: 16, y: 8 },
        { x: 20, y: 13 },
      ],
    },
  },
];

export const initial = structuredClone(presets[0].values);

export function valid(p) {
  return (
    p?.version === 1 &&
    typeof p.name === 'string' &&
    p.name.length <= 40 &&
    typeof p.mirror === 'boolean' &&
    typeof p.closed === 'boolean' &&
    typeof p.curve === 'number' &&
    p.curve >= 0 &&
    p.curve <= 1 &&
    badges.includes(p.badge) &&
    fillModes.includes(p.fillMode) &&
    Number.isInteger(p.strokeWidth) &&
    p.strokeWidth >= 1 &&
    p.strokeWidth <= 6 &&
    [p.bg, p.stroke, p.fill].every(hexColor) &&
    Array.isArray(p.points) &&
    p.points.length >= 2 &&
    p.points.length <= 32 &&
    p.points.every(
      (pt) =>
        pt &&
        Number.isInteger(pt.x) &&
        Number.isInteger(pt.y) &&
        pt.x >= 0 &&
        pt.x <= gridSize &&
        pt.y >= 0 &&
        pt.y <= gridSize,
    )
  );
}

export function fullPoints(p) {
  if (!p.mirror) return p.points;
  const mirrored = [];
  for (let i = p.points.length - 1; i >= 0; i--) {
    const pt = p.points[i];
    const mx = gridSize - pt.x;
    if (i === p.points.length - 1 && mx === pt.x) continue;
    if (i === 0 && p.closed && mx === pt.x) continue;
    mirrored.push({ x: mx, y: pt.y });
  }
  return [...p.points, ...mirrored];
}

export function pathData(p, scale = 10) {
  const pts = fullPoints(p);
  if (pts.length < 2) return '';
  const sx = (pt) => pt.x * scale;
  const sy = (pt) => pt.y * scale;
  const k = p.curve * 0.45;
  if (k <= 0.01 || pts.length === 2) {
    return (
      'M' +
      pts.map((pt) => sx(pt) + ' ' + sy(pt)).join('L') +
      (p.closed ? 'Z' : '')
    );
  }
  const segs = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    if (!p.closed && (i === 0 || i === n - 1)) {
      if (i === 0) segs.push('M' + sx(curr) + ' ' + sy(curr));
      else segs.push('L' + sx(curr) + ' ' + sy(curr));
      continue;
    }
    const ax = sx(curr) + (sx(prev) - sx(curr)) * k;
    const ay = sy(curr) + (sy(prev) - sy(curr)) * k;
    const bx = sx(curr) + (sx(next) - sx(curr)) * k;
    const by = sy(curr) + (sy(next) - sy(curr)) * k;
    if (i === 0) segs.push('M' + ax.toFixed(1) + ' ' + ay.toFixed(1));
    else segs.push('L' + ax.toFixed(1) + ' ' + ay.toFixed(1));
    segs.push('Q' + sx(curr) + ' ' + sy(curr) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1));
  }
  if (p.closed) segs.push('Z');
  return segs.join('');
}

export function measurePath(p) {
  const pts = fullPoints(p);
  let perimeter = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    perimeter += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  if (p.closed && pts.length > 2) {
    perimeter += Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y);
  }
  const xs = pts.map((pt) => pt.x);
  const ys = pts.map((pt) => pt.y);
  return {
    vertices: pts.length,
    perimeter: Number(perimeter.toFixed(2)),
    bounds: {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    },
  };
}

export function iconSVG(p, showGrid = false, activeIdx = -1) {
  if (!valid(p)) throw Error('Invalid Bezier Forge project.');
  const size = 240;
  let badgeMarkup = '';
  if (p.badge === 'circle') {
    badgeMarkup = `<circle cx="120" cy="120" r="110" fill="${p.bg}"/>`;
  } else if (p.badge === 'squircle') {
    badgeMarkup = `<rect x="10" y="10" width="220" height="220" rx="46" fill="${p.bg}"/>`;
  } else if (p.badge === 'octagon') {
    badgeMarkup = `<polygon points="72,10 168,10 230,72 230,168 168,230 72,230 10,168 10,72" fill="${p.bg}"/>`;
  } else if (showGrid) {
    badgeMarkup = `<rect width="240" height="240" fill="${p.bg}" opacity="0.16"/>`;
  }

  let gridMarkup = '';
  if (showGrid) {
    const lines = [];
    for (let i = 1; i < gridSize; i++) {
      const c = i * 10;
      const major = i === 12;
      lines.push(
        `<line x1="${c}" y1="0" x2="${c}" y2="240" stroke="#889288" stroke-opacity="${major ? 0.55 : 0.2}" stroke-width="${major ? 1.4 : 0.7}"/>`,
        `<line x1="0" y1="${c}" x2="240" y2="${c}" stroke="#889288" stroke-opacity="${major ? 0.55 : 0.2}" stroke-width="${major ? 1.4 : 0.7}"/>`,
      );
    }
    gridMarkup = lines.join('');
  }

  const d = pathData(p, 10);
  const fillAttr = p.fillMode === 'stroke' ? 'none' : p.fill;
  const strokeAttr = p.fillMode === 'fill' ? 'none' : p.stroke;
  const sw = p.strokeWidth * 3;
  const shape = `<path d="${escapeXML(d)}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;

  let handles = '';
  if (showGrid) {
    handles = p.points
      .map(
        (pt, i) =>
          `<circle cx="${pt.x * 10}" cy="${pt.y * 10}" r="${i === activeIdx ? 6.5 : 5}" fill="${i === activeIdx ? '#e35525' : '#ffffff'}" stroke="#1e2822" stroke-width="2"/>`,
      )
      .join('');
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="${escapeXML(p.name)}">${badgeMarkup}${gridMarkup}${shape}${handles}</svg>`;
}
