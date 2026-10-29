export type Mesh = { positions: Float32Array; indices: Uint32Array };
export type Point = [number, number];
export type Bounds = [number, number, number, number, number, number];

const axis = (a: number[]) =>
  [...new Set(a.map((v) => +v.toFixed(8)))].sort((a, b) => a - b);

/** Keep exact feature boundaries; avoid tiny slivers when adding curved samples. */
export function meshAxes(
  required: number[],
  extra: number[] = [],
  minimumGap = 0,
) {
  const values = axis(required);
  for (const v of axis(extra))
    if (!values.some((q) => Math.abs(q - v) < minimumGap - 1e-8))
      values.push(v);
  return axis(values);
}
const inside = (b: Bounds, x: number, y: number, z: number) =>
  x > b[0] && x < b[1] && y > b[2] && y < b[3] && z > b[4] && z < b[5];

/** Exact rectilinear union/difference. Shared grid eliminates internal faces and T-junctions. */
export function solidMesh(
  boxes: Bounds[],
  cuts: Bounds[] = [],
  outline?: Point[],
  plateHeight = 0,
  extraAxes?: {
    xs: number[];
    ys: number[];
    zs?: number[];
    minimumGap?: number;
  },
): Mesh {
  const xs = meshAxes(
    [
      ...boxes.flatMap((b) => [b[0], b[1]]),
      ...cuts.flatMap((b) => [b[0], b[1]]),
      ...(outline?.map((p) => p[0]) ?? []),
    ],
    extraAxes?.xs,
    extraAxes?.minimumGap,
  );
  const ys = meshAxes(
    [
      ...boxes.flatMap((b) => [b[2], b[3]]),
      ...cuts.flatMap((b) => [b[2], b[3]]),
      ...(outline?.map((p) => p[1]) ?? []),
    ],
    extraAxes?.ys,
    extraAxes?.minimumGap,
  );
  const zs = meshAxes(
    [
      ...boxes.flatMap((b) => [b[4], b[5]]),
      ...cuts.flatMap((b) => [b[4], b[5]]),
      ...(outline ? [0, plateHeight] : []),
    ],
    extraAxes?.zs,
    extraAxes?.minimumGap,
  );
  function inOutline(x: number, y: number) {
    let hit = false;
    for (let i = 0, j = outline!.length - 1; i < outline!.length; j = i++) {
      const a = outline![i],
        b = outline![j];
      if (
        a[1] > y !== b[1] > y &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
      )
        hit = !hit;
    }
    return hit;
  }
  return gridSolidMesh(
    xs,
    ys,
    zs,
    (px, py, pz) =>
      (boxes.some((b) => inside(b, px, py, pz)) ||
        (!!outline && pz > 0 && pz < plateHeight && inOutline(px, py))) &&
      !cuts.some((b) => inside(b, px, py, pz)),
  );
}

export function gridSolidMesh(
  xs: number[],
  ys: number[],
  zs: number[],
  solid: (x: number, y: number, z: number) => boolean,
): Mesh {
  const nx = xs.length - 1,
    ny = ys.length - 1,
    nz = zs.length - 1;
  const cells = new Uint8Array(nx * ny * nz);
  const at = (x: number, y: number, z: number) =>
    x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz
      ? 0
      : cells[(z * ny + y) * nx + x];
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        const px = (xs[x] + xs[x + 1]) / 2,
          py = (ys[y] + ys[y + 1]) / 2,
          pz = (zs[z] + zs[z + 1]) / 2;
        cells[(z * ny + y) * nx + x] = +solid(px, py, pz);
      }
  const positions: number[] = [],
    indices: number[] = [];
  function quad(a: number[], b: number[], c: number[], d: number[]) {
    const n = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++)
        if (at(x, y, z)) {
          const a = xs[x],
            b = xs[x + 1],
            c = ys[y],
            d = ys[y + 1],
            e = zs[z],
            f = zs[z + 1];
          if (!at(x - 1, y, z))
            quad([a, c, e], [a, c, f], [a, d, f], [a, d, e]);
          if (!at(x + 1, y, z))
            quad([b, c, e], [b, d, e], [b, d, f], [b, c, f]);
          if (!at(x, y - 1, z))
            quad([a, c, e], [b, c, e], [b, c, f], [a, c, f]);
          if (!at(x, y + 1, z))
            quad([a, d, e], [a, d, f], [b, d, f], [b, d, e]);
          if (!at(x, y, z - 1))
            quad([a, c, e], [a, d, e], [b, d, e], [b, c, e]);
          if (!at(x, y, z + 1))
            quad([a, c, f], [b, c, f], [b, d, f], [a, d, f]);
        }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
