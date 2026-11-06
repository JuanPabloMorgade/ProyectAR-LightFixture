import {
  smoothProfile,
  linesProfile,
  wavesProfile,
  dotsProfile,
  hexagonalProfile,
  lowPolyProfile,
  topographicProfile,
  diamondProfile,
  voronoiProfile,
  woodProfile,
  concentricProfile,
  hammeredProfile,
} from "./frame-texture-profiles";

export const textureCategories = [
  { value: "all", label: "Todas" },
  { value: "geometric", label: "Geométricas" },
  { value: "organic", label: "Orgánicas" },
  { value: "minimal", label: "Minimalistas" },
] as const;
export type TextureCategory = (typeof textureCategories)[number]["value"];
type TextureDefinition = {
  value: string;
  label: string;
  description: string;
  categories: readonly Exclude<TextureCategory, "all">[];
  sizeLabel: string;
  size: number;
  samplingStep: number;
  lidPrintNote?: string;
  profile: (x: number, y: number) => number;
};
// The same registry drives validation, filters, controls, thumbnails and geometry.
export const frameTextures = [
  {
    value: "none",
    label: "Sin textura",
    description: "Superficie lisa y limpia.",
    categories: ["minimal"],
    sizeLabel: "Sin relieve",
    size: 5,
    samplingStep: 0.5,
    profile: smoothProfile,
  },
  {
    value: "lines",
    label: "Líneas",
    description: "Ranuras diagonales regulares.",
    categories: ["geometric", "minimal"],
    sizeLabel: "Separación entre líneas",
    size: 5,
    samplingStep: 0.5,
    profile: linesProfile,
  },
  {
    value: "waves",
    label: "Ondas",
    description: "Surcos de recorrido ondulado.",
    categories: ["organic", "minimal"],
    sizeLabel: "Separación base",
    size: 5,
    samplingStep: 0.5,
    profile: wavesProfile,
  },
  {
    value: "dots",
    label: "Puntos",
    description: "Pequeñas hendiduras circulares.",
    categories: ["minimal"],
    sizeLabel: "Separación entre puntos",
    size: 5,
    samplingStep: 0.5,
    profile: dotsProfile,
  },
  {
    value: "hexagonal",
    label: "Hexagonal",
    description: "Celdas regulares de panal.",
    categories: ["geometric"],
    sizeLabel: "Ancho de celda entre caras",
    size: 8,
    samplingStep: 0.35,
    profile: hexagonalProfile,
  },
  {
    value: "low-poly",
    label: "Low Poly",
    description: "Facetas triangulares continuas.",
    categories: ["geometric"],
    sizeLabel: "Lado base de las facetas",
    size: 7,
    samplingStep: 0.35,
    profile: lowPolyProfile,
  },
  {
    value: "topographic",
    label: "Topográfica",
    description: "Curvas de nivel de un terreno.",
    categories: ["organic"],
    sizeLabel: "Escala base del terreno",
    size: 16,
    samplingStep: 0.35,
    profile: topographicProfile,
  },
  {
    value: "diamond",
    label: "Diamante",
    description: "Surcos cruzados en rombos.",
    categories: ["geometric"],
    sizeLabel: "Separación entre diagonales",
    size: 5,
    samplingStep: 0.35,
    profile: diamondProfile,
  },
  {
    value: "voronoi",
    label: "Voronoi",
    description: "Celdas irregulares y orgánicas.",
    categories: ["organic"],
    sizeLabel: "Separación media de celdas",
    size: 8,
    samplingStep: 0.35,
    profile: voronoiProfile,
    lidPrintNote:
      "La tapa con Voronoi puede tener zonas suspendidas. Activá soportes automáticos en el laminador y revisá las primeras capas antes de imprimir.",
  },
  {
    value: "wood",
    label: "Madera",
    description: "Vetas alargadas de suave recorrido.",
    categories: ["organic"],
    sizeLabel: "Separación base de vetas",
    size: 4.8,
    samplingStep: 0.35,
    profile: woodProfile,
  },
  {
    value: "concentric",
    label: "Concéntrica",
    description: "Anillos que rodean el centro.",
    categories: ["geometric"],
    sizeLabel: "Separación entre anillos",
    size: 5,
    samplingStep: 0.35,
    profile: concentricProfile,
  },
  {
    value: "hammered",
    label: "Martillada",
    description: "Huellas redondeadas e irregulares.",
    categories: ["organic"],
    sizeLabel: "Separación media de huellas",
    size: 5.5,
    samplingStep: 0.35,
    profile: hammeredProfile,
  },
] as const satisfies readonly TextureDefinition[];
export type FrameTexture = (typeof frameTextures)[number]["value"];
export const textureDefinitions = Object.fromEntries(
  frameTextures.map((item) => [item.value, item]),
) as unknown as Record<FrameTexture, TextureDefinition>;
export function texturesInCategory(category: TextureCategory) {
  return frameTextures.filter(
    (item) =>
      category === "all" ||
      (item.categories as readonly string[]).includes(category),
  );
}
export const textureAreas = [
  { value: "front", label: "Frente del marco", shortLabel: "Frente" },
  { value: "sides", label: "Laterales", shortLabel: "Laterales" },
  { value: "all", label: "Todo el exterior", shortLabel: "Todo el exterior" },
] as const;
export type FrameTextureOptions = {
  frameTexture: FrameTexture;
  frameTextureArea: (typeof textureAreas)[number]["value"];
  frameTextureDepth: number;
  frameTextureScale: number;
  frameCornerRounding: number;
};
// Matches the housing wall: even maximum rounding stays outside the square fits.
export const FRAME_CORNER_MAX_RADIUS = 2.4;
export const textureLimits = {
  depth: { min: 0.15, max: 0.6, step: 0.05 },
  scale: { min: 0.75, max: 2, step: 0.05 },
  corners: { min: 0, max: 100, step: 1 },
} as const;
// Preserve the original 0.6 mm relief, 5 mm period and full exterior on old projects.
export const defaultTextureOptions: FrameTextureOptions = {
  frameTexture: "none",
  frameTextureArea: "all",
  frameTextureDepth: 0.6,
  frameTextureScale: 1,
  frameCornerRounding: 0,
};
export const textureIntensities = [
  { label: "Suave", depth: 0.2, description: "Discreto" },
  { label: "Medio", depth: 0.4, description: "Equilibrado" },
  { label: "Fuerte", depth: 0.6, description: "Pronunciado" },
] as const;
export function textureOptions(
  h?: Partial<FrameTextureOptions>,
): FrameTextureOptions {
  return {
    frameTexture: h?.frameTexture ?? defaultTextureOptions.frameTexture,
    frameTextureArea:
      h?.frameTextureArea ?? defaultTextureOptions.frameTextureArea,
    frameTextureDepth:
      h?.frameTextureDepth ?? defaultTextureOptions.frameTextureDepth,
    frameTextureScale:
      h?.frameTextureScale ?? defaultTextureOptions.frameTextureScale,
    frameCornerRounding:
      h?.frameCornerRounding ?? defaultTextureOptions.frameCornerRounding,
  };
}
export function frameCornerRadius(percent: number) {
  return (FRAME_CORNER_MAX_RADIUS * percent) / 100;
}
export function textureIntensity(depth: number) {
  return (
    textureIntensities.find((item) => Math.abs(item.depth - depth) < 0.000001)
      ?.label ?? "Personalizado"
  );
}

/** Shared mathematical profile for printable geometry and lightweight thumbnails. */
export function textureProfile(
  texture: FrameTexture,
  x: number,
  y: number,
  scale = 1,
) {
  return textureDefinitions[texture].profile(x / scale, y / scale);
}

/** Keep legacy sampling exact; resolve new grooves with at least five samples
 * across their nominal width at minimum scale. Never coarser than 0.5 mm. */
export function textureSamplingStep(texture: FrameTexture, scale: number) {
  const step = textureDefinitions[texture].samplingStep;
  return step === 0.5 ? step : Math.min(0.5, step * scale);
}
