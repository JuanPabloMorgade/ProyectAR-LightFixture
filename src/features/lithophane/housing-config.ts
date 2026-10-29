import type { Settings } from "./mesh";

export type HousingSettings = {
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
  s.housing?.enabled === true && s.angle < 180;

export function validateHousing(h?: HousingSettings) {
  if (h === undefined) return;
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
