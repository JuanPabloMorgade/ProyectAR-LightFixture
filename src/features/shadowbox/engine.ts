import { ShapeUtils, Vector2 } from "three";

export const IMAGE_SIZE = 512;
export const FACES = ["top", "bottom", "left", "right"] as const;
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
    if (!Number.isFinite(value)) throw new Error("IngresÃ¡ medidas vÃ¡lidas.");
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
    throw new Error("RevisÃ¡ las dimensiones y el espesor.");
}

export function faceSpan(face: Face, s: BoxSettings) {
  return face === "top" || face === "bottom" ? s.width : s.height;
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
  if (face === "right") {
    x = (s.width / 2) * scale;
    y = u * scale;
  }
  if (face === "left") {
    x = (-s.width / 2) * scale;
    y = u * scale;
  }
  if (face === "top") {
    x = u * scale;
    y = (s.height / 2) * scale;
  }
  if (face === "bottom") {
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
      ? "left"
      : "right"
    : y < 0
      ? "bottom"
      : "top";
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
    throw new Error("La imagen de diseÃ±o no es vÃ¡lida.");
  return FACES.map((face) => {
    const span = faceSpan(face, s);
    // Keep persisted detail values compatible with existing projects. Increase
    // sampling in both axes; the old 160-row cap erased detail in deep panels.
    const multiplier = s.detail === 224 ? 4 : s.detail === 160 ? 2 : 1;
    const baseColumns = Math.max(
      48,
      Math.round((s.detail * span) / Math.max(s.width, s.height)),
    );
    const baseRows = Math.max(
      24,
      Math.min(160, Math.round((baseColumns * s.depth) / span)),
    );
    const columns = baseColumns * multiplier;
    const rows = Math.max(
      24,
      Math.min(1024, Math.round((columns * s.depth) / span)),
    );
    // Preserve the physical frame width when increasing resolution.
    const borderX = Math.ceil((2 * columns) / baseColumns);
    const borderY = Math.ceil((2 * rows) / baseRows);
    const cells = new Uint8Array(columns * rows);
    const bulb = (s.depth * s.lightPercent) / 100;
    for (let row = borderY; row < rows - borderY; row++)
      for (let column = borderX; column < columns - borderX; column++) {
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
    return printableMask({ face, columns, rows, span, depth: s.depth, cells });
  });
}

/** Remove unsupported material once, so SVG, projection and STL agree. */
export function printableMask(mask: WallMask): WallMask {
  const { columns: w, rows: h, cells } = mask;
  const connected = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let end = 0;
  const visit = (i: number) => {
    if (!cells[i] && !connected[i]) {
      connected[i] = 1;
      queue[end++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    visit(x);
    visit((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w);
    visit(y * w + w - 1);
  }
  for (let head = 0; head < end; head++) {
    const i = queue[head],
      x = i % w;
    if (x > 0) visit(i - 1);
    if (x < w - 1) visit(i + 1);
    if (i >= w) visit(i - w);
    if (i < w * (h - 1)) visit(i + w);
  }
  const printable = connected.map((solid) => 1 - solid);
  // A diagonal-only contact creates four walls on one edge in an STL.
  // Join the material with one grid cell instead of exporting that pinch.
  let changed: boolean;
  do {
    changed = false;
    for (let y = 0; y < h - 1; y++)
      for (let x = 0; x < w - 1; x++) {
        const a = y * w + x,
          b = a + 1,
          c = a + w,
          d = c + 1;
        if (
          printable[a] === printable[d] &&
          printable[b] === printable[c] &&
          printable[a] !== printable[b]
        ) {
          printable[printable[c] ? c : d] = 0;
          changed = true;
        }
      }
  } while (changed);
  return { ...mask, cells: printable };
}

export function simulatedImage(
  masks: WallMask[],
  s: BoxSettings,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  const byFace = Object.fromEntries(
    masks.map((mask) => [mask.face, printableMask(mask)]),
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
    const key = edge.from.join(",");
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
      const candidates = (next.get(edge.to.join(",")) || []).filter(
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
  const paths = boundaryLoops(printableMask(mask))
    .map(
      (points) =>
        `M ${points.map(([x, y]) => `${(x * sx).toFixed(3)} ${(y * sy).toFixed(3)}`).join(" L ")} Z`,
    )
    .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><path fill="black" d="M0 0 H${width} V${height} H0 Z"/><path fill="white" fill-rule="evenodd" d="${paths}"/></svg>`;
}

export const PRINT_PARTS = [
  { id: "top", filename: "01-pared-superior", label: "Pared superior" },
  { id: "bottom", filename: "02-pared-inferior", label: "Pared inferior" },
  { id: "left", filename: "03-pared-izquierda", label: "Pared izquierda" },
  { id: "right", filename: "04-pared-derecha", label: "Pared derecha" },
  { id: "front", filename: "05-tapa-frontal", label: "Tapa frontal lisa" },
] as const;

type PrintMesh = { positions: Float32Array; indices: Uint32Array };

function panelMesh(panel: WallMask, thickness: number): PrintMesh {
  const positions: number[] = [],
    indices: number[] = [];
  // Triangulate the actual outlines, rather than tessellating every solid
  // cell. Flat panel interiors need no extra triangles at higher detail.
  const solid = { ...panel, cells: panel.cells.map((cut) => 1 - cut) };
  const loops = boundaryLoops(solid).map((loop) =>
    loop.map(
      ([x, y]) =>
        new Vector2(
          (x * panel.span * 10) / panel.columns,
          (y * panel.depth * 10) / panel.rows,
        ),
    ),
  );
  const outlines = loops.filter((loop) => ShapeUtils.area(loop) > 0);
  const holes = loops.filter((loop) => ShapeUtils.area(loop) < 0);
  const contains = (loop: Vector2[], p: Vector2) => {
    let inside = false;
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = loop[i],
        b = loop[j];
      if (
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside;
    }
    return inside;
  };
  for (const outline of outlines) {
    const inner = holes.filter((hole) => contains(outline, hole[0]));
    const vertices = [outline, ...inner].flat();
    const byX = new Map<number, number[]>(),
      byY = new Map<number, number[]>();
    vertices.forEach((p, i) => {
      if (!byX.has(p.x)) byX.set(p.x, []);
      if (!byY.has(p.y)) byY.set(p.y, []);
      byX.get(p.x)!.push(i);
      byY.get(p.y)!.push(i);
    });
    const faces: number[][] = [];
    for (const triangle of ShapeUtils.triangulateShape(outline, inner)) {
      // Earcut can bridge several holes on the same grid line and skip
      // intermediate vertices. Split those edges so caps and walls meet
      // exactly, without T junctions that a slicer would have to repair.
      const perimeter: number[] = [];
      for (let edge = 0; edge < 3; edge++) {
        const a = triangle[edge],
          b = triangle[(edge + 1) % 3];
        const p = vertices[a],
          q = vertices[b];
        perimeter.push(a);
        const vertical = p.x === q.x;
        const candidates = vertical
          ? byX.get(p.x)
          : p.y === q.y
            ? byY.get(p.y)
            : [];
        const axis = vertical ? "y" : "x";
        const between = (candidates || []).filter(
          (i) =>
            vertices[i][axis] > Math.min(p[axis], q[axis]) &&
            vertices[i][axis] < Math.max(p[axis], q[axis]),
        );
        between.sort(
          (a, b) =>
            (vertices[a][axis] - vertices[b][axis]) *
            Math.sign(q[axis] - p[axis]),
        );
        perimeter.push(...between);
      }
      if (perimeter.length === 3) faces.push(triangle);
      else {
        const center = vertices.length;
        vertices.push(
          new Vector2(
            triangle.reduce((sum, i) => sum + vertices[i].x, 0) / 3,
            triangle.reduce((sum, i) => sum + vertices[i].y, 0) / 3,
          ),
        );
        for (let i = 0; i < perimeter.length; i++)
          faces.push([
            center,
            perimeter[i],
            perimeter[(i + 1) % perimeter.length],
          ]);
      }
    }
    const offset = positions.length / 3;
    for (const z of [0, thickness])
      for (const p of vertices) positions.push(p.x, p.y, z);
    const n = vertices.length;
    for (const [a, b, c] of faces) {
      indices.push(
        offset + c,
        offset + b,
        offset + a,
        offset + n + a,
        offset + n + b,
        offset + n + c,
      );
    }
    let start = 0;
    for (const loop of [outline, ...inner]) {
      for (let i = 0; i < loop.length; i++) {
        const a = offset + start + i;
        const b = offset + start + ((i + 1) % loop.length);
        indices.push(a, b, b + n, a, b + n, a + n);
      }
      start += loop.length;
    }
  }

  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}

/** Each piece lies flat at the origin, in millimeters, ready for a slicer. */
export function printParts(masks: WallMask[], s: BoxSettings) {
  validateBox(s);
  if (
    masks.length !== 4 ||
    FACES.some(
      (face) => masks.filter((mask) => mask.face === face).length !== 1,
    )
  )
    throw new Error("Faltan paneles de la caja o hay paneles duplicados.");
  return PRINT_PARTS.map((part) => {
    const panel: WallMask =
      part.id === "front"
        ? {
            face: "top",
            span: s.width,
            depth: s.height,
            columns: 1,
            rows: 1,
            cells: new Uint8Array(1),
          }
        : printableMask(masks.find((mask) => mask.face === part.id)!);
    return {
      ...part,
      ...panelMesh(panel, s.thickness),
      width: panel.span * 10,
    };
  });
}

export function printMesh(masks: WallMask[], s: BoxSettings): PrintMesh {
  const parts = printParts(masks, s);
  const positions = new Float32Array(
    parts.reduce((sum, part) => sum + part.positions.length, 0),
  );
  const indices = new Uint32Array(
    parts.reduce((sum, part) => sum + part.indices.length, 0),
  );
  let positionOffset = 0,
    indexOffset = 0,
    origin = 0;
  for (const part of parts) {
    positions.set(part.positions, positionOffset);
    for (let i = 0; i < part.positions.length; i += 3)
      positions[positionOffset + i] += origin;
    for (let i = 0; i < part.indices.length; i++)
      indices[indexOffset + i] = part.indices[i] + positionOffset / 3;
    positionOffset += part.positions.length;
    indexOffset += part.indices.length;
    origin += part.width + 12;
  }
  return { positions, indices };
}
