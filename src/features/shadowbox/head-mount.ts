import type { Mesh } from "./solid-mesh";
import { WALL_POST_DIAMETER } from "./modular-config";

export const HEAD_INSERTION = 6;
export const HEAD_STOP = 1.5;
export const POST_TO_EMITTER = 8;
export const HEAD_ARM_WIDTH = 1.2;
export const HEAD_ARM_DEPTH = 1.6;

/** One closed solid: slip-fit collar, cable stop, two flared arms and a board seat.
 * Local Z=0 is the collar mouth; +Z points away from the projection wall.
 * A shared polar grid keeps the curved transitions manifold, including the stop.
 */
export function postHeadMesh(
  starDiameter: number,
  starThickness: number,
  emitterHeight: number,
  wire: number,
  clearance: number,
  angle: number,
): Mesh {
  const segments = 64;
  const seat = (starDiameter + clearance) / 2;
  const bore = (WALL_POST_DIAMETER + clearance) / 2;
  const seatZ = HEAD_INSERTION + POST_TO_EMITTER + emitterHeight;
  const zs = [
    0,
    HEAD_INSERTION,
    HEAD_INSERTION + HEAD_STOP,
    seatZ,
    seatZ + starThickness,
    seatZ + starThickness + 2,
  ];
  // The last radial cell is the narrow rib. Keep the full collar and board rim.
  const collar = [wire / 2, bore, bore + 2 - HEAD_ARM_DEPTH, bore + 2];
  const cradle = [seat - 2, seat, seat + 2 - HEAD_ARM_DEPTH, seat + 2];
  const radii = [collar, collar, collar, cradle, cradle, cradle];
  const occupied = (z: number, r: number, a: number): boolean => {
    if (z < 0 || z >= zs.length - 1 || r < 0 || r >= 3) return false;
    a = (a + segments) % segments;
    if (z === 0) return r >= 1; // post diameter + clearance bore
    if (z === 1) return true; // shoulder stops the tube at a fixed height
    if (z === 2)
      return r === 2 && (a === 0 || a === 63 || a === 31 || a === 32);
    if (z === 3) return r >= 1; // circular pocket for the purchased board
    return true; // open rear shelf; cables and back of board remain accessible
  };
  const positions: number[] = [],
    indices: number[] = [];
  const point = (z: number, r: number, a: number) => {
    const radius = radii[z][r];
    // Fixed millimetres, not a fixed angle: large LED boards must not widen the arms.
    // Nodes 63/1 and 31/33 form the two parallel rib edges at +/- width / 2.
    const halfWidth = Math.asin(HEAD_ARM_WIDTH / (2 * radius));
    const node = a % segments;
    const halfNode = node % (segments / 2);
    const theta =
      angle +
      Math.floor(node / (segments / 2)) * Math.PI +
      (halfNode === 0
        ? 0
        : halfWidth +
          ((halfNode - 1) * (Math.PI - 2 * halfWidth)) / (segments / 2 - 2));
    return [
      seat + 2 + radius * Math.cos(theta),
      seat + 2 + radius * Math.sin(theta),
      zs[z],
    ];
  };
  const quad = (...points: number[][]) => {
    const i = positions.length / 3;
    positions.push(...points.flat());
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
  };
  // Coordinates (radius, angle, Z) preserve orientation like (X, Y, Z).
  for (let z = 0; z < zs.length - 1; z++)
    for (let r = 0; r < 3; r++)
      for (let a = 0; a < segments; a++) {
        if (!occupied(z, r, a)) continue;
        const p = (dz: number, dr: number, da: number) =>
          point(z + dz, r + dr, a + da);
        if (!occupied(z, r - 1, a))
          quad(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1));
        if (!occupied(z, r + 1, a))
          quad(p(0, 1, 0), p(0, 1, 1), p(1, 1, 1), p(1, 1, 0));
        if (!occupied(z, r, a - 1))
          quad(p(0, 0, 0), p(0, 1, 0), p(1, 1, 0), p(1, 0, 0));
        if (!occupied(z, r, a + 1))
          quad(p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1));
        if (!occupied(z - 1, r, a))
          quad(p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0));
        if (!occupied(z + 1, r, a))
          quad(p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1));
      }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
