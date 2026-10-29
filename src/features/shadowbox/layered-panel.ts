import { panelMesh, type WallMask } from "./engine";
import type { Mesh } from "./solid-mesh";

/** Exact stepped extrusion: triangulate outlines instead of every flat grid cell. */
export function layeredPanelMesh(
  xs: number[],
  ys: number[],
  zs: number[],
  solid: (x: number, y: number, z: number) => boolean,
): Mesh {
  const columns = xs.length - 1,
    rows = ys.length - 1;
  const layers = zs.slice(0, -1).map((z, k) => {
    const cells = new Uint8Array(columns * rows);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++)
        cells[y * columns + x] = +!solid(
          (xs[x] + xs[x + 1]) / 2,
          (ys[y] + ys[y + 1]) / 2,
          (z + zs[k + 1]) / 2,
        );
    return cells;
  });
  const positions: number[] = [];
  const emit = (
    cells: Uint8Array,
    bottom: number,
    height: number,
    surface: "side" | "up" | "down",
  ) => {
    const mask: WallMask = {
      face: "top",
      columns,
      rows,
      cells,
      span: xs.at(-1)! / 10,
      depth: ys.at(-1)! / 10,
    };
    const mesh = panelMesh(mask, height, xs, ys);
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const ids = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
      const lower = ids.every((v) => mesh.positions[v * 3 + 2] === 0);
      const upper = ids.every(
        (v) => Math.abs(mesh.positions[v * 3 + 2] - height) < 1e-6,
      );
      if (
        surface === "side" ? lower || upper : surface === "up" ? !upper : !lower
      )
        continue;
      for (const v of ids)
        positions.push(
          mesh.positions[v * 3],
          mesh.positions[v * 3 + 1],
          surface === "side" ? bottom + mesh.positions[v * 3 + 2] : bottom,
        );
    }
  };
  for (let k = 0; k < layers.length; k++)
    emit(layers[k], zs[k], zs[k + 1] - zs[k], "side");
  for (let k = 0; k < zs.length; k++) {
    const below = layers[k - 1],
      above = layers[k];
    const up = new Uint8Array(columns * rows).fill(1),
      down = up.slice();
    for (let i = 0; i < up.length; i++) {
      if (below?.[i] === 0 && above?.[i] !== 0) up[i] = 0;
      if (above?.[i] === 0 && below?.[i] !== 0) down[i] = 0;
    }
    if (up.includes(0)) emit(up, zs[k], 1, "up");
    if (down.includes(0)) emit(down, zs[k], 1, "down");
  }
  return conformEdges(positions);
}

/** Split straight seams at every shared boundary vertex across neighboring slabs. */
function conformEdges(raw: number[]): Mesh {
  const points = Array.from({ length: raw.length / 3 }, (_, i) =>
    raw.slice(i * 3, i * 3 + 3),
  );
  const lineKey = (p: number[], axis: number) =>
    p
      .filter((_, i) => i !== axis)
      .map((v) => v.toFixed(5))
      .join(",");
  const lines = [0, 1, 2].map((axis) => {
    const map = new Map<string, Map<number, number[]>>();
    for (const p of points) {
      const key = lineKey(p, axis);
      if (!map.has(key)) map.set(key, new Map());
      map.get(key)!.set(p[axis], p);
    }
    return new Map(
      [...map].map(([key, values]) => [
        key,
        [...values.values()].sort((a, b) => a[axis] - b[axis]),
      ]),
    );
  });
  const positions: number[] = [],
    indices: number[] = [];
  const triangle = (a: number[], b: number[], c: number[]) => {
    const n = positions.length / 3;
    positions.push(...a, ...b, ...c);
    indices.push(n, n + 1, n + 2);
  };
  for (let i = 0; i < points.length; i += 3) {
    const face = points.slice(i, i + 3),
      perimeter: number[][] = [];
    for (let edge = 0; edge < 3; edge++) {
      const a = face[edge],
        b = face[(edge + 1) % 3];
      perimeter.push(a);
      const axes = [0, 1, 2].filter(
        (axis) => Math.abs(a[axis] - b[axis]) > 1e-5,
      );
      if (axes.length !== 1) continue;
      const axis = axes[0],
        low = Math.min(a[axis], b[axis]),
        high = Math.max(a[axis], b[axis]);
      const candidates = lines[axis].get(lineKey(a, axis))!;
      // Binary search prevents scanning a whole long seam for each short edge.
      let l = 0,
        r = candidates.length;
      while (l < r) {
        const m = (l + r) >>> 1;
        if (candidates[m][axis] <= low + 1e-5) l = m + 1;
        else r = m;
      }
      const between: number[][] = [];
      while (l < candidates.length && candidates[l][axis] < high - 1e-5)
        between.push(candidates[l++]);
      perimeter.push(...(a[axis] < b[axis] ? between : between.reverse()));
    }
    if (perimeter.length === 3)
      triangle(...(face as [number[], number[], number[]]));
    else {
      const center = [0, 1, 2].map(
        (axis) => face.reduce((n, p) => n + p[axis], 0) / 3,
      );
      for (let j = 0; j < perimeter.length; j++)
        triangle(center, perimeter[j], perimeter[(j + 1) % perimeter.length]);
    }
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
