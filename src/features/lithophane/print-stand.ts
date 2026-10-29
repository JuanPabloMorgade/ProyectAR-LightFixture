import { validateSettings, type Settings } from "./mesh";
import type { Mesh } from "../shadowbox/solid-mesh";

export const STAND_LIFT = 3;
export const STAND_BASE = 1.2;
export const STAND_GAP = 0.2;
export const STAND_CONTACT = 0.8;
export const STAND_MARGIN = 4;
export const hasPrintStand = (s: Settings) => s.printStand !== false;
type Point = [number, number, number];

/** Prepared from createMesh's indexed grid; all photo faces retain their geometry.
 * Only the bottom boundary is subdivided to join short sacrificial contacts. */
export function createPrintStand(panel: Mesh, s: Settings) {
  validateSettings(s);
  const cols = Math.max(
    2,
    Math.round((s.resolution * s.width) / Math.max(s.width, s.height)),
  );
  const rows = Math.max(
    2,
    Math.round((s.resolution * s.height) / Math.max(s.width, s.height)),
  );
  const n = (cols + 1) * (rows + 1);
  if (
    panel.positions.length !== n * 6 ||
    panel.indices.length !== 12 * cols * rows + 12 * (cols + rows)
  )
    throw new Error(
      "La malla del panel no coincide con los ajustes del soporte.",
    );
  const bottom = panel.positions[1],
    bed = bottom - STAND_LIFT;
  const plate = bed + STAND_BASE,
    rail = bottom - STAND_GAP;
  const count = Math.max(2, Math.ceil(s.width / 35));
  const contacts = Array.from({ length: count }, (_, i) => {
    const center = (cols * (i + 0.5)) / count,
      half = (STAND_CONTACT * cols) / s.width / 2;
    return [center - half, center + half];
  });
  const values = [
    ...Array.from({ length: cols + 1 }, (_, i) => i),
    ...contacts.flat(),
  ];
  const samples = [...new Set(values.map((v) => +v.toFixed(8)))].sort(
    (a, b) => a - b,
  );
  const extra: number[] = [];
  const read = (id: number): Point => [
    panel.positions[id * 3],
    panel.positions[id * 3 + 1],
    panel.positions[id * 3 + 2],
  ];
  const interpolate = (v: number, back: boolean) => {
    const k = Math.min(cols - 1, Math.floor(v)),
      f = v - k,
      offset = back ? n : 0;
    const a = read(k + offset),
      b = read(k + 1 + offset);
    return a.map((x, i) => Math.fround(x + f * (b[i] - x))) as Point;
  };
  const radians = (s.angle * Math.PI) / 180;
  const radius = radians ? s.width / radians : 0;
  const edges = samples.map((v) => {
    const f = interpolate(v, false),
      b = interpolate(v, true);
    const add = (p: Point, back: boolean) => {
      if (Number.isInteger(v)) return v + (back ? n : 0);
      const id = panel.positions.length / 3 + extra.length / 3;
      extra.push(...p);
      return id;
    };
    // Match the photo's polygonal arc, including Float32 rounding at its grid
    // vertices. Analytic points between them would leave tiny sliver faces.
    const radial = (d: number): Point => {
      const k = Math.min(cols - 1, Math.floor(v)),
        fraction = v - k;
      const at = (column: number): Point => {
        const theta = (column / cols - 0.5) * radians;
        return radius
          ? [
              Math.fround((radius + d) * Math.sin(theta)),
              bottom,
              Math.fround((radius + d) * Math.cos(theta) - radius),
            ]
          : [
              Math.fround((column / cols - 0.5) * s.width),
              bottom,
              Math.fround(d),
            ];
      };
      const a = at(k),
        b = at(k + 1);
      return a.map((x, i) => Math.fround(x + fraction * (b[i] - x))) as Point;
    };
    return {
      v,
      fi: add(f, false),
      bi: add(b, true),
      points: [
        radial(-STAND_MARGIN),
        b,
        f,
        radial(s.max),
        radial(s.max + STAND_MARGIN),
      ],
    };
  });
  const firstRow: number[] = [],
    bottomFaces: number[] = [];
  for (let k = 0; k < cols; k++) {
    const segment = edges.filter((e) => e.v >= k && e.v <= k + 1);
    const d = k + cols + 2,
      c = d - 1;
    for (let i = 0; i < segment.length - 1; i++)
      firstRow.push(segment[i].fi, segment[i + 1].fi, d);
    firstRow.push(k, d, c);
    for (let i = 0; i < segment.length - 1; i++)
      firstRow.push(segment[i].bi, d + n, segment[i + 1].bi);
    firstRow.push(k + n, c + n, d + n);
  }
  const supportPositions: number[] = [];
  const same = (a: Point, b: Point) =>
    a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
  const polygon = (input: Point[]) => {
    const p = input.filter(
      (v, i) => !same(v, input[(i + input.length - 1) % input.length]),
    );
    for (let i = 1; i < p.length - 1; i++) {
      const [a, b, c] = [p[0], p[i], p[i + 1]];
      const u = b.map((v, k) => v - a[k]),
        v = c.map((v, k) => v - a[k]);
      const area =
        (u[1] * v[2] - u[2] * v[1]) ** 2 +
        (u[2] * v[0] - u[0] * v[2]) ** 2 +
        (u[0] * v[1] - u[1] * v[0]) ** 2;
      if (area > 1e-14) supportPositions.push(...a, ...b, ...c);
    }
  };
  const p = (i: number, band: number, y: number): Point => [
    edges[i].points[band][0],
    y,
    edges[i].points[band][2],
  ];
  const selected = edges
    .slice(0, -1)
    .map((e, i) =>
      contacts.some(
        ([a, b]) =>
          (e.v + edges[i + 1].v) / 2 > a && (e.v + edges[i + 1].v) / 2 < b,
      ),
    );
  const top = (i: number, a: number, b: number, y: number) =>
    polygon([p(i, a, y), p(i, b, y), p(i + 1, b, y), p(i + 1, a, y)]);
  const wall = (
    i: number,
    band: number,
    y0: number,
    y1: number,
    front: boolean,
  ) => {
    const face = [
      p(i, band, y0),
      p(i + 1, band, y0),
      p(i + 1, band, y1),
      p(i, band, y1),
    ];
    polygon(front ? face : face.reverse());
  };
  const end = (
    i: number,
    a: number,
    b: number,
    y0: number,
    y1: number,
    right: boolean,
  ) => {
    const face = [p(i, a, y0), p(i, a, y1), p(i, b, y1), p(i, b, y0)];
    polygon(right ? face : face.reverse());
  };
  for (let i = 0; i < edges.length - 1; i++) {
    for (let band = 0; band < 4; band++)
      polygon([
        p(i, band, bed),
        p(i + 1, band, bed),
        p(i + 1, band + 1, bed),
        p(i, band + 1, bed),
      ]);
    top(i, 0, 1, plate);
    top(i, 3, 4, plate);
    wall(i, 0, bed, plate, false);
    wall(i, 4, bed, plate, true);
    wall(i, 1, plate, rail, false);
    wall(i, 3, plate, rail, true);
    top(i, 2, 3, rail);
    if (selected[i]) {
      wall(i, 1, rail, bottom, false);
      wall(i, 2, rail, bottom, true);
      if (!selected[i - 1]) end(i, 1, 2, rail, bottom, false);
      if (!selected[i + 1]) end(i + 1, 1, 2, rail, bottom, true);
    } else {
      top(i, 1, 2, rail);
      bottomFaces.push(
        edges[i].fi,
        edges[i].bi,
        edges[i + 1].bi,
        edges[i].fi,
        edges[i + 1].bi,
        edges[i + 1].fi,
      );
    }
  }
  for (const [i, right] of [
    [0, false],
    [edges.length - 1, true],
  ] as const) {
    for (let band = 0; band < 4; band++)
      end(i, band, band + 1, bed, plate, right);
    end(i, 1, 2, plate, rail, right);
    end(i, 2, 3, plate, rail, right);
  }
  const photoPositions = new Float32Array(
    panel.positions.length + extra.length,
  );
  photoPositions.set(panel.positions);
  photoPositions.set(extra, panel.positions.length);
  const support: Mesh = {
    positions: new Float32Array(supportPositions),
    indices: Uint32Array.from(
      { length: supportPositions.length / 3 },
      (_, i) => i,
    ),
  };
  const surfaceEnd = cols * rows * 12;
  const chunks = [
    new Uint32Array(firstRow),
    panel.indices.subarray(cols * 12, surfaceEnd),
    new Uint32Array(bottomFaces),
    panel.indices.subarray(surfaceEnd + cols * 6),
  ];
  const positions = new Float32Array(
    photoPositions.length + support.positions.length,
  );
  positions.set(photoPositions);
  positions.set(support.positions, photoPositions.length);
  let offset = 0;
  const indices = new Uint32Array(
    chunks.reduce((sum, a) => sum + a.length, 0) + support.indices.length,
  );
  for (const chunk of chunks) {
    indices.set(chunk, offset);
    offset += chunk.length;
  }
  const vertexOffset = photoPositions.length / 3;
  for (const index of support.indices) indices[offset++] = index + vertexOffset;
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1],
      z = positions[i + 2];
    positions[i + 1] = -z;
    positions[i + 2] = y - bottom + STAND_LIFT;
  }
  return { printMesh: { positions, indices }, support, contactCount: count };
}

export function panelForPrinting(panel: Mesh, s: Settings): Mesh {
  return hasPrintStand(s) ? createPrintStand(panel, s).printMesh : panel;
}

export function printStandGuide(s: Settings) {
  return hasPrintStand(s)
    ? "El panel 01 se exporta de pie con base removible de 1,2 mm, elevación de 3 mm, separación de 0,2 mm y contactos de 0,8 mm. El soporte es parte del STL, no se coloca aparte. Revisá las primeras capas en el laminador y probá la separación con tu material y altura de capa. Después de imprimir, cortá los contactos al ras del borde inferior; no arranques el soporte de la foto. Retirá el soporte antes de montar el panel en la caja. Podés sumar brim si necesitás más adhesión."
    : "Soporte de impresión desactivado: el panel conserva su orientación original. Podés girarlo de pie y preparar la adhesión en el laminador.";
}
