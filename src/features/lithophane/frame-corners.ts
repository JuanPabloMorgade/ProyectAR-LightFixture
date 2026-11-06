/** Sample each half of a quarter-circle before the shared-grid union.
 * Projection below maps tan-spaced square-edge samples to uniform arc angles.
 */
export function frameCornerAxes(half: number, radius: number) {
  if (!radius) return [];
  // Tiny radii need fewer segments to avoid microscopic triangles in the STL.
  const segments = Math.max(1, Math.min(8, Math.floor(radius / 0.06)));
  return Array.from(
    { length: segments + 1 },
    (_, i) => half - radius + radius * Math.tan((i * Math.PI) / (4 * segments)),
  ).flatMap((value) => [-value, value]);
}

/** Continuous square-to-disc map of only the four outer corner patches.
 * The core (including every square mating profile) remains exactly unchanged.
 * Applied in intrinsic panel coordinates, so all three pieces match when curved.
 */
export function roundFrameCorner(
  x: number,
  y: number,
  outerX: number,
  outerY: number,
  radius: number,
): [number, number] {
  if (!radius) return [x, y];
  const coreX = outerX - radius,
    coreY = outerY - radius;
  if (Math.abs(x) <= coreX + 0.00001 || Math.abs(y) <= coreY + 0.00001)
    return [x, y];
  const cx = Math.sign(x) * coreX,
    cy = Math.sign(y) * coreY;
  const dx = x - cx,
    dy = y - cy;
  const scale = Math.max(Math.abs(dx), Math.abs(dy)) / Math.hypot(dx, dy);
  return [cx + dx * scale, cy + dy * scale];
}
