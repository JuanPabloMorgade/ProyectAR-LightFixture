import { defaultBox } from "./engine";
import { defaultFabrication, type Fabrication } from "./fabrication";
import { defaultModular } from "./modular";
import { defaultEnclosure } from "./enclosure";

export const defaultEditorBox = { ...defaultBox, lightPercent: 50 };
/** Legacy lighting remains readable; every editor project uses the 1 W fixture. */
export function currentFabrication(f?: Fabrication): Fabrication {
  return {
    ...defaultFabrication,
    ...f,
    illumination: "modular",
    modular: f?.modular ?? { ...defaultModular },
    enclosure: { ...defaultEnclosure, ...f?.enclosure, layout: "wall" },
  };
}
