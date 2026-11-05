import type { Fabrication } from "./fabrication";
/** Current round wall-mounted post; historical square posts retain their own size. */
export const WALL_POST_DIAMETER = 9;
/** Physical hardware stays in mm, independently of the optical box size. */
export type ModularSettings = {
  power: "aaa" | "usb";
  starDiameter: number;
  starThickness: number;
  emitterHeight: number;
  holderLength: number;
  holderWidth: number;
  holderHeight: number;
  cableDiameter: number;
};
export const defaultModular: ModularSettings = {
  power: "aaa",
  starDiameter: 20,
  starThickness: 1.2,
  emitterHeight: 5,
  // Provisional envelope of a purchased 3-AAA holder, not bare cell dimensions.
  holderLength: 55,
  holderWidth: 38,
  holderHeight: 14,
  cableDiameter: 6,
};
export const isModular = (f?: Fabrication) => f?.illumination === "modular";
