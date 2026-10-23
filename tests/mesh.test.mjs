import test from "node:test";
import assert from "node:assert/strict";
import {
  createMesh,
  binarySTL,
  defaults,
  validateSettings,
} from "../src/features/lithophane/mesh.ts";
const pixels = new Uint8ClampedArray([
  0, 0, 0, 255, 255, 255, 255, 255, 128, 128, 128, 255, 0, 0, 0, 0,
]);
for (const angle of [0, 120, 180])
  test(`Malla cerrada y orientada: ${angle} grados`, () => {
    const m = createMesh(pixels, 2, 2, { ...defaults, resolution: 40, angle });
    const edges = new Map();
    let volume = 0;
    for (let t = 0; t < m.indices.length; t += 3) {
      const ids = Array.from(m.indices.slice(t, t + 3));
      for (let j = 0; j < 3; j++) {
        const a = ids[j],
          b = ids[(j + 1) % 3],
          key = [Math.min(a, b), Math.max(a, b)].join(":");
        const edge = edges.get(key) || { count: 0, sum: 0 };
        edge.count++;
        edge.sum += a < b ? 1 : -1;
        edges.set(key, edge);
      }
      const [a, b, c] = ids.map((i) =>
        Array.from(m.positions.slice(i * 3, i * 3 + 3)),
      );
      volume +=
        (a[0] * (b[1] * c[2] - b[2] * c[1]) +
          a[1] * (b[2] * c[0] - b[0] * c[2]) +
          a[2] * (b[0] * c[1] - b[1] * c[0])) /
        6;
    }
    for (const edge of edges.values()) {
      assert.equal(edge.count, 2);
      assert.equal(edge.sum, 0);
    }
    assert.ok(volume > 0);
    assert.ok(m.positions.every(Number.isFinite));
    const stl = binarySTL(m.positions, m.indices);
    assert.equal(stl.byteLength, 84 + (m.indices.length / 3) * 50);
    assert.equal(new DataView(stl).getUint32(80, true), m.indices.length / 3);
  });
test("Claros finos, oscuros gruesos y transparencia blanca", () => {
  const m = createMesh(pixels, 2, 2, { ...defaults, resolution: 40, angle: 0 });
  const z = [];
  for (let i = 2; i < m.positions.length / 2; i += 3) z.push(m.positions[i]);
  assert.ok(Math.abs(Math.min(...z) - defaults.min) < 0.0001);
  assert.ok(Math.abs(Math.max(...z) - defaults.max) < 0.0001);
});
test("Rechaza parámetros inválidos", () => {
  for (const settings of [
    { ...defaults, min: 4, max: 2 },
    { ...defaults, width: NaN },
    { ...defaults, resolution: 10000 },
    { ...defaults, height: 0 },
  ])
    assert.throws(() => validateSettings(settings));
});
