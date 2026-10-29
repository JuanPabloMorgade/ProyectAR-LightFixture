import { expect, test } from "vitest";
import { layeredPanelMesh } from "../src/features/shadowbox/layered-panel";
import { gridSolidMesh } from "../src/features/shadowbox/solid-mesh";
import { closed, materialAt } from "./mesh-assertions";

test("flat panel keeps exact size and closed seams without tessellating its interior", () => {
  const xs = Array.from({ length: 101 }, (_, i) => i / 10);
  const mesh = layeredPanelMesh(xs, xs, [0, 2], () => true);
  closed(mesh);
  expect(mesh.indices.length / 3).toBe(12);
  expect(materialAt(mesh, [5, 5, 1])).toBe(true);
  expect(materialAt(mesh, [5, 5, 2.01])).toBe(false);
});

test("stepped grooves, a through hole and unequal slab outlines retain their material and manifold edges", () => {
  const xs = [-2, 0, 1, 2, 3, 4, 5, 6, 8];
  const ys = [-4, -3, -2, -1, 0, 1, 2, 4, 6];
  const zs = [0, 0.7, 1.3, 2];
  const solid = (x: number, y: number, z: number) =>
    !(x > 2 && x < 4 && y > 1 && y < 4) &&
    !(z > 0.7 && x > 0 && x < 1 && y < -1) &&
    !(z > 1.3 && x > 5 && y < 0);
  const mesh = layeredPanelMesh(xs, ys, zs, solid);
  closed(mesh);
  const reference = gridSolidMesh(xs, ys, zs, solid);
  for (let x = 0; x < xs.length - 1; x++)
    for (let y = 0; y < ys.length - 1; y++)
      for (let z = 0; z < zs.length - 1; z++) {
        const p = [
          (xs[x] + xs[x + 1]) / 2,
          (ys[y] + ys[y + 1]) / 2,
          (zs[z] + zs[z + 1]) / 2,
        ];
        expect(materialAt(mesh, p)).toBe(materialAt(reference, p));
      }
});
