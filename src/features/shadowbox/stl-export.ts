import { isWallMount } from "./enclosure-config";
import { projectionSettings } from "./projection-settings";
import { fixtureShadow, reachableMasks } from "./projection-occlusion";
import { type BoxSettings, type WallMask } from "./engine";
import {
  fabricationMesh,
  fabricationParts,
  ledLayout,
  fabricationMasks,
  type Fabrication,
} from "./fabrication";
import { isCob, cobGuide } from "./cob";
import { isModular, modularCount, modularGuide } from "./modular";
import { hasEnclosure, enclosureGuide } from "./enclosure";
import { binarySTL } from "../lithophane/mesh";
import { zipFiles } from "./zip";

export type STLExportMode = "combined" | "separate";
export type STLExportRequest = {
  settings: BoxSettings;
  masks: WallMask[];
  mode: STLExportMode;
  name: string;
  fabrication?: Fabrication;
  artwork?: Uint8ClampedArray;
};
export type STLExportResult = {
  buffer: ArrayBuffer;
  filename: string;
  mime: string;
  triangles: number;
};

export function buildSTLExport({
  settings,
  masks,
  mode,
  name,
  fabrication,
  artwork,
}: STLExportRequest): STLExportResult {
  settings = projectionSettings(settings, fabrication);
  if (fabrication && isWallMount(fabrication))
    masks = fabricationMasks(
      reachableMasks(
        masks,
        settings,
        fixtureShadow(settings, fabrication, artwork),
      ).masks,
      settings,
      fabrication,
    );
  if (mode === "combined") {
    const mesh = fabricationMesh(masks, settings, fabrication, artwork);
    return {
      buffer: binarySTL(mesh.positions, mesh.indices),
      filename: `${name}-${modularCount(fabrication)}-piezas.stl`,
      mime: "model/stl",
      triangles: mesh.indices.length / 3,
    };
  }
  if (mode !== "separate")
    throw new Error("Elegí un formato de descarga válido.");
  const parts = fabricationParts(masks, settings, fabrication, artwork);
  const files = parts.map((part) => ({
    name: `${name}-${part.filename}.stl`,
    data: new Uint8Array(binarySTL(part.positions, part.indices)),
  }));
  files.push({
    name: "Guia-de-armado.txt",
    data: new TextEncoder().encode(
      [
        "ProyectAR - Identificación de las piezas",
        "",
        ...parts.map((part) => `${name}-${part.filename}.stl: ${part.label}.`),
        "",
        "Superior, inferior, izquierda y derecha se nombran mirando la caja de frente,",
        isWallMount(fabrication)
          ? "desde la habitación. El frente es un marco abierto; la base cerrada va contra la pared."
          : "desde la habitación, con la tapa exterior hacia la persona. El lado abierto mira hacia la pared.",
        "Cada STL contiene una sola pieza, en milímetros y a escala real. Consultá la orientación de impresión indicada para el montaje.",
        `Caja: ${settings.width} x ${settings.height} x ${settings.depth} cm. Espesor: ${settings.thickness} mm.`,
        ...(fabrication && hasEnclosure(fabrication)
          ? enclosureGuide(settings, fabrication)
          : []),
        ...(fabrication && isWallMount(fabrication)
          ? isCob(fabrication)
            ? cobGuide(settings, fabrication)
            : []
          : fabrication
            ? isModular(fabrication)
              ? modularGuide(settings, fabrication)
              : isCob(fabrication)
                ? cobGuide(settings, fabrication)
                : [
                    "",
                    "PROTOTIPO CON SOPORTE LED",
                    `La pieza 05 incorpora ${fabrication.ledCount} alojamiento(s) cilíndrico(s) en su cara interior.`,
                    `LED: cuerpo ${fabrication.ledDiameter} mm, reborde ${fabrication.flangeDiameter} mm, altura ${fabrication.ledHeight} mm. Holgura diametral: ${fabrication.clearance} mm.`,
                    `Diámetro del asiento: ${(ledLayout(settings, fabrication).pocketRadius * 2).toFixed(2)} mm; incluye 0,2 mm adicionales solo para el LED. Distribución centrada en varias filas.`,
                    `La punta del LED queda a ${ledLayout(settings, fabrication).tip} mm de la pared de proyección.`,
                    "Apoyá el reborde en el asiento; la cabeza queda expuesta. Pasá las patas por el conducto antes de cerrar.",
                    "Los alojamientos son de prueba: verificá el ajuste y fijá el LED con un punto de adhesivo si queda suelto.",
                    "Imprimí primero la tapa, con la cara exterior en la cama y los soportes hacia arriba.",
                    fabrication.joints
                      ? "Presentá las lengüetas en las ranuras de la tapa y alterná los dientes entre paredes. Es un encastre guiado, sin traba: probá la holgura antes de fijarlo."
                      : "Encastres desactivados: las paredes conservan sus bordes planos.",
                    fabrication.joints
                      ? `Las dimensiones exteriores son ${settings.width * 10 + settings.thickness} x ${settings.height * 10 + settings.thickness} mm; las medidas configuradas definen los planos medios de las paredes.`
                      : "",
                    "La simulación usa una fuente puntual central. Varios LEDs encendidos pueden duplicar/desplazar las sombras.",
                    "No incluye caja electrónica ni circuito. Usá la limitación de corriente adecuada a cada LED.",
                  ]
            : []),
        "",
      ].join("\n"),
    ),
  });
  return {
    buffer: zipFiles(files),
    filename: `${name}-piezas-separadas.zip`,
    mime: "application/zip",
    triangles: parts.reduce((sum, part) => sum + part.indices.length / 3, 0),
  };
}
