export const IMAGE_SIZE = 512;
export const FACES = ['top', 'bottom', 'left', 'right'] as const;
export type Face = (typeof FACES)[number];
export type BoxSettings = {
  width: number;
  height: number;
  depth: number;
  radius: number;
  lightPercent: number;
  thickness: number;
  margin: number;
  detail: number;
};
export type WallMask = {
  face: Face;
  columns: number;
  rows: number;
  span: number;
  depth: number;
  cells: Uint8Array;
};
export const defaultBox: BoxSettings = {
  width: 15,
  height: 15,
  depth: 6,
  radius: 55,
  lightPercent: 85,
  thickness: 2,
  margin: 3,
  detail: 160,
};

export function validateBox(s: BoxSettings) {
  for (const value of Object.values(s))
    if (!Number.isFinite(value)) throw new Error('Ingresá medidas válidas.');
  if (
    s.width < 6 ||
    s.width > 80 ||
    s.height < 6 ||
    s.height > 100 ||
    s.depth < 3 ||
    s.depth > 50 ||
    s.radius < 15 ||
    s.radius > 150 ||
    s.lightPercent < 10 ||
    s.lightPercent > 95 ||
    s.thickness < 0.6 ||
    s.thickness > 12 ||
    s.margin < 0 ||
    s.margin > 10 ||
    ![96, 160, 224].includes(s.detail)
  )
    throw new Error('Revisá las dimensiones y el espesor.');
}

export function faceSpan(face: Face, s: BoxSettings) {
  return face === 'top' || face === 'bottom' ? s.width : s.height;
}

export function wallToImage(
  face: Face,
  u: number,
  depth: number,
  s: BoxSettings,
): [number, number] | null {
  const bulb = (s.depth * s.lightPercent) / 100;
  if (depth < 0 || depth >= bulb) return null;
  const scale = bulb / (bulb - depth);
  let x = 0,
    y = 0;
  if (face === 'right') {
    x = (s.width / 2) * scale;
    y = u * scale;
  }
  if (face === 'left') {
    x = (-s.width / 2) * scale;
    y = u * scale;
  }
  if (face === 'top') {
    x = u * scale;
    y = (s.height / 2) * scale;
  }
  if (face === 'bottom') {
    x = u * scale;
    y = (-s.height / 2) * scale;
  }
  return [x, y];
}

export function imageToWall(
  x: number,
  y: number,
  s: BoxSettings,
): { face: Face; u: number; depth: number } | null {
  if (Math.abs(x) <= s.width / 2 && Math.abs(y) <= s.height / 2) return null;
  const tx = Math.abs(x) > s.width / 2 ? s.width / 2 / Math.abs(x) : Infinity;
  const ty = Math.abs(y) > s.height / 2 ? s.height / 2 / Math.abs(y) : Infinity;
  const horizontal = tx <= ty;
  const t = horizontal ? tx : ty;
  const face: Face = horizontal
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'bottom'
      : 'top';
  return {
    face,
    u: (horizontal ? y : x) * t,
    depth: ((s.depth * s.lightPercent) / 100) * (1 - t),
  };
}

export function masksFromImage(
  image: Uint8ClampedArray,
  s: BoxSettings,
): WallMask[] {
  validateBox(s);
  if (image.length !== IMAGE_SIZE * IMAGE_SIZE * 4)
    throw new Error('La imagen de diseño no es válida.');
  return FACES.map((face) => {
    const span = faceSpan(face, s);
    const columns = Math.max(
      48,
      Math.round((s.detail * span) / Math.max(s.width, s.height)),
    );
    const rows = Math.max(
      24,
      Math.min(160, Math.round((columns * s.depth) / span)),
    );
    const cells = new Uint8Array(columns * rows);
    const bulb = (s.depth * s.lightPercent) / 100;
    for (let row = 2; row < rows - 2; row++)
      for (let column = 2; column < columns - 2; column++) {
        const depth = ((row + 0.5) / rows) * s.depth;
        if (depth >= bulb - s.margin / 10) continue;
        const u = ((column + 0.5) / columns - 0.5) * span;
        const position = wallToImage(face, u, depth, s)!;
        const dist = Math.hypot(...position);
        if (dist > s.radius) continue;
        const ix = Math.floor(
          (position[0] / (2 * s.radius) + 0.5) * IMAGE_SIZE,
        );
        const iy = Math.floor(
          (0.5 - position[1] / (2 * s.radius)) * IMAGE_SIZE,
        );
        if (ix < 0 || ix >= IMAGE_SIZE || iy < 0 || iy >= IMAGE_SIZE) continue;
        const offset = (iy * IMAGE_SIZE + ix) * 4;
        const brightness =
          ((image[offset] * 0.2126 +
            image[offset + 1] * 0.7152 +
            image[offset + 2] * 0.0722) *
            image[offset + 3]) /
          255;
        cells[row * columns + column] = brightness >= 128 ? 1 : 0;
      }
    return { face, columns, rows, span, depth: s.depth, cells };
  });
}

