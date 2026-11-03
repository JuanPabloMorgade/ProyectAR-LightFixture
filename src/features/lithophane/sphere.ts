import type { Settings } from "./mesh";
import type { Mesh } from "../shadowbox/solid-mesh";

export const SPHERE_NECK_HEIGHT = 7;
export const DEFAULT_OPENING_DIAMETER = 22;
export const SPHERE_NECK_LIP = 1;
export const SPHERE_ULTRA_RESOLUTION = 640;
export function sphereNeck(s: Settings) {
  const inner = (s.sphereOpeningDiameter ?? DEFAULT_OPENING_DIAMETER) / 2;
  return { inner, outer: inner + 2 };
}
export const sphereNeckY = (s: Settings) =>
  Math.sqrt((s.width / 2) ** 2 - sphereNeck(s).outer ** 2);

/** Reserve smooth polar caps, including below the neck on small ornaments. */
export function spherePhotoLatitude(s: Settings) {
  const neckLatitude = Math.acos(sphereNeck(s).outer / (s.width / 2));
  return Math.min((50 * Math.PI) / 180, neckLatitude - Math.PI / 18);
}

/** Ultra balances sampling along meridians and around the equator. Previous
 * levels retain their grid so saved projects keep the same mesh density.
 */
export function sphereGrid(s: Settings) {
  const radius = s.width / 2;
  const bottom = -Math.acos(3 / radius);
  const top = Math.min(
    (55 * Math.PI) / 180,
    Math.acos(sphereNeck(s).outer / radius) - Math.PI / 18,
  );
  const cols = Math.max(64, s.resolution * 2);
  const rows =
    s.resolution > 384
      ? Math.ceil((cols * (top - bottom)) / (2 * Math.PI))
      : Math.max(32, Math.round(s.resolution / 2));
  return {
    cols,
    rows,
    bottom,
    top,
    horizontalStep: (Math.PI * s.width) / cols,
    verticalStep: (radius * (top - bottom)) / rows,
  };
}

/** Y-up assembly → Z-up print, with the flat closed bottom resting at Z=0. */
export function sphereForPrinting(mesh: Mesh): Mesh {
  const positions = mesh.positions.slice();
  let bottom = Infinity;
  for (let i = 1; i < positions.length; i += 3)
    bottom = Math.min(bottom, positions[i]);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] = -mesh.positions[i + 2];
    positions[i + 2] = mesh.positions[i + 1] - bottom;
  }
  return { positions, indices: mesh.indices };
}

