import { type BoxSettings, type WallMask } from "./engine";
import {
  fabricationMesh,
  fabricationParts,
  ledLayout,
  type Fabrication,
} from "./fabrication";
import { binarySTL } from "../lithophane/mesh";
import { zipFiles } from "./zip";

export type STLExportMode = "combined" | "separate";
export type STLExportRequest = {
  settings: BoxSettings;
  masks: WallMask[];
  mode: STLExportMode;
  name: string;
  fabrication?: Fabrication;
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
}: STLExportRequest): STLExportResult {
  if (mode === "combined") {
    const mesh = fabricationMesh(masks, settings, fabrication);
    return {
      buffer: binarySTL(mesh.positions, mesh.indices),
      filename: `${name}-5-piezas.stl`,
      mime: "model/stl",
      triangles: mesh.indices.length / 3,
    };
  }
  if (mode !== "separate")
    throw new Error("Elegí un formato de descarga válido.");
  const parts = fabricationParts(masks, settings, fabrication);
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
        "desde la habitación, con la tapa frontal lisa hacia vos.",
        "El lado abierto mira hacia la pared; la luz se coloca dentro de la caja.",
        "Cada STL contiene una sola pieza, acostada, en milímetros y a escala real.",
        `Caja: ${settings.width} x ${settings.height} x ${settings.depth} cm. Espesor: ${settings.thickness} mm.`,
        ...(fabrication
          ? [
              "",
              "PROTOTIPO CON SOPORTE LED",
              `La pieza 05 incorpora ${fabrication.ledCount} alojamiento(s) cilíndrico(s) en su cara interior.`,
              `LED: cuerpo ${fabrication.ledDiameter} mm, reborde ${fabrication.flangeDiameter} mm, altura ${fabrication.ledHeight} mm. Holgura diametral: ${fabrication.clearance} mm.`,
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
              "La simulación usa una fuente puntual central. Dos o tres LEDs encendidos pueden duplicar/desplazar las sombras.",
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
