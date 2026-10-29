import type { Mesh } from "./solid-mesh";

export const REAR_CORNER_RADIUS = 2;
export const LID_CORNER_RADIUS = 1;
export const SOCKET_CHAMFER = 0.3;

export function cornerSamples(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  r: number,
) {
  const ds = [
    0,
    r,
    ...[1, 2, 3].map((i) => r * (1 - Math.tan((i * Math.PI) / 16))),
  ];
  return {
    xs: ds.flatMap((d) => [x0 + d, x1 - d]),
    ys: ds.flatMap((d) => [y0 + d, y1 - d]),
  };
}

/** Round external XY corners only; straight dimensions and interior seats stay fixed. */
export function roundCorners(
  mesh: Mesh,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  r: number,
  bottomOnly = false,
): Mesh {
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i],
      y = positions[i + 1];
    const sx = x < x0 + r ? -1 : x > x1 - r ? 1 : 0;
    const sy = y < y0 + r ? -1 : !bottomOnly && y > y1 - r ? 1 : 0;
    if (!sx || !sy) continue;
    const cx = sx < 0 ? x0 + r : x1 - r,
      cy = sy < 0 ? y0 + r : y1 - r;
    const dx = x - cx,
      dy = y - cy,
      q = Math.max(Math.abs(dx), Math.abs(dy));
    if (q > r + 1e-4 || q < 1e-8) continue;
    const scale = q / Math.hypot(dx, dy);
    positions[i] = cx + dx * scale;
    positions[i + 1] = cy + dy * scale;
  }
  return { ...mesh, positions };
}

function keyholeRadius(
  angle: number,
  entry: number,
  neck: number,
  height: number,
  rounded: boolean,
) {
  const x = Math.abs(Math.cos(angle)),
    y = Math.sin(angle),
    r = entry / 2,
    n = neck / 2;
  const opening = rounded
    ? r
    : Math.min(r / Math.max(x, 1e-12), 4 / Math.max(Math.abs(y), 1e-12));
  if (y <= 0) return opening;
  if (!rounded)
    return Math.max(opening, Math.min(n / Math.max(x, 1e-12), height / y));
  const side = n / Math.max(x, 1e-12),
    capCenter = height - n;
  const stem =
    side * y <= capCenter
      ? side
      : capCenter * y +
        Math.sqrt(Math.max(0, n * n - capCenter * capCenter * x * x));
  return Math.max(opening, stem);
}

/** Sample the desired round entry and capsule neck onto the original rectangular grid. */
export function keyholeSamples(
  cx: number,
  cy: number,
  entry: number,
  neck: number,
  height: number,
) {
  const points = Array.from({ length: 64 }, (_, i) => {
    const angle = (i * 2 * Math.PI) / 64;
    return [Math.cos(angle), Math.sin(angle)];
  });
  for (let i = 0; i <= 24; i++) {
    const a = (i * Math.PI) / 24;
    const x = (neck / 2) * Math.cos(a),
      y = height - neck / 2 + (neck / 2) * Math.sin(a),
      d = Math.hypot(x, y);
    points.push([x / d, y / d]);
  }
  return {
    xs: points.map(
      ([x, y]) =>
        cx + x * keyholeRadius(Math.atan2(y, x), entry, neck, height, false),
    ),
    ys: points.map(
      ([x, y]) =>
        cy + y * keyholeRadius(Math.atan2(y, x), entry, neck, height, false),
    ),
  };
}

/** Monotone radial mapping keeps the base closed while rounding the actual keyhole. */
export function roundKeyhole(
  mesh: Mesh,
  cx: number,
  cy: number,
  entry: number,
  neck: number,
  height: number,
): Mesh {
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i] - cx,
      y = positions[i + 1] - cy,
      d = Math.hypot(x, y);
    if (
      Math.abs(x) > entry / 2 + 4 ||
      y < -Math.max(4, entry / 2) - 4 ||
      y > height + 2
    )
      continue;
    if (d < 1e-8) continue;
    const a = Math.atan2(y, x),
      old = keyholeRadius(a, entry, neck, height, false),
      next = keyholeRadius(a, entry, neck, height, true);
    const band = 2 + Math.max(0, next - old);
    if (d >= old + band) continue;
    const radius =
      d <= old
        ? (d * next) / old
        : next + ((d - old) * (old + band - next)) / band;
    positions[i] = cx + (x * radius) / d;
    positions[i + 1] = cy + (y * radius) / d;
  }
  return repairCollinearFaces({ ...mesh, positions });
}