/** Hollow sphere with photo relief outside, smooth inside and an open neck. */
export function createSphere(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  s: Settings,
): Mesh {
  const radius = s.width / 2;
  const neck = sphereNeck(s);
  const { cols, rows, bottom, top } = sphereGrid(s);
  const photoLimit = spherePhotoLatitude(s);
  const fade = Math.PI / 45;
  const plainThickness = Math.min(s.max, Math.max(s.min, 1.2));
  const bottomY = radius * Math.sin(bottom),
    neckY = sphereNeckY(s);
  // Smooth shoulder, straight neck, then a rounded outer lip. The bore only
  // widens at the entrance; the selected opening stays free all the way down.
  const neckProfile = [
    [0, 0, 0],
    [4.5, 0, 0],
    [5, 0.7 * SPHERE_NECK_LIP, 0],
    [5.5, SPHERE_NECK_LIP, 0],
    [6.5, SPHERE_NECK_LIP, 0],
    [SPHERE_NECK_HEIGHT, 0.5 * SPHERE_NECK_LIP, 0.5],
  ];
  const rings = rows + 1 + neckProfile.length;
  const n = 1 + cols * rings;
  const positions = new Float32Array(n * 6);
  // Allocate once: Ultra otherwise creates millions of boxed index numbers
  // before copying them into the transferable typed array.
  const indices = new Uint32Array(12 * cols * rings);
  let index = 0;
  const triangle = (a: number, b: number, c: number) => {
    indices[index++] = a;
    indices[index++] = b;
    indices[index++] = c;
  };
  const photoThickness = (u: number, v: number) => {
    const px = Math.min(imageWidth - 1, Math.floor(u * imageWidth));
    const py = Math.min(
      imageHeight - 1,
      Math.round((1 - v) * (imageHeight - 1)),
    );
    const pi = (py * imageWidth + px) * 4,
      alpha = pixels[pi + 3] / 255;
    let light =
      ((0.2126 * pixels[pi] +
        0.7152 * pixels[pi + 1] +
        0.0722 * pixels[pi + 2]) /
        255) *
        alpha +
      1 -
      alpha;
    light = Math.max(0, Math.min(1, (light - 0.5) * s.contrast + 0.5));
    if (s.invert) light = 1 - light;
    return s.min + (1 - light) * (s.max - s.min);
  };
  const floor = plainThickness;
  positions.set([0, bottomY, 0], 0);
  positions.set([0, bottomY + floor, 0], n * 3);
  for (let y = 0; y < rings; y++) {
    const v = Math.min(y, rows) / rows;
    const latitude = bottom + v * (top - bottom);
    for (let x = 0; x < cols; x++) {
      const theta = (x / cols - 0.5) * 2 * Math.PI;
      const reinforcement = Math.max(0, 1 - (top - latitude) / (Math.PI / 12));
      // Fit the entire photo into the middle band; polar caps carry no image.
      // Fade inward over four degrees so the boundary does not form a ridge.
      const weight = Math.max(
        0,
        Math.min(1, (photoLimit - Math.abs(latitude)) / fade),
      );
      const imageThickness =
        weight > 0
          ? photoThickness(x / cols, (latitude + photoLimit) / (2 * photoLimit))
          : plainThickness;
      const thickness = Math.max(
        plainThickness + weight * (imageThickness - plainThickness),
        2.4 * reinforcement,
      );
      // Keep the inner surface independent of the photo. Reserve the maximum
      // thickness inward so outward relief stays within the chosen diameter.
      // Blend back to the original smooth caps to preserve the neck and floor.
      const baseThickness = Math.max(plainThickness, 2.4 * reinforcement);
      const innerRadius =
        radius -
        baseThickness -
        weight * (Math.max(s.max, baseThickness) - baseThickness);
      for (let layer = 0; layer < 2; layer++) {
        const r = layer ? innerRadius : innerRadius + thickness;
        const profile = y > rows ? neckProfile[y - rows - 1] : undefined;
        const radial =
          y === 0
            ? 3
            : profile
              ? layer
                ? neck.inner + profile[2]
                : neck.outer + profile[1]
              : r * Math.cos(latitude);
        const height =
          y === 0
            ? bottomY + (layer ? floor : 0)
            : profile
              ? neckY + profile[0]
              : r * Math.sin(latitude);
        positions.set(
          [radial * Math.sin(theta), height, radial * Math.cos(theta)],
          (1 + y * cols + x + layer * n) * 3,
        );
      }
    }
  }
  for (let y = 0; y < rings - 1; y++)
    for (let x = 0; x < cols; x++) {
      const a = 1 + y * cols + x,
        b = 1 + y * cols + ((x + 1) % cols);
      const c = a + cols,
        d = b + cols;
      triangle(a, b, d);
      triangle(a, d, c);
      triangle(a + n, d + n, b + n);
      triangle(a + n, c + n, d + n);
    }
  for (let x = 0; x < cols; x++) {
    const a = 1 + x,
      b = 1 + ((x + 1) % cols);
    triangle(0, b, a);
    triangle(n, a + n, b + n);
    const c = 1 + (rings - 1) * cols + x,
      d = 1 + (rings - 1) * cols + ((x + 1) % cols);
    triangle(c, d, d + n);
    triangle(c, d + n, c + n);
  }
  return { positions, indices };
}
