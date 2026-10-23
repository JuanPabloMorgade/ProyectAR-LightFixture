import { test } from "vitest";
import assert from "node:assert/strict";
import {
  IMAGE_SIZE,
  defaultBox,
  masksFromImage,
  wallToImage,
  imageToWall,
  maskSVG,
  printMesh,
} from "../src/features/shadowbox/engine.ts";

test("La proyección de ida y vuelta coincide en las cuatro paredes", () => {
  const s = defaultBox;
  for (const face of ["top", "bottom", "left", "right"])
    for (const [u, z] of [
      [0, 1],
      [2, 3],
      [-2, 3],
    ]) {
      const [x, y] = wallToImage(face, u, z, s);
      const hit = imageToWall(x, y, s);
      assert.equal(hit.face, face);
      assert.ok(Math.abs(hit.u - u) < 1e-9);
      assert.ok(Math.abs(hit.depth - z) < 1e-9);
    }
});

test("La máscara muestra aberturas y conserva el marco", () => {
  const s = { ...defaultBox, detail: 96 };
  const target = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  for (let y = 0; y < IMAGE_SIZE; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const i = (y * IMAGE_SIZE + x) * 4;
      const lit =
        Math.hypot(x - IMAGE_SIZE / 2, y - IMAGE_SIZE / 2) < IMAGE_SIZE * 0.3;
      target[i] = target[i + 1] = target[i + 2] = lit ? 255 : 0;
      target[i + 3] = 255;
    }
  const masks = masksFromImage(target, s);
  assert.equal(masks.length, 4);
  assert.ok(masks.some((m) => m.cells.some(Boolean)));
  for (const m of masks) {
    for (let x = 0; x < m.columns; x++) {
      assert.equal(m.cells[x], 0);
      assert.equal(m.cells[(m.rows - 1) * m.columns + x], 0);
    }
    const svg = maskSVG(m);
    assert.match(svg, /width="\d+mm"/);
    assert.match(svg, /fill-rule="evenodd"/);
  }
});

test("Las cinco piezas exportadas forman superficies cerradas y coherentes", () => {
  const s = { ...defaultBox, detail: 96 };
  const black = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  for (let i = 3; i < black.length; i += 4) black[i] = 255;
  const masks = masksFromImage(black, s),
    mesh = printMesh(masks, s);
  assert.ok(mesh.positions.length > 0 && mesh.indices.length > 0);
  const edges = new Map();
  let volume = 0;
  const key = (i) =>
    Array.from(mesh.positions.slice(i * 3, i * 3 + 3))
      .map((v) => v.toFixed(3))
      .join(",");
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const ids = Array.from(mesh.indices.slice(t, t + 3));
    for (let j = 0; j < 3; j++) {
      const a = key(ids[j]),
        b = key(ids[(j + 1) % 3]),
        edge = a < b ? `${a}|${b}` : `${b}|${a}`;
      const value = edges.get(edge) || { count: 0, dir: 0 };
      value.count++;
      value.dir += a < b ? 1 : -1;
      edges.set(edge, value);
    }
    const [a, b, c] = ids.map((i) =>
      Array.from(mesh.positions.slice(i * 3, i * 3 + 3)),
    );
    volume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
  }
  for (const edge of edges.values()) {
    assert.equal(edge.count, 2);
    assert.equal(edge.dir, 0);
  }
  assert.ok(volume > 0);
  assert.ok(mesh.positions.every(Number.isFinite));
});

test("Los paneles con recortes también conservan una malla cerrada", () => {
  const s = { ...defaultBox, detail: 96 };
  const target = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  for (let y = 0; y < IMAGE_SIZE; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const i = (y * IMAGE_SIZE + x) * 4;
      const open =
        Math.abs(x - IMAGE_SIZE / 2) < 75 || Math.abs(y - IMAGE_SIZE / 2) < 75;
      target[i] = target[i + 1] = target[i + 2] = open ? 255 : 0;
      target[i + 3] = 255;
    }
  const masks = masksFromImage(target, s),
    mesh = printMesh(masks, s);
  const edges = new Map();
  const key = (i) =>
    Array.from(mesh.positions.slice(i * 3, i * 3 + 3))
      .map((v) => v.toFixed(3))
      .join(",");
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const ids = Array.from(mesh.indices.slice(t, t + 3));
    for (let j = 0; j < 3; j++) {
      const a = key(ids[j]),
        b = key(ids[(j + 1) % 3]),
        k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const value = edges.get(k) || { count: 0, dir: 0 };
      value.count++;
      value.dir += a < b ? 1 : -1;
      edges.set(k, value);
    }
  }
  for (const edge of edges.values()) {
    assert.equal(edge.count, 2);
    assert.equal(edge.dir, 0);
  }
});
