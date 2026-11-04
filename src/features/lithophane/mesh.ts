import { validateHousing, type HousingSettings } from "./housing-config";
import {
  createSphere,
  DEFAULT_OPENING_DIAMETER,
  SPHERE_LEGACY_MAX_RESOLUTION,
} from "./sphere";

export const PANEL_ULTRA_RESOLUTION = 448;

export type Settings = {
  width: number;
  height: number;
  min: number;
  max: number;
  angle: number;
  resolution: number;
  contrast: number;
  invert: boolean;
  housing?: HousingSettings;
  printStand?: boolean;
  shape?: "panel" | "sphere";
  /** Legacy cap bore retained only to read previous v1 projects. */
  sphereLedDiameter?: number;
  sphereOpeningDiameter?: number;
  /** Missing in older projects: stretch the photo around the full band. */
  spherePhotoFit?: "stretch" | "contain";
  /** Optional extra horizontal stretch (%) for a centered photo. */
  spherePhotoStretch?: number;
};
export const defaults: Settings = {
  width: 120,
  height: 100,
  min: 0.8,
  max: 3.2,
  angle: 0,
  shape: "panel",
  resolution: 160,
  contrast: 1,
  invert: false,
  printStand: true,
};
export function validateSettings(s: Settings) {
  if (
    s.spherePhotoStretch !== undefined &&
    (!Number.isFinite(s.spherePhotoStretch) ||
      s.spherePhotoStretch < 0 ||
      s.spherePhotoStretch > 75)
  )
    throw new Error("El estiramiento de la foto debe estar entre 0 y 75 %.");
  if (
    s.spherePhotoFit !== undefined &&
    s.spherePhotoFit !== "stretch" &&
    s.spherePhotoFit !== "contain"
  )
    throw new Error("Elegí cómo aplicar la foto a la esfera.");
  const opening = s.sphereOpeningDiameter ?? DEFAULT_OPENING_DIAMETER;
  if (!Number.isFinite(opening) || opening < 8 || opening > 30)
    throw new Error("La abertura para los LED debe medir entre 8 y 30 mm.");
  if (s.shape === "sphere" && opening + 8 > s.width)
    throw new Error(
      `La abertura de ${opening} mm necesita una esfera de al menos ${opening + 8} mm. Aumentá el diámetro de la esfera o reducí la abertura.`,
    );
  if (
    s.sphereLedDiameter !== undefined &&
    (!Number.isFinite(s.sphereLedDiameter) ||
      s.sphereLedDiameter < 3 ||
      s.sphereLedDiameter > 8)
  )
    throw new Error("El paso del LED debe medir entre 3 y 8 mm.");
  if (s.shape !== undefined && s.shape !== "panel" && s.shape !== "sphere")
    throw new Error("La variante de litofanía no es válida.");
  validateHousing(s.housing);
  if (s.printStand !== undefined && typeof s.printStand !== "boolean")
    throw new Error("Revisá la opción del soporte de impresión.");
  for (const k of [
    "width",
    "height",
    "min",
    "max",
    "angle",
    "resolution",
    "contrast",
  ] as const)
    if (!Number.isFinite(s[k])) throw new Error("Parámetros inválidos.");
  if (
    s.width < 30 ||
    s.width > 250 ||
    s.height < 30 ||
    s.height > 250 ||
    s.min < 0.6 ||
    s.max > 5 ||
    s.max <= s.min ||
    s.angle < 0 ||
    s.angle > 180 ||
    !Number.isInteger(s.resolution) ||
    s.resolution < 40 ||
    s.resolution >
      (s.shape === "sphere"
        ? SPHERE_LEGACY_MAX_RESOLUTION
        : PANEL_ULTRA_RESOLUTION) ||
    s.contrast < 0.5 ||
    s.contrast > 2 ||
    typeof s.invert !== "boolean"
  )
    throw new Error(
      "Revisá las medidas y los espesores: el máximo debe superar al mínimo.",
    );
}
export function createMesh(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  s: Settings,
) {
  validateSettings(s);
  if (
    imageWidth < 1 ||
    imageHeight < 1 ||
    pixels.length !== imageWidth * imageHeight * 4
  )
    throw new Error("La imagen no es válida.");
  if (s.shape === "sphere")
    return createSphere(pixels, imageWidth, imageHeight, s);
  const cols = Math.max(
    2,
    Math.round((s.resolution * s.width) / Math.max(s.width, s.height)),
  );
  const rows = Math.max(
    2,
    Math.round((s.resolution * s.height) / Math.max(s.width, s.height)),
  );
  const n = (cols + 1) * (rows + 1),
    positions = new Float32Array(n * 6),
    indices: number[] = [];
  const radians = (s.angle * Math.PI) / 180,
    radius = radians ? s.width / radians : 0;
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= cols; x++) {
      const px = Math.min(
          imageWidth - 1,
          Math.round((x / cols) * (imageWidth - 1)),
        ),
        py = Math.min(
          imageHeight - 1,
          Math.round((1 - y / rows) * (imageHeight - 1)),
        );
      const pi = (py * imageWidth + px) * 4,
        alpha = pixels[pi + 3] / 255;
      let l =
        ((0.2126 * pixels[pi] +
          0.7152 * pixels[pi + 1] +
          0.0722 * pixels[pi + 2]) /
          255) *
          alpha +
        1 -
        alpha;
      l = Math.max(0, Math.min(1, (l - 0.5) * s.contrast + 0.5));
      if (s.invert) l = 1 - l;
      const t = s.min + (1 - l) * (s.max - s.min),
        i = y * (cols + 1) + x,
        theta = (x / cols - 0.5) * radians;
      for (let layer = 0; layer < 2; layer++) {
        const depth = layer === 0 ? t : 0,
          offset = (i + layer * n) * 3;
        positions[offset] = radians
          ? (radius + depth) * Math.sin(theta)
          : (x / cols - 0.5) * s.width;
        positions[offset + 1] = (y / rows - 0.5) * s.height;
        positions[offset + 2] = radians
          ? (radius + depth) * Math.cos(theta) - radius
          : depth;
      }
    }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const a = y * (cols + 1) + x,
        b = a + 1,
        c = a + cols + 1,
        d = c + 1;
      indices.push(a, b, d, a, d, c, a + n, d + n, b + n, a + n, c + n, d + n);
    }
  const edge: number[] = [];
  for (let x = 0; x < cols; x++) edge.push(x);
  for (let y = 0; y < rows; y++) edge.push(y * (cols + 1) + cols);
  for (let x = cols; x > 0; x--) edge.push(rows * (cols + 1) + x);
  for (let y = rows; y > 0; y--) edge.push(y * (cols + 1));
  for (let i = 0; i < edge.length; i++) {
    const a = edge[i],
      b = edge[(i + 1) % edge.length];
    indices.push(a, a + n, b + n, a, b + n, b);
  }
  return { positions, indices: new Uint32Array(indices) };
}
export function binarySTL(
  positions: Float32Array,
  indices: Uint32Array,
): ArrayBuffer {
  const count = indices.length / 3,
    buffer = new ArrayBuffer(84 + count * 50),
    view = new DataView(buffer);
  new Uint8Array(buffer, 0, 80).set(
    new TextEncoder().encode("ProyectAR - Litofania - millimeters"),
  );
  view.setUint32(80, count, true);
  for (let f = 0; f < count; f++) {
    const a = indices[f * 3] * 3,
      b = indices[f * 3 + 1] * 3,
      c = indices[f * 3 + 2] * 3;
    const ux = positions[b] - positions[a],
      uy = positions[b + 1] - positions[a + 1],
      uz = positions[b + 2] - positions[a + 2],
      vx = positions[c] - positions[a],
      vy = positions[c + 1] - positions[a + 1],
      vz = positions[c + 2] - positions[a + 2];
    const normal = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx],
      len = Math.hypot(...normal) || 1;
    let offset = 84 + f * 50;
    for (const v of normal) {
      view.setFloat32(offset, v / len, true);
      offset += 4;
    }
    for (const i of [a, b, c])
      for (let k = 0; k < 3; k++) {
        view.setFloat32(offset, positions[i + k], true);
        offset += 4;
      }
  }
  return buffer;
}
