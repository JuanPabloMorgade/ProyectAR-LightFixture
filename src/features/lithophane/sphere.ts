import type { Settings } from "./mesh";
import type { Mesh } from "../shadowbox/solid-mesh";
import { MARK_DEPTH, modelMark } from "@/lib/model-mark";

export const SPHERE_NECK_HEIGHT = 7;
export const DEFAULT_OPENING_DIAMETER = 22;
export const SPHERE_NECK_LIP = 1;
export const SPHERE_ULTRA_RESOLUTION = 512;
/** Upper bound retained to accept projects saved before Ultra changed to 512. */
export const SPHERE_LEGACY_MAX_RESOLUTION = 640;
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

/** Fit the whole image into the unwrapped spherical band, optionally widening
 * the centered photo. theta=0 is the front, with the seam behind it.
 */
export function spherePhotoBounds(
  s: Settings,
  imageWidth: number,
  imageHeight: number,
) {
  const aspect = imageWidth / imageHeight;
  const halfHeight = Math.min(spherePhotoLatitude(s), Math.PI / aspect);
  const stretch =
    s.spherePhotoFit === "contain" ? (s.spherePhotoStretch ?? 0) : 0;
  return {
    halfWidth: Math.min(Math.PI, halfHeight * aspect * (1 + stretch / 100)),
    halfHeight,
  };
}

/** Ultra balances photo sampling along meridians and around the equator.
 * Lettering also sets a minimum angular density independent of photo detail.
 */
export function sphereGrid(s: Settings) {
  const radius = s.width / 2;
  const bottom = -Math.acos(3 / radius);
  const top = Math.min(
    (55 * Math.PI) / 180,
    Math.acos(sphereNeck(s).outer / radius) - Math.PI / 18,
  );
  const mark = sphereMark(s, top);
  const cols = Math.max(
    64,
    s.resolution * 2,
    Math.ceil((2 * Math.PI * mark.midRadius) / (mark.lettering.cell * 0.45)),
  );
  const rows =
    s.resolution > 384
      ? Math.ceil((s.resolution * 2 * (top - bottom)) / (2 * Math.PI))
      : Math.max(32, Math.round(s.resolution / 2));
  return {
    cols,
    rows,
    bottom,
    top,
    shoulder: mark,
    horizontalStep: (Math.PI * s.width) / cols,
    verticalStep: (radius * (top - bottom)) / rows,
  };
}

/** Text follows the smooth conical shoulder, clear of both photo and cap seat. */
function sphereMark(s: Settings, top: number) {
  const radius = s.width / 2,
    neck = sphereNeck(s);
  const radial = radius * Math.cos(top),
    height = radius * Math.sin(top);
  const dy = sphereNeckY(s) - height,
    dr = neck.outer - radial;
  const length = Math.hypot(dr, dy),
    midRadius = (radial + neck.outer) / 2;
  const lettering = modelMark(
    0,
    length / 2,
    Math.PI * midRadius * 1.5,
    Math.min(4.3, length * 0.8),
    false,
    false,
  );
  const fractions = [
    0,
    ...lettering.ys.map((y) => y / length).sort((a, b) => a - b),
    1,
  ];
  return { radial, height, dr, dy, length, midRadius, lettering, fractions };
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
  const { cols, rows, bottom, top, shoulder } = sphereGrid(s);
  const photoLimit = spherePhotoLatitude(s);
  const contain = s.spherePhotoFit === "contain";
  const bounds = spherePhotoBounds(s, imageWidth, imageHeight);
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
  const shoulderRows = shoulder.fractions.slice(1, -1);
  const rings = rows + 1 + shoulderRows.length + neckProfile.length;
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
      const bandWeight = Math.max(
        0,
        Math.min(1, (photoLimit - Math.abs(latitude)) / fade),
      );
      const weight = contain
        ? Math.max(
            0,
            Math.min(
              1,
              (bounds.halfWidth - Math.abs(theta)) /
                Math.min(fade, bounds.halfWidth / 4),
              (bounds.halfHeight - Math.abs(latitude)) /
                Math.min(fade, bounds.halfHeight / 4),
            ),
          )
        : bandWeight;
      const imageThickness =
        weight > 0
          ? photoThickness(
              contain ? 0.5 + theta / (2 * bounds.halfWidth) : x / cols,
              contain
                ? 0.5 + latitude / (2 * bounds.halfHeight)
                : (latitude + photoLimit) / (2 * photoLimit),
            )
          : plainThickness;
      // Keep the inner surface independent of the photo. Reserve the maximum
      // thickness inward so outward relief stays within the chosen diameter.
      // Blend back to the original smooth caps to preserve the neck and floor.
      const baseThickness = Math.max(plainThickness, 2.4 * reinforcement);
      const innerRadius =
        radius -
        baseThickness -
        bandWeight * (Math.max(s.max, baseThickness) - baseThickness);
      // In contain mode the unused surface stays on the smooth outer sphere.
      // Keep the same inner surface for every photo and blend only the relief.
      const backgroundThickness = contain
        ? radius - innerRadius
        : plainThickness;
      const thickness = Math.max(
        backgroundThickness + weight * (imageThickness - backgroundThickness),
        2.4 * reinforcement,
      );
      for (let layer = 0; layer < 2; layer++) {
        const r = layer ? innerRadius : innerRadius + thickness;
        const shoulderT =
          y > rows && y <= rows + shoulderRows.length
            ? shoulderRows[y - rows - 1]
            : undefined;
        const profile =
          y > rows + shoulderRows.length
            ? neckProfile[y - rows - shoulderRows.length - 1]
            : undefined;
        let radial =
          y === 0
            ? 3
            : profile
              ? layer
                ? neck.inner + profile[2]
                : neck.outer + profile[1]
              : r * Math.cos(latitude);
        let height =
          y === 0
            ? bottomY + (layer ? floor : 0)
            : profile
              ? neckY + profile[0]
              : r * Math.sin(latitude);
        if (shoulderT !== undefined) {
          const bodyRadial = r * Math.cos(top),
            bodyHeight = r * Math.sin(top);
          radial =
            bodyRadial +
            shoulderT * ((layer ? neck.inner : neck.outer) - bodyRadial);
          height = bodyHeight + shoulderT * (neckY - bodyHeight);
          if (!layer) {
            const depth =
              MARK_DEPTH *
              shoulder.lettering.sample(
                theta * shoulder.midRadius,
                shoulderT * shoulder.length,
              );
            radial -= (depth * shoulder.dy) / shoulder.length;
            height += (depth * shoulder.dr) / shoulder.length;
          }
        }
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
