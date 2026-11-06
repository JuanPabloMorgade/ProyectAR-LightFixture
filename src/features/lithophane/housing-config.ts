import type { Settings } from "./mesh";
import {
  frameTextures,
  textureAreas,
  textureLimits,
  type FrameTextureOptions,
} from "./frame-texture-config";

export type HousingSettings = Partial<FrameTextureOptions> & {
  enabled: boolean;
  depth: number;
  clearance: number;
};
export const defaultHousing: HousingSettings = {
  enabled: false,
  depth: 25,
  clearance: 0.3,
};
export const hasHousing = (s: Settings) =>
  s.shape !== "sphere" && s.housing?.enabled === true && s.angle < 180;

export function validateHousing(h?: HousingSettings) {
  if (h === undefined) return;
  if (
    h?.frameCornerRounding !== undefined &&
    (!Number.isInteger(h.frameCornerRounding) ||
      h.frameCornerRounding < 0 ||
      h.frameCornerRounding > 100)
  )
    throw new Error(
      "El redondeo de las esquinas debe ser un porcentaje entero entre 0 y 100 %.",
    );
  if (
    h?.frameTextureArea !== undefined &&
    !textureAreas.some((item) => item.value === h.frameTextureArea)
  )
    throw new Error("Elegí una zona válida para la textura.");
  for (const [key, limits] of [
    ["frameTextureDepth", textureLimits.depth],
    ["frameTextureScale", textureLimits.scale],
  ] as const)
    if (
      h?.[key] !== undefined &&
      (!Number.isFinite(h[key]) || h[key]! < limits.min || h[key]! > limits.max)
    )
      throw new Error(
        "Revisá el relieve (0,15 a 0,6 mm) y la escala (0,75 a 2×) de la textura.",
      );
  if (
    h?.frameTexture !== undefined &&
    !frameTextures.some((item) => item.value === h.frameTexture)
  )
    throw new Error("Elegí una textura válida para el marco.");
  if (
    !h ||
    typeof h.enabled !== "boolean" ||
    !Number.isFinite(h.depth) ||
    h.depth < 12 ||
    h.depth > 80 ||
    !Number.isFinite(h.clearance) ||
    h.clearance < 0.1 ||
    h.clearance > 0.6
  )
    throw new Error(
      "Revisá la caja trasera: profundidad entre 12 y 80 mm y holgura entre 0,1 y 0,6 mm.",
    );
}