export function simulatedImage(
  masks: WallMask[],
  s: BoxSettings,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  const byFace = Object.fromEntries(
    masks.map((mask) => [mask.face, mask]),
  ) as Record<Face, WallMask>;
  for (let iy = 0; iy < IMAGE_SIZE; iy++)
    for (let ix = 0; ix < IMAGE_SIZE; ix++) {
      const x = ((ix + 0.5) / IMAGE_SIZE - 0.5) * s.radius * 2,
        y = (0.5 - (iy + 0.5) / IMAGE_SIZE) * s.radius * 2;
      const p = imageToWall(x, y, s);
      let lit = false;
      if (p) {
        const wall = byFace[p.face];
        const col = Math.floor((p.u / wall.span + 0.5) * wall.columns),
          row = Math.floor((p.depth / wall.depth) * wall.rows);
        lit =
          col >= 0 &&
          col < wall.columns &&
          row >= 0 &&
          row < wall.rows &&
          !!wall.cells[row * wall.columns + col];
      }
      const k = (iy * IMAGE_SIZE + ix) * 4;
      out[k] = lit ? 249 : 26;
      out[k + 1] = lit ? 207 : 37;
      out[k + 2] = lit ? 138 : 42;
      out[k + 3] = 255;
    }
  return out;
}

