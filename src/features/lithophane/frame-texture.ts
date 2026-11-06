import type { Mesh } from "../shadowbox/solid-mesh";

import {
  frameTextures,
  textureDefinitions,
  textureAreas,
  textureOptions,
  textureProfile,
  type FrameTexture,
  type FrameTextureOptions,
} from "./frame-texture-config";
export { frameTextures, type FrameTexture } from "./frame-texture-config";
export const FRAME_TEXTURE_DEPTH = 0.6;
export const FRAME_TEXTURE_STEP = 0.5;

/** Recess only the exterior face, keeping a smooth 0.8 mm border at both edges. */
export function frameTextureDepth(
  texture: FrameTexture,
  x: number,
  y: number,
  outerX: number,
  outerY: number,
  innerX: number,
  innerY: number,
  options?: Partial<FrameTextureOptions>,
) {
  if (texture === "none") return 0;
  const edge = Math.min(
    outerX - Math.abs(x),
    outerY - Math.abs(y),
    Math.max(Math.abs(x) - innerX, Math.abs(y) - innerY),
  );
  return surfaceTextureDepth(texture, x, y, edge, options);
}

/** A smooth border protects seams, corners, openings and print-bed contact edges. */
export function surfaceTextureDepth(
  texture: FrameTexture,
  x: number,
  y: number,
  edge: number,
  options?: Partial<FrameTextureOptions>,
) {
  if (texture === "none") return 0;
  const fade = Math.min(1, Math.max(0, (edge - 0.8) / 0.6));
  return (
    (options?.frameTextureDepth ?? FRAME_TEXTURE_DEPTH) *
    fade *
    textureProfile(texture, x, y, options?.frameTextureScale ?? 1)
  );
}

/** Refine the shared-grid quads, without allocating a dense 3D volume grid.
 * Adjacent quads share the same intervals, including their subdivided edges.
 * Call before curving the housing or rounding the cable opening.
 */
export function subdivideHousingSurface(
  mesh: Mesh,
  step = FRAME_TEXTURE_STEP,
): Mesh {
  const positions: number[] = [],
    indices: number[] = [];
  for (let q = 0; q < mesh.indices.length; q += 6) {
    const a = mesh.positions.slice(
      mesh.indices[q] * 3,
      mesh.indices[q] * 3 + 3,
    );
    const b = mesh.positions.slice(
      mesh.indices[q + 1] * 3,
      mesh.indices[q + 1] * 3 + 3,
    );
    const d = mesh.positions.slice(
      mesh.indices[q + 5] * 3,
      mesh.indices[q + 5] * 3 + 3,
    );
    const nu = Math.ceil(Math.hypot(...b.map((v, k) => v - a[k])) / step);
    const nv = Math.ceil(Math.hypot(...d.map((v, k) => v - a[k])) / step);
    const point = (i: number, j: number) =>
      Array.from(a, (v, k) => {
        // Always interpolate from the low end, so opposite winding gives identical vertices.
        if (b[k] !== v)
          return (
            Math.min(v, b[k]) +
            (Math.abs(b[k] - v) * (b[k] > v ? i : nu - i)) / nu
          );
        if (d[k] !== v)
          return (
            Math.min(v, d[k]) +
            (Math.abs(d[k] - v) * (d[k] > v ? j : nv - j)) / nv
          );
        return v;
      });
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const n = positions.length / 3;
        positions.push(
          ...point(i, j),
          ...point(i + 1, j),
          ...point(i + 1, j + 1),
          ...point(i, j + 1),
        );
        indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
      }
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}

export function frameTextureGuide(
  texture: FrameTexture = "none",
  options?: Partial<FrameTextureOptions>,
) {
  const label = frameTextures.find((item) => item.value === texture)!.label;
  const config = textureOptions(options);
  const area = textureAreas.find(
    (item) => item.value === config.frameTextureArea,
  )!.label;
  return texture === "none"
    ? "Marco sin textura."
    : `Textura del marco: ${label}. Zona: ${area}${config.frameTextureArea === "all" ? " (frente, laterales y dorso de la tapa)" : ""}. Relieve hacia adentro de hasta ${config.frameTextureDepth.toLocaleString("es-AR")} mm; escala ${config.frameTextureScale.toLocaleString("es-AR")}×. Incluido en los STL de las piezas afectadas; espesor frontal restante de al menos 1,5 mm, incluso junto a la marca del dorso. La foto, el tamaño exterior y los encastres se conservan. Probá con boquilla de 0,4 mm y capas de 0,12 a 0,2 mm. En Plano, las caras exteriores del marco y la tapa van hacia la cama: revisá los puentes y las primeras capas del relieve en el laminador. El ancho de las cavidades depende del patrón y de la escala; las facetas y celdas grandes requieren especial atención. En Curvo, revisá paredes, soportes y voladizos. ${config.frameTextureArea === "all" && textureDefinitions[texture].lidPrintNote ? `${textureDefinitions[texture].lidPrintNote} ` : ""}Imprimí una prueba antes del marco completo.`;
}
