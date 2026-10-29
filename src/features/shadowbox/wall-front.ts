import { type BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import { cobLayout, wallFrameBand } from "./cob";
import { gridSolidMesh, type Point } from "./solid-mesh";
import { wallMountLayout } from "./wallmount";
import { headDockSlots } from "./head-mount";

const axes = (values: number[]) =>
  [...new Set(values.map((v) => +v.toFixed(5)))]
    .sort((a, b) => a - b)
    .filter((v, i, a) => i === 0 || v - a[i - 1] > 0.001);
export function wallFrontMesh(
  s: BoxSettings,
  f: Fabrication,
  outline: Point[],
) {
  const l = wallMountLayout(s, f),
    w = l.width,
    h = l.height,
    t = s.thickness;
  const band = wallFrameBand(f, s.margin, t);
  const cob = f.illumination === "cob" ? cobLayout(l.s, f) : undefined;
  const pockets = cob
    ? cob.footprints.flatMap(({ pocket, marker }) => [
        { ...pocket, depth: f.cob?.recessDepth ?? 0.4 },
        { ...marker, depth: Math.min(0.2, f.cob?.recessDepth ?? 0.4) },
      ])
    : f.illumination === "modular"
      ? headDockSlots(w, s.height * 10, f.clearance, t)
      : [];
  const xs = axes([
    0,
    w,
    band,
    w - band,
    ...outline.map((p) => p[0]),
    ...pockets.flatMap((r) => [
      w / 2 + r.x - r.width / 2,
      w / 2 + r.x + r.width / 2,
    ]),
  ]);
  const ys = axes([
    0,
    h,
    band,
    h - band,
    ...outline.map((p) => p[1]),
    ...pockets.flatMap((r) => [
      h / 2 + r.y - r.height / 2,
      h / 2 + r.y + r.height / 2,
    ]),
  ]);
  const columns = xs.length - 1,
    rows = ys.length - 1;
  const tops = new Float64Array(columns * rows),
    bottoms = new Float64Array(columns * rows);
  function inside(x: number, y: number) {
    let hit = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i],
        b = outline[j];
      if (
        a[1] > y !== b[1] > y &&
        x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
      )
        hit = !hit;
    }
    return hit;
  }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const px = (xs[x] + xs[x + 1]) / 2,
        py = (ys[y] + ys[y + 1]) / 2,
        k = y * columns + x;
      if (
        !inside(px, py) ||
        (px > band && px < w - band && py > band && py < h - band)
      )
        continue;
      tops[k] = t + 1;
      for (const r of pockets)
        if (
          Math.abs(px - w / 2 - r.x) < r.width / 2 &&
          Math.abs(py - h / 2 - r.y) < r.height / 2
        )
          bottoms[k] = Math.max(bottoms[k], r.depth);
    }
  const mx = new Map(xs.slice(0, -1).map((v, i) => [(v + xs[i + 1]) / 2, i]));
  const my = new Map(ys.slice(0, -1).map((v, i) => [(v + ys[i + 1]) / 2, i]));
  return gridSolidMesh(
    xs,
    ys,
    axes([0, ...pockets.map((r) => r.depth), t, t + 1]),
    (x, y, z) => {
      const k = my.get(y)! * columns + mx.get(x)!;
      return tops[k] > 0 && z > bottoms[k] && z < tops[k];
    },
  );
}
