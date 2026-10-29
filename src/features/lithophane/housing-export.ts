import { zipFiles } from "../shadowbox/zip";
import { binarySTL, type Settings } from "./mesh";
import { housingPrintMesh, housingGuide, type HousingPart } from "./housing";
import type { Mesh } from "../shadowbox/solid-mesh";
import { panelForPrinting, printStandGuide } from "./print-stand";

export function housingZIP(
  panel: Mesh,
  parts: HousingPart[],
  s: Settings,
  name: string,
  preparedPanel?: Mesh,
) {
  if (parts.length !== 3) throw new Error("Faltan piezas de la caja trasera.");
  const photo = preparedPanel ?? panelForPrinting(panel, s);
  const files = [
    {
      name: `${name}-01-panel-litofania.stl`,
      data: new Uint8Array(binarySTL(photo.positions, photo.indices)),
    },
    ...parts.map((part) => {
      const m = housingPrintMesh(part, s);
      return {
        name: `${name}-${part.filename}.stl`,
        data: new Uint8Array(binarySTL(m.positions, m.indices)),
      };
    }),
    {
      name: "Guia-de-armado.txt",
      data: new TextEncoder().encode(
        `${housingGuide(s)}\n\nIMPRESIÓN DEL PANEL\n${printStandGuide(s)}\n`,
      ),
    },
  ];
  return zipFiles(files);
}