type Point = [number, number];
type Edge = { from: Point; to: Point; dir: number };
function boundaryLoops(mask: WallMask): Point[][] {
  const { columns: w, rows: h, cells } = mask;
  const at = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h && cells[y * w + x] === 1;
  const edges: Edge[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (at(x, y)) {
        if (!at(x, y - 1)) edges.push({ from: [x, y], to: [x + 1, y], dir: 0 });
        if (!at(x + 1, y))
          edges.push({ from: [x + 1, y], to: [x + 1, y + 1], dir: 1 });
        if (!at(x, y + 1))
          edges.push({ from: [x + 1, y + 1], to: [x, y + 1], dir: 2 });
        if (!at(x - 1, y)) edges.push({ from: [x, y + 1], to: [x, y], dir: 3 });
      }
  const next = new Map<string, number[]>();
  edges.forEach((edge, i) => {
    const key = edge.from.join(',');
    const found = next.get(key) || [];
    found.push(i);
    next.set(key, found);
  });
  const used = new Uint8Array(edges.length),
    loops: Point[][] = [];
  for (let start = 0; start < edges.length; start++) {
    if (used[start]) continue;
    const points: Point[] = [];
    let current = start;
    while (!used[current]) {
      const edge = edges[current];
      used[current] = 1;
      points.push(edge.from);
      const candidates = (next.get(edge.to.join(',')) || []).filter(
        (i) => !used[i],
      );
      if (!candidates.length) break;
      // Right turn, then straight, then left. Keeps diagonal islands separate.
      const order = (dir: number) => {
        const delta = (dir - edge.dir + 4) % 4;
        return delta === 1 ? 0 : delta === 0 ? 1 : delta === 3 ? 2 : 3;
      };
      candidates.sort((a, b) => order(edges[a].dir) - order(edges[b].dir));
      current = candidates[0];
    }
    if (points.length < 4) continue;
    const simplified = points.filter((p, i) => {
      const prev = points[(i + points.length - 1) % points.length],
        after = points[(i + 1) % points.length];
      return !(
        (p[0] - prev[0]) * (after[1] - p[1]) ===
        (p[1] - prev[1]) * (after[0] - p[0])
      );
    });
    if (simplified.length >= 4) loops.push(simplified);
  }
  return loops;
}

export function maskSVG(mask: WallMask): string {
  const width = mask.span * 10,
    height = mask.depth * 10,
    sx = width / mask.columns,
    sy = height / mask.rows;
  const paths = boundaryLoops(mask)
    .map(
      (points) =>
        `M ${points.map(([x, y]) => `${(x * sx).toFixed(3)} ${(y * sy).toFixed(3)}`).join(' L ')} Z`,
    )
    .join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><path fill="black" d="M0 0 H${width} V${height} H0 Z"/><path fill="white" fill-rule="evenodd" d="${paths}"/></svg>`;
}

export function printMesh(masks: WallMask[], s: BoxSettings) {
  validateBox(s);
  if (masks.length !== 4) throw new Error('Faltan paneles de la caja.');
  const positions: number[] = [],
    indices: number[] = [];
  function quad(
    a: Point | number[],
    b: Point | number[],
    c: Point | number[],
    d: Point | number[],
  ) {
    const start = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  let origin = 0;
  const pieces = [
    ...masks,
    {
      face: 'base' as const,
      span: s.width,
      depth: s.height,
      columns: Math.max(
        20,
        Math.round((s.detail * s.width) / Math.max(s.width, s.height)),
      ),
      rows: Math.max(
        20,
        Math.round((s.detail * s.height) / Math.max(s.width, s.height)),
      ),
      cells: null,
    },
  ];
  for (const panel of pieces) {
    const { columns: w, rows: h } = panel,
      all = panel.cells;
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < solid.length; i++) solid[i] = all ? 1 - all[i] : 1;
    // Discard floating islands left inside cutouts; keep material connected to the frame.
    if (all) {
      const seen = new Uint8Array(w * h),
        queue: number[] = [];
      for (let x = 0; x < w; x++)
        for (const y of [0, h - 1]) {
          const i = y * w + x;
          if (solid[i] && !seen[i]) {
            seen[i] = 1;
            queue.push(i);
          }
        }
      for (let y = 0; y < h; y++)
        for (const x of [0, w - 1]) {
          const i = y * w + x;
          if (solid[i] && !seen[i]) {
            seen[i] = 1;
            queue.push(i);
          }
        }
      for (let head = 0; head < queue.length; head++) {
        const i = queue[head],
          x = i % w,
          y = Math.floor(i / w);
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ])
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const n = ny * w + nx;
            if (solid[n] && !seen[n]) {
              seen[n] = 1;
              queue.push(n);
            }
          }
      }
      for (let i = 0; i < solid.length; i++) solid[i] = seen[i];
    }
    const dx = (panel.span * 10) / w,
      dy = (panel.depth * 10) / h,
      z = s.thickness;
    const has = (x: number, y: number) =>
      x >= 0 && x < w && y >= 0 && y < h && solid[y * w + x] === 1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (has(x, y)) {
          const left = origin + x * dx,
            right = left + dx,
            bottom = y * dy,
            top = bottom + dy;
          quad(
            [left, bottom, z],
            [right, bottom, z],
            [right, top, z],
            [left, top, z],
          );
          quad(
            [left, top, 0],
            [right, top, 0],
            [right, bottom, 0],
            [left, bottom, 0],
          );
          if (!has(x, y - 1))
            quad(
              [left, bottom, 0],
              [right, bottom, 0],
              [right, bottom, z],
              [left, bottom, z],
            );
          if (!has(x + 1, y))
            quad(
              [right, bottom, 0],
              [right, top, 0],
              [right, top, z],
              [right, bottom, z],
            );
          if (!has(x, y + 1))
            quad(
              [right, top, 0],
              [left, top, 0],
              [left, top, z],
              [right, top, z],
            );
          if (!has(x - 1, y))
            quad(
              [left, top, 0],
              [left, bottom, 0],
              [left, bottom, z],
              [left, top, z],
            );
        }
    origin += panel.span * 10 + 12;
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