/** A former reentrant square corner can become a straight neck edge after rounding.
 * Remove its zero-area cap face and split the adjacent long edge at the same vertex. */
function repairCollinearFaces(mesh: Mesh): Mesh {
  const p = mesh.positions;
  const same = (a: number, b: number) =>
    p[a * 3] === p[b * 3] &&
    p[a * 3 + 1] === p[b * 3 + 1] &&
    p[a * 3 + 2] === p[b * 3 + 2];
  let faces = Array.from({ length: mesh.indices.length / 3 }, (_, i) =>
    Array.from(mesh.indices.slice(i * 3, i * 3 + 3)),
  );
  for (let pass = 0; pass < 64; pass++) {
    const at = faces.findIndex((face) => {
      const a = face[0] * 3,
        b = face[1] * 3,
        c = face[2] * 3;
      const ux = p[b] - p[a],
        uy = p[b + 1] - p[a + 1],
        uz = p[b + 2] - p[a + 2],
        vx = p[c] - p[a],
        vy = p[c + 1] - p[a + 1],
        vz = p[c + 2] - p[a + 2];
      return (
        (uy * vz - uz * vy) ** 2 +
          (uz * vx - ux * vz) ** 2 +
          (ux * vy - uy * vx) ** 2 <
        1e-16
      );
    });
    if (at < 0) return { ...mesh, indices: new Uint32Array(faces.flat()) };
    const face = faces[at];
    const edges = [0, 1, 2]
      .map((j) => ({
        a: face[j],
        b: face[(j + 1) % 3],
        mid: face[(j + 2) % 3],
        length: [0, 1, 2].reduce(
          (n, k) =>
            n + (p[face[j] * 3 + k] - p[face[(j + 1) % 3] * 3 + k]) ** 2,
          0,
        ),
      }))
      .sort((a, b) => b.length - a.length);
    const { a, b, mid } = edges[0];
    const next: number[][] = [];
    for (let i = 0; i < faces.length; i++) {
      if (i === at) continue;
      const f = faces[i];
      let split = false;
      for (let j = 0; j < 3; j++)
        if (
          (same(f[j], a) && same(f[(j + 1) % 3], b)) ||
          (same(f[j], b) && same(f[(j + 1) % 3], a))
        ) {
          next.push(
            [f[j], mid, f[(j + 2) % 3]],
            [mid, f[(j + 1) % 3], f[(j + 2) % 3]],
          );
          split = true;
          break;
        }
      if (!split) next.push(f);
    }
    faces = next;
  }
  throw new Error("No se pudo cerrar la malla redondeada del anclaje.");
}

/** 0.3 mm lead-in on both sides of the collar rim; the working bore below stays exact. */
export function chamferSocket(
  mesh: Mesh,
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  top: number,
): Mesh {
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const z = positions[i + 2];
    if (z < top - SOCKET_CHAMFER - 1e-5 || z > top + 1e-5) continue;
    const x = positions[i] - cx,
      y = positions[i + 1] - cy,
      r = Math.hypot(x, y);
    if (r < inner - 1e-4 || r > outer + 1e-4) continue;
    const u = Math.max(0, Math.min(1, (r - inner) / (outer - inner)));
    const inset = Math.max(
      0,
      Math.min(SOCKET_CHAMFER, z - (top - SOCKET_CHAMFER)),
    );
    const scale = (r + inset * (1 - 2 * u)) / r;
    positions[i] = cx + x * scale;
    positions[i + 1] = cy + y * scale;
  }
  return { ...mesh, positions };
}
