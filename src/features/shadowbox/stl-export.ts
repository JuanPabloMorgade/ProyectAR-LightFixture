import {
  printMesh,
  printParts,
  type BoxSettings,
  type WallMask,
} from "./engine";
import { binarySTL } from "../lithophane/mesh";
import { zipFiles } from "./zip";

export type STLExportMode = "combined" | "separate";
export type STLExportRequest = {
  settings: BoxSettings;
  masks: WallMask[];
  mode: STLExportMode;
  name: string;
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
}: STLExportRequest): STLExportResult {
  if (mode === "combined") {
    const mesh = printMesh(masks, settings);
    return {
      buffer: binarySTL(mesh.positions, mesh.indices),
      filename: `${name}-5-piezas.stl`,
      mime: "model/stl",
      triangles: mesh.indices.length / 3,
    };
  }
  if (mode !== "separate")
    throw new Error("Elegí un formato de descarga válido.");
  const parts = printParts(masks, settings);
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
