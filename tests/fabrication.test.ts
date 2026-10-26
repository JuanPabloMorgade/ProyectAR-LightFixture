import { expect, test } from "vitest";
import { Ray, Vector3 } from "three";
import { assemblyPosition } from "../src/features/shadowbox/assembly";
import {
  defaultBox,
  IMAGE_SIZE,
  masksFromImage,
} from "../src/features/shadowbox/engine";
import {
  defaultFabrication,
  fabricationParts,
  fabricationPoint,
  ledLayout,
  assemblyMesh,
  fabricationMasks,
} from "../src/features/shadowbox/fabrication";
import { buildSTLExport } from "../src/features/shadowbox/stl-export";

function closedMesh(part: { positions: Float32Array; indices: Uint32Array }) {
  const edges = new Map<string, { count: number; direction: number }>();
  const neighbors = new Map<string, Set<string>>();
  let volume = 0;
  for (let i = 0; i < part.indices.length; i += 3) {
    const points = Array.from(part.indices.slice(i, i + 3), (n) =>
      Array.from(part.positions.slice(n * 3, n * 3 + 3)),
    );
    expect(points.flat().every(Number.isFinite)).toBe(true);
    const [a, b, c] = points;
    const ab = b.map((v, j) => v - a[j]),
      ac = c.map((v, j) => v - a[j]);
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    expect(Math.hypot(...cross)).toBeGreaterThan(1e-7);
    volume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    const keys = points.map((p) => p.map((v) => v.toFixed(4)).join(","));
    for (let e = 0; e < 3; e++) {
      const a = keys[e],
        b = keys[(e + 1) % 3];
      const key = [a, b].sort().join("|");
      if (!neighbors.has(a)) neighbors.set(a, new Set());
      if (!neighbors.has(b)) neighbors.set(b, new Set());
      neighbors.get(a)!.add(b);
      neighbors.get(b)!.add(a);
      const found = edges.get(key) ?? { count: 0, direction: 0 };
      found.count++;
      found.direction += a < b ? 1 : -1;
      edges.set(key, found);
    }
  }
  for (const [key, edge] of edges) {
    expect(edge.count, `unclosed edge ${key}`).toBe(2);
    expect(edge.direction, `winding ${key}`).toBe(0);
  }
  expect(volume).toBeGreaterThan(0);
  const visited = new Set<string>(),
    queue = [neighbors.keys().next().value!];
  while (queue.length) {
    const vertex = queue.pop()!;
    if (visited.has(vertex)) continue;
    visited.add(vertex);
    queue.push(
      ...[...neighbors.get(vertex)!].filter((key) => !visited.has(key)),
    );
  }
  expect(visited.size, "all material must belong to one connected piece").toBe(
    neighbors.size,
  );
}

for (const ledCount of [1, 2, 3] as const)
  test(`el prototipo de ${ledCount} LED genera cinco sólidos cerrados y coloca las luces a la altura configurada`, () => {
    const s = { ...defaultBox, detail: 96 };
    const f = { ...defaultFabrication, ledCount };
    const masks = masksFromImage(
      new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4),
      s,
    );
    const parts = fabricationParts(masks, s, f);
    expect(parts).toHaveLength(5);
    for (const part of parts) closedMesh(part);
    const layout = ledLayout(s, f);
    expect(layout.centers).toHaveLength(ledCount);
    expect(layout.centers.reduce((a, b) => a + b, 0)).toBeCloseTo(0);
    const worldTip =
      s.depth +
      fabricationPoint("front", 0, 0, layout.floor + f.ledHeight, s, f)[2];
    expect(worldTip).toBeCloseTo((s.depth * s.lightPercent) / 100);
    expect(layout.floor).toBeGreaterThan(s.thickness);
    expect(layout.pocketRadius * 2).toBeCloseTo(5.45);
    expect(
      buildSTLExport({
        settings: s,
        masks,
        fabrication: f,
        mode: "separate",
        name: "Prueba",
      }).buffer.byteLength,
    ).toBeGreaterThan(1000);
  });

