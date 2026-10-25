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
  printableMask,
  simulatedImage,
} from "../src/features/shadowbox/engine.ts";

function radialArtwork() {
  const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  for (let y = 0; y < IMAGE_SIZE; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const px = ((x + 0.5) / IMAGE_SIZE - 0.5) * 110;
      const py = (0.5 - (y + 0.5) / IMAGE_SIZE) * 110;
      const lit =
        Math.hypot(px, py) < 44 && Math.sin(Math.atan2(py, px) * 9) > 0;
      const i = (y * IMAGE_SIZE + x) * 4;
      image[i] = image[i + 1] = image[i + 2] = lit ? 255 : 0;
      image[i + 3] = 255;
    }
  return image;
}

test("Alto mejora el detalle proyectado y conserva el tamaño físico del marco", () => {
  const image = radialArtwork();
  const settings = { ...defaultBox, detail: 224 };
  const high = masksFromImage(image, settings);
  assert.equal(high[0].columns, 896);
  assert.equal(high[0].rows, 358);
  // Reproduce the previous high-detail grid using the same artwork and optics.
  const legacy = high.map((mask) => {
    const columns = 224,
      rows = 90;
    const cells = new Uint8Array(columns * rows);
    for (let row = 2; row < rows - 2; row++)
      for (let col = 2; col < columns - 2; col++) {
        const depth = ((row + 0.5) / rows) * settings.depth;
        if (
          depth >=
          (settings.depth * settings.lightPercent) / 100 - settings.margin / 10
        )
          continue;
        const p = wallToImage(
          mask.face,
          ((col + 0.5) / columns - 0.5) * mask.span,
          depth,
          settings,
        );
        if (!p || Math.hypot(...p) > settings.radius) continue;
        const x = Math.floor((p[0] / 110 + 0.5) * IMAGE_SIZE);
        const y = Math.floor((0.5 - p[1] / 110) * IMAGE_SIZE);
        if (x >= 0 && x < IMAGE_SIZE && y >= 0 && y < IMAGE_SIZE)
          cells[row * columns + col] =
            image[(y * IMAGE_SIZE + x) * 4] >= 128 ? 1 : 0;
      }
    return { ...mask, columns, rows, cells };
  });
  const error = (masks) => {
    const sim = simulatedImage(masks, settings);
    let differences = 0;
    for (let y = 0; y < IMAGE_SIZE; y++)
      for (let x = 0; x < IMAGE_SIZE; x++) {
        const radius = Math.hypot(
          ((x + 0.5) / IMAGE_SIZE - 0.5) * 110,
          (0.5 - (y + 0.5) / IMAGE_SIZE) * 110,
        );
        if (radius < 20 || radius > 43) continue;
        const i = (y * IMAGE_SIZE + x) * 4;
        if (sim[i] > 100 !== image[i] > 100) differences++;
      }
    return differences;
  };
  assert.ok(error(high) < error(legacy) * 0.65);
  // Refinement must not make the original 2-cell structural border thinner.
  for (const mask of high)
    for (let y = 0; y < mask.rows; y++)
      for (let x = 0; x < 8; x++) {
        assert.equal(mask.cells[y * mask.columns + x], 0);
        assert.equal(mask.cells[y * mask.columns + mask.columns - 1 - x], 0);
      }
});

test("La proyección y los exportadores eliminan las mismas islas sueltas", () => {
  const raw = {
    face: "top",
    span: 15,
    depth: 6,
    columns: 7,
    rows: 7,
    cells: new Uint8Array(49),
  };
  for (let y = 1; y < 6; y++)
    for (let x = 1; x < 6; x++) raw.cells[y * 7 + x] = 1;
  raw.cells[3 * 7 + 3] = 0;
  const ready = printableMask(raw);
  assert.equal(raw.cells[24], 0);
  assert.equal(ready.cells[24], 1);
  const masks = ["top", "bottom", "left", "right"].map((face) => ({
    ...raw,
    face,
  }));
  const cleaned = masks.map(printableMask);
  assert.deepEqual(
    simulatedImage(masks, defaultBox),
    simulatedImage(cleaned, defaultBox),
  );
  assert.equal(maskSVG(raw), maskSVG(ready));
  assert.deepEqual(
    printMesh(masks, defaultBox),
    printMesh(cleaned, defaultBox),
  );
});

test("El STL de detalle Alto es cerrado, mantiene el volumen y evita caras por celda", () => {
  const settings = { ...defaultBox, detail: 224 };
  const masks = masksFromImage(radialArtwork(), settings);
  const mesh = printMesh(masks, settings);
  assert.ok(mesh.indices.length / 3 < 50000);
  const edges = new Map();
  let volume = 0;
  const point = (i) => Array.from(mesh.positions.slice(i * 3, i * 3 + 3));
  const key = (i) =>
    point(i)
      .map((v) => v.toFixed(4))
      .join(",");
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const ids = Array.from(mesh.indices.slice(t, t + 3));
    for (let j = 0; j < 3; j++) {
      const a = key(ids[j]),
        b = key(ids[(j + 1) % 3]);
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      const edge = edges.get(k) || { count: 0, dir: 0 };
      edge.count++;
      edge.dir += a < b ? 1 : -1;
      edges.set(k, edge);
    }
    const [a, b, c] = ids.map(point);
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
  const expected =
    masks.reduce(
      (sum, m) =>
        sum +
        m.cells.reduce((n, cut) => n + 1 - cut, 0) *
          ((m.span * 10) / m.columns) *
          ((m.depth * 10) / m.rows) *
          settings.thickness,
      0,
    ) +
    settings.width * settings.height * 100 * settings.thickness;
  assert.ok(Math.abs(volume - expected) / expected < 1e-5);
});

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
