import type { Fabrication } from "./fabrication";

/** mm: height of the cable exit in the lower perimeter. */
export const WALL_BASE_RIM = 4;
export function wallPanelStart(f: Fabrication) {
  const e = f.enclosure!;
  return e.depth + (e.front === "design" ? (e.relief ?? 0.6) : 0);
}

export type EnclosureSettings = {
  depth: number;
  layout?: "wall";
  /** Saved key retained for compatibility; decorates the rear electronics lid. */
  front?: "plain" | "design";
  relief?: number;
  hangerEntry?: number;
  hangerNeck?: number;
};
export const defaultEnclosure: EnclosureSettings = {
  depth: 20,
  layout: "wall",
  front: "plain",
  relief: 0.6,
  hangerEntry: 8,
  hangerNeck: 4,
};
export const hasEnclosure = (f?: Fabrication) =>
  !!f?.enclosure && (f.illumination === "modular" || f.illumination === "cob");
export function validateEnclosure(e: EnclosureSettings) {
  if (!e || !Number.isFinite(e.depth) || e.depth < 8 || e.depth > 50)
    throw new Error(
      "La profundidad del compartimento electrónico debe estar entre 8 y 50 mm.",
    );
  if (
    (e.layout !== undefined && e.layout !== "wall") ||
    (e.front !== undefined && !["plain", "design"].includes(e.front)) ||
    !Number.isFinite(e.relief ?? 0.6) ||
    (e.relief ?? 0.6) < 0.3 ||
    (e.relief ?? 0.6) > 1.5 ||
    !Number.isFinite(e.hangerEntry ?? 8) ||
    (e.hangerEntry ?? 8) < 6 ||
    (e.hangerEntry ?? 8) > 12 ||
    !Number.isFinite(e.hangerNeck ?? 4) ||
    (e.hangerNeck ?? 4) < 2 ||
    (e.hangerNeck ?? 4) > (e.hangerEntry ?? 8) - 2
  )
    throw new Error(
      "Revisá el embellecedor y las medidas del anclaje de pared.",
    );
}
export const isWallMount = (f?: Fabrication) =>
  hasEnclosure(f) && f?.enclosure?.layout === "wall";
