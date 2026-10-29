import {
  IMAGE_SIZE,
  FACES,
  sourceDistance,
  wallToImage,
  type BoxSettings,
  type WallMask,
} from "./engine";
import type { Fabrication } from "./fabrication";
import { isWallMount } from "./enclosure-config";
import { wallMountLayout, wallMountParts, wallMountPoint } from "./wallmount";
import { projectionSettings } from "./projection-settings";
import type { Mesh } from "./solid-mesh";
import { wallSleeveMesh } from "./wall-seat";
import { fabricationPoint } from "./fabrication";
import { assemblyPosition } from "./assembly";

type Point = number[];

/** Clip a convex polygon, retaining the positive half-plane. */
function clip(polygon: Point[], distance: (p: Point) => number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length];
    const da = distance(a),
      db = distance(b);
    if (da >= 0) result.push(a);
    if (da >= 0 !== db >= 0) {
      const u = da / (da - db);
      result.push(a.map((v, j) => v + (b[j] - v) * u));
    }
  }
  return result;
}

/** Project actual opaque triangles from a point source onto the wall, in cm. */
export function meshShadow(mesh: Mesh, s: BoxSettings, blocked: Uint8Array) {
  const light = sourceDistance(s),
    size = IMAGE_SIZE;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    let polygon: Point[] = Array.from({ length: 3 }, (_, j) => {
      const k = mesh.indices[i + j] * 3;
      return [mesh.positions[k], mesh.positions[k + 1], mesh.positions[k + 2]];
    });
    polygon = clip(
      clip(polygon, (p) => p[2]),
      (p) => light - 0.0001 - p[2],
    );
    if (polygon.length < 3) continue;
    polygon = polygon.map(([x, y, z]) => {
      const scale = light / (light - z);
      return [
        ((x * scale) / (2 * s.radius) + 0.5) * size,
        (0.5 - (y * scale) / (2 * s.radius)) * size,
      ];
    });
    for (const edge of [
      (p: Point) => p[0],
      (p: Point) => size - p[0],
      (p: Point) => p[1],
      (p: Point) => size - p[1],
    ])
      polygon = clip(polygon, edge);
    if (polygon.length < 3) continue;
    const first = Math.max(
      0,
      Math.ceil(Math.min(...polygon.map((p) => p[1])) - 0.5),
    );
    const last = Math.min(
      size - 1,
      Math.floor(Math.max(...polygon.map((p) => p[1])) - 0.5),
    );
    for (let row = first; row <= last; row++) {
      const y = row + 0.5,
        xs: number[] = [];
      for (let j = 0; j < polygon.length; j++) {
        const a = polygon[j],
          b = polygon[(j + 1) % polygon.length];
        if (a[1] > y !== b[1] > y)
          xs.push(a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]));
      }
      if (xs.length < 2) continue;
      const left = Math.max(0, Math.ceil(Math.min(...xs) - 0.5));
      const right = Math.min(size - 1, Math.floor(Math.max(...xs) - 0.5));
      if (left <= right)
        blocked.fill(1, row * size + left, row * size + right + 1);
    }
  }
}

/** The same base, lids, tube and head exported as STL now occlude the point light. */
export function fixtureShadow(
  s: BoxSettings,
  f: Fabrication,
  artwork?: Uint8ClampedArray,
) {
  const blocked = new Uint8Array(IMAGE_SIZE * IMAGE_SIZE);
  if (!isWallMount(f)) return blocked;
  s = projectionSettings(s, f);
  const layout = wallMountLayout(s, f);
  for (const part of wallMountParts(s, f, artwork)) {
    const positions = new Float32Array(part.positions.length);
    for (let i = 0; i < positions.length; i += 3)
      positions.set(
        wallMountPoint(
          part.id,
          part.positions[i],
          part.positions[i + 1],
          part.positions[i + 2],
          s,
          f,
          layout,
        ),
        i,
      );
    meshShadow({ positions, indices: part.indices }, s, blocked);
  }
  for (const face of FACES) {
    const span =
      (face === "top" || face === "bottom" ? s.width : s.height) * 10;
    const sleeve = wallSleeveMesh(
      face,
      span,
      s.thickness,
      f.clearance,
      layout.panelStart,
      f.joints,
    );
    const positions = new Float32Array(sleeve.positions.length);
    const origin = assemblyPosition(face, s, false);
    for (let i = 0; i < positions.length; i += 3) {
      const p = fabricationPoint(
        face,
        sleeve.positions[i],
        sleeve.positions[i + 1],
        sleeve.positions[i + 2],
        s,
        f,
      );
      positions.set(
        p.map((v, axis) => v + origin[axis]),
        i,
      );
    }
    meshShadow({ positions, indices: sleeve.indices }, s, blocked);
  }
  return blocked;
}

/** Keep structural material in apertures wholly hidden by the printed fixture. */
export function reachableMasks(
  masks: WallMask[],
  s: BoxSettings,
  blocked: Uint8Array,
) {
  let apertureArea = 0,
    blockedArea = 0;
  const reachable = masks.map((mask) => {
    const cells = mask.cells.slice();
    const area = (mask.span * mask.depth) / (mask.columns * mask.rows);
    const shadowAt = (column: number, row: number) => {
      const p = wallToImage(
        mask.face,
        (column / mask.columns - 0.5) * mask.span,
        (row / mask.rows) * mask.depth,
        s,
      );
      if (!p) return false;
      const x = Math.floor((p[0] / (2 * s.radius) + 0.5) * IMAGE_SIZE);
      const y = Math.floor((0.5 - p[1] / (2 * s.radius)) * IMAGE_SIZE);
      return (
        x >= 0 &&
        x < IMAGE_SIZE &&
        y >= 0 &&
        y < IMAGE_SIZE &&
        !!blocked[y * IMAGE_SIZE + x]
      );
    };
    for (let y = 0; y < mask.rows; y++)
      for (let x = 0; x < mask.columns; x++) {
        const k = y * mask.columns + x;
        if (!cells[k]) continue;
        apertureArea += area;
        if (!shadowAt(x + 0.5, y + 0.5)) continue;
        blockedArea += area;
        if (
          [
            [0.02, 0.02],
            [0.98, 0.02],
            [0.02, 0.98],
            [0.98, 0.98],
          ].every(([dx, dy]) => shadowAt(x + dx, y + dy))
        )
          cells[k] = 0;
      }
    return { ...mask, cells };
  });
  return {
    masks: reachable,
    blockedApertureFraction: apertureArea ? blockedArea / apertureArea : 0,
  };
}

export function occludeSimulation(
  simulation: Uint8ClampedArray,
  blocked: Uint8Array,
) {
  const pixels = simulation.slice();
  let lit = 0,
    hidden = 0;
  for (let i = 0; i < blocked.length; i++) {
    if (simulation[i * 4] !== 249) continue;
    lit++;
    if (blocked[i]) {
      hidden++;
      pixels.set([26, 37, 42, 255], i * 4);
    }
  }
  return { pixels, hiddenFraction: lit ? hidden / lit : 0 };
}
