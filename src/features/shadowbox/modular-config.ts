import type { Fabrication } from "./fabrication";
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
  cableDiameter: 4,
};
export const isModular = (f?: Fabrication) => f?.illumination === "modular";
