import type { Mesh } from "./solid-mesh";

/** Circular profiles sampled at 64 angles before shared-grid meshing. */
export function roundOpeningAxes(cx: number, cy: number, radii: number[]) {
  const values = radii.flatMap((r) =>
    Array.from({ length: 64 }, (_, i) => {
      const a = (i * 2 * Math.PI) / 64,
        x = Math.cos(a),
        y = Math.sin(a);
      return (r * x) / Math.max(Math.abs(x), Math.abs(y));
    }),
  );
  return { xs: values.map((v) => cx + v), ys: values.map((v) => cy + v) };
}

/**
 * Round the existing square opening without cutting/merging disconnected shells.
 * Shared grid vertices use the same continuous, orientation-preserving mapping.
 * Beyond the 2 mm transition band the rest of the part stays fixed.
 */
export function roundOpening(
  mesh: Mesh,
  cx: number,
  cy: number,
  radius: number,
): Mesh {
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i] - cx,
      y = positions[i + 1] - cy;
    const square = Math.max(Math.abs(x), Math.abs(y));
    if (square < 1e-8 || square >= radius + 2) continue;
    const circular = square / Math.hypot(x, y);
    const blend = Math.max(0, (square - radius) / 2);
    const scale = circular + (1 - circular) * blend;
    positions[i] = cx + x * scale;
    positions[i + 1] = cy + y * scale;
  }
  return { ...mesh, positions };
}