test("rechaza configuraciones que no dejan espacio para el soporte o medidas LED inválidas", () => {
  expect(() =>
    ledLayout({ ...defaultBox, lightPercent: 95 }, defaultFabrication),
  ).toThrow(/altura/);
  expect(() =>
    ledLayout(defaultBox, { ...defaultFabrication, ledCount: 4 as 1 }),
  ).toThrow(/medidas/);
  expect(() =>
    ledLayout(defaultBox, { ...defaultFabrication, flangeDiameter: 4 }),
  ).toThrow(/medidas/);
  expect(() =>
    ledLayout(defaultBox, { ...defaultFabrication, clearance: NaN }),
  ).toThrow(/medidas/);
});

test("los recortes, los encastres y los asientos siguen cerrados en una caja rectangular", () => {
  const s = {
    ...defaultBox,
    width: 18,
    height: 12,
    depth: 8,
    lightPercent: 75,
    detail: 96,
  };
  const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  for (let y = 0; y < IMAGE_SIZE; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const angle = Math.atan2(y - IMAGE_SIZE / 2, x - IMAGE_SIZE / 2);
      const lit =
        Math.sin(angle * 9) > 0 &&
        Math.hypot(x - IMAGE_SIZE / 2, y - IMAGE_SIZE / 2) > 30;
      const n = (y * IMAGE_SIZE + x) * 4;
      image[n] = image[n + 1] = image[n + 2] = lit ? 255 : 0;
      image[n + 3] = 255;
    }
  const masks = masksFromImage(image, s);
  const parts = fabricationParts(masks, s, {
    ...defaultFabrication,
    ledCount: 3,
  });
  for (const part of parts) {
    closedMesh(part);
    closedMesh(assemblyMesh(part, s, defaultFabrication));
  }
  const plain = fabricationParts(masks, s, {
    ...defaultFabrication,
    joints: false,
  });
  for (const part of plain) closedMesh(part);
  expect(plain[0].positions.length).not.toBe(parts[0].positions.length);
});

test("las lengüetas y la tapa no se interpenetran en los puntos de encastre ensamblados", () => {
  const s = { ...defaultBox, detail: 96 },
    f = defaultFabrication;
  const masks = masksFromImage(
    new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4),
    s,
  );
  const parts = fabricationParts(masks, s, f).map((part) => {
    const mesh = assemblyMesh(part, s, f);
    const offset = assemblyPosition(part.id, s, false);
    for (let i = 0; i < mesh.positions.length; i++)
      mesh.positions[i] += offset[i % 3];
    return mesh;
  });
  function inside(
    mesh: { positions: Float32Array; indices: Uint32Array },
    p: Vector3,
  ) {
    const ray = new Ray(p, new Vector3(1, 0.317, 0.193).normalize());
    const a = new Vector3(),
      b = new Vector3(),
      c = new Vector3(),
      hit = new Vector3();
    let hits = 0;
    for (let i = 0; i < mesh.indices.length; i += 3) {
      a.fromArray(mesh.positions, mesh.indices[i] * 3);
      b.fromArray(mesh.positions, mesh.indices[i + 1] * 3);
      c.fromArray(mesh.positions, mesh.indices[i + 2] * 3);
      if (ray.intersectTriangle(a, b, c, false, hit)) hits++;
    }
    return hits % 2 === 1;
  }
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const z of [0.4, 1.6, 2.8, 4, 5.2]) {
        const point = new Vector3(
          sx * (s.width / 2 - 0.025),
          sy * (s.height / 2 - 0.025),
          z,
        );
        expect(parts.filter((part) => inside(part, point))).toHaveLength(1);
      }
  for (const x of [-s.width / 4, 0, s.width / 4, s.width / 8]) {
    const point = new Vector3(x, s.height / 2, s.depth);
    expect(parts.filter((part) => inside(part, point))).toHaveLength(1);
  }
});

test("el refuerzo de los encastres se refleja en las máscaras y es idempotente", () => {
  const s = { ...defaultBox, detail: 96 };
  const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4).fill(255);
  const raw = masksFromImage(image, s);
  const masks = fabricationMasks(raw, s, defaultFabrication);
  expect(fabricationMasks(masks, s, defaultFabrication)).toEqual(masks);
  for (const mask of masks)
    for (let x = 0; x < mask.columns; x++) {
      const u = ((x + 0.5) * mask.span * 10) / mask.columns;
      if (u < s.thickness / 2 + defaultFabrication.clearance / 2 + 1.2)
        for (let y = 0; y < mask.rows; y++)
          expect(mask.cells[y * mask.columns + x]).toBe(0);
    }
});
