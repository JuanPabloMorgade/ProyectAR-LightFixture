import { ShapeUtils, Vector2 } from "three";
import type { Mesh } from "../shadowbox/solid-mesh";
import type { Settings } from "./mesh";
import { sphereNeck, sphereNeckY, SPHERE_NECK_LIP } from "./sphere";

export const SPHERE_CAP_CLEARANCE = 0.3; // radial clearance, mm
export const SPHERE_CAP_SLOT = 4; // lateral cable entry, mm
export const SPHERE_CAP_TUBE_LENGTH = 36; // below the cap underside, mm
export const SPHERE_CAP_TUBE_WALL = 1.2;

export function sphereCapTube(s: Settings) {
  // Keep the guide clear of the thick photo wall even in the smallest spheres.
  const previousOuter = Math.min(
    sphereNeck(s).inner - SPHERE_CAP_CLEARANCE,
    (s.width / 2 - Math.max(s.max, 2.4)) * 0.8,
  );
  // Halve the guide diameter while preserving the 5 mm cable bore and wall.
  const outer = Math.max(2.5 + SPHERE_CAP_TUBE_WALL, previousOuter / 2);
  const cavity = s.width / 2 - Math.max(s.max, 2.4);
  const length = Math.min(
    SPHERE_CAP_TUBE_LENGTH,
    sphereNeckY(s) + 7.3 + Math.sqrt(cavity ** 2 - outer ** 2) - 1,
  );
  return { outer, inner: outer - SPHERE_CAP_TUBE_WALL, length };
}

/** Split push-on cap. The side slot lets an existing cable enter without
 * threading the whole garland through a hole. Coordinates are Y-up, assembled.
 */
export function createSphereCap(s: Settings): Mesh {
  const neck = sphereNeck(s);
  const seat = neck.outer + SPHERE_NECK_LIP + SPHERE_CAP_CLEARANCE;
  const outer = seat + 1.5;
  const tube = sphereCapTube(s);
  const tip = 7.3 - tube.length;
  const profile = [
    [2.5, 7.3],
    ...(tube.inner > 2.5 + 1e-8 ? [[tube.inner, 7.3]] : []),
    [tube.inner, tip],
    [tube.outer - 0.4, tip],
    [tube.outer, tip + 0.8],
    [tube.outer, 7.3],
    [seat, 7.3],
    [seat, 5.1],
    [neck.outer + SPHERE_CAP_CLEARANCE, 4.4],
    [outer, 4.4],
    [outer, 9.3],
    [2.5, 9.3],
  ];
  const segments = 128,
    count = profile.length;
  const positions = new Float32Array((segments + 1) * count * 3);
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++)
    for (let j = 0; j < count; j++) {
      const [radius, height] = profile[j];
      const start = Math.asin(SPHERE_CAP_SLOT / 2 / radius);
      const theta = start + (i / segments) * (2 * Math.PI - 2 * start);
      positions.set(
        [
          radius * Math.sin(theta),
          sphereNeckY(s) + height,
          radius * Math.cos(theta),
        ],
        (i * count + j) * 3,
      );
    }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < count; j++) {
      const a = i * count + j,
        b = i * count + ((j + 1) % count);
      indices.push(a, b + count, b, a, a + count, b + count);
    }
  // Triangulate each exposed end of the split, including the retaining skirt.
  const end = profile.map(
    ([r, y]) => new Vector2(Math.sqrt(r * r - (SPHERE_CAP_SLOT / 2) ** 2), y),
  );
  for (const [a, b, c] of ShapeUtils.triangulateShape(end, [])) {
    indices.push(a, b, c);
    const offset = segments * count;
    indices.push(offset + c, offset + b, offset + a);
  }
  return { positions, indices: new Uint32Array(indices) };
}

/** Print with the flat outside face on the bed, skirt and guide tube facing up. */
export function sphereCapForPrinting(cap: Mesh): Mesh {
  let top = -Infinity;
  for (let i = 1; i < cap.positions.length; i += 3)
    top = Math.max(top, cap.positions[i]);
  const positions = cap.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] = cap.positions[i + 2];
    positions[i + 2] = top - cap.positions[i + 1];
  }
  return { positions, indices: cap.indices };
}
