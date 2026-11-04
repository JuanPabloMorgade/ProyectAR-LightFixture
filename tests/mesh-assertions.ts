import { expect } from "vitest";
import { Ray, Vector3 } from "three";
export function materialAt(
  mesh: { positions: Float32Array; indices: Uint32Array },
  point: number[],
) {
  const ray = new Ray(
    new Vector3(...point),
    new Vector3(1, 0.317, 0.193).normalize(),
  );
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

export function closed(mesh: {
  positions: Float32Array;
  indices: Uint32Array;
}) {
  const edges = new Map<string, { count: number; orientation: number }>();
  const adjacent = new Map<string, Set<string>>();
  let volume = 0;
  const degenerate: number[] = [];
  const vertex = (i: number) =>
    Array.from(mesh.positions.slice(i * 3, i * 3 + 3));
  const key = (p: number[]) => p.map((v) => v.toFixed(4)).join(",");
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = vertex(mesh.indices[i]),
      b = vertex(mesh.indices[i + 1]),
      c = vertex(mesh.indices[i + 2]);
    const u = b.map((v, j) => v - a[j]),
      v = c.map((v, j) => v - a[j]);
    const cross = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    if (
      !(cross.reduce((sum, n) => sum + n * n, 0) > 1e-14) &&
      degenerate.length < 10
    )
      degenerate.push(i / 3);
    volume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const x = key(p),
        y = key(q),
        k = x < y ? `${x}|${y}` : `${y}|${x}`;
      const entry = edges.get(k) ?? { count: 0, orientation: 0 };
      entry.count++;
      entry.orientation += x < y ? 1 : -1;
      edges.set(k, entry);
      if (!adjacent.has(x)) adjacent.set(x, new Set());
      if (!adjacent.has(y)) adjacent.set(y, new Set());
      adjacent.get(x)!.add(y);
      adjacent.get(y)!.add(x);
    }
  }
  // Check every triangle and edge, but report a bounded sample in one assertion.
  // Per-edge matcher overhead dominates detailed meshes with engraved lettering.
  expect(degenerate, "nondegenerate triangles (first 10 failures)").toEqual([]);
  const invalidEdges: { key: string; count: number; orientation: number }[] =
    [];
  for (const [key, e] of edges)
    if ((e.count !== 2 || e.orientation !== 0) && invalidEdges.length < 10)
      invalidEdges.push({ key, ...e });
  expect(
    invalidEdges,
    "closed edges and coherent winding (first 10 failures)",
  ).toEqual([]);
  expect(volume).toBeGreaterThan(0);
  const todo = [adjacent.keys().next().value!],
    seen = new Set<string>();
  while (todo.length) {
    const p = todo.pop()!;
    if (seen.has(p)) continue;
    seen.add(p);
    todo.push(...adjacent.get(p)!);
  }
  expect(seen.size, "single connected solid").toBe(adjacent.size);
}
