// An original isometric print of the collection's parts bin, drawn locally at any density.
export function drawYard(canvas) {
  const g = canvas.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, 830, 410);
  g.save();
  g.translate(68, 62);
  g.scale(0.84, 0.84);
  const ink = '#272b28',
    orange = '#f66a32',
    paper = '#f7f5eb';
  const point = (x, y, z) => [395 + (x - y) * 1.04, 259 + (x + y) * 0.44 - z];
  function poly(points, fill, stroke = ink, width = 2) {
    g.beginPath();
    points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = width;
      g.stroke();
    }
  }
  function face(coords, fill) {
    poly(
      coords.map((p) => point(...p)),
      fill,
    );
  }
  function line(a, b, color, width = 1) {
    g.beginPath();
    g.moveTo(...point(...a));
    g.lineTo(...point(...b));
    g.strokeStyle = color;
    g.lineWidth = width;
    g.stroke();
  }
  function box(x, y, z, w, d, h, top, left, right) {
    face(
      [
        [x, y + d, z],
        [x + w, y + d, z],
        [x + w, y + d, z + h],
        [x, y + d, z + h],
      ],
      left,
    );
    face(
      [
        [x + w, y, z],
        [x + w, y + d, z],
        [x + w, y + d, z + h],
        [x + w, y, z + h],
      ],
      right,
    );
    face(
      [
        [x, y, z + h],
        [x + w, y, z + h],
        [x + w, y + d, z + h],
        [x, y + d, z + h],
      ],
      top,
    );
  }
  // The perspective grid is confined to the footprint of the illustration.
  for (let i = -248; i <= 248; i += 24) {
    line([-248, i, 0], [248, i, 0], '#d7d6ca');
    line([i, -248, 0], [i, 248, 0], '#d7d6ca');
  }
  face(
    [
      [-158, -69, 0],
      [145, -69, 0],
      [145, 101, 0],
      [-158, 101, 0],
    ],
    '#adae9e',
  );
  box(-152, -92, 7, 289, 168, 21, '#deded0', '#a8ac98', '#868c79');
  box(-153, -93, 28, 289, 168, 65, '#d75c2c', '#ee7138', '#b34623');
  // Upright punched cards: charts, geometric shapes, pixel art.
  const cards = [
    [-124, -67, 139, '#c8d4b6'],
    [-120, -41, 155, '#abbfc9'],
    [-116, -12, 157, paper],
    [-113, 19, 136, '#f3c67d'],
  ];
  for (const [x, y, h, color] of cards) {
    box(x, y, 82, 229, 5, h, color, color, '#8d9486');
    for (let j = 0; j < 5; j++)
      line([x + 16 + j * 10, y + 5, 82 + h - 13], [x + 20 + j * 10, y + 5, 82 + h - 13], ink, 3);
    line([x + 12, y + 5, 82 + h - 24], [x + 215, y + 5, 82 + h - 24], ink, 1);
  }
  const x = -113,
    y = 24,
    base = 115;
  for (let j = 0; j < 12; j++) {
    const h = 14 + Math.round(15 + 15 * Math.sin(j * 0.6) + j * 2.8);
    face(
      [
        [x + 14 + j * 10, y, base],
        [x + 20 + j * 10, y, base],
        [x + 20 + j * 10, y, base + h],
        [x + 14 + j * 10, y, base + h],
      ],
      j % 3 === 0 ? '#e76d33' : '#40493e',
    );
  }
  for (let i = 0; i < 5; i++) line([45, y, 173 - i * 9], [90 - (i % 2) * 13, y, 173 - i * 9], ink, 2);
  // Front lip, ribs and inventory label.
  box(-156, 65, 72, 296, 16, 32, '#ff965d', orange, '#b44628');
  for (let i = 0; i < 7; i++) line([-141 + i * 40, 81, 32], [-141 + i * 40, 81, 64], '#743e27', 4);
  face(
    [
      [-116, 81, 77],
      [-41, 81, 77],
      [-41, 81, 98],
      [-116, 81, 98],
    ],
    paper,
  );
  for (let i = 0; i < 19; i++)
    line([-110 + i * 3.1, 81, 81], [-110 + i * 3.1, 81, 94], ink, i % 3 === 0 ? 2.4 : 1);
  for (let i = 0; i < 4; i++) line([137, -62 + i * 32, 41], [137, -47 + i * 32, 41], '#773c27', 5);
  g.restore();
}
