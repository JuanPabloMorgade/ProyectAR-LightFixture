import type { BoxSettings } from "./engine";

export const ASSEMBLY_STEPS = [
  {
    title: "Reconocé las cinco piezas",
    short: "Piezas",
    part: null,
    description:
      "Compará los recortes de tu diseño y los números de los archivos. Izquierda y derecha se identifican mirando la tapa lisa desde la habitación.",
  },
  {
    title: "Empezá por la tapa frontal",
    short: "Tapa",
    part: "front",
    description:
      "Identificá la pieza 05, sin recortes. Será la cara visible del cuadro. Presentá las paredes por detrás de esta tapa antes de fijarlas.",
  },
  {
    title: "Ubicá la pared inferior",
    short: "Inferior",
    part: "bottom",
    description:
      "Acercá la pieza 02 al borde inferior de la tapa. Conservá el sentido de sus recortes tal como aparece en la vista 3D.",
  },
  {
    title: "Sumá la pared izquierda",
    short: "Izquierda",
    part: "left",
    description:
      "Presentá la pieza 03 a la izquierda, mirando la cara lisa de frente. Alineala con la tapa y la pared inferior.",
  },
  {
    title: "Sumá la pared derecha",
    short: "Derecha",
    part: "right",
    description:
      "Presentá la pieza 04 en el lado opuesto. Comprobá la orientación de los recortes antes de fijar las uniones.",
  },
  {
    title: "Completá con la pared superior",
    short: "Superior",
    part: "top",
    description:
      "Ubicá la pieza 01 arriba. Las cuatro paredes rodean la tapa frontal; el lado de atrás queda abierto hacia la pared.",
  },
  {
    title: "Ubicá la luz en el interior",
    short: "Luz",
    part: null,
    description:
      "La esfera indica la posición de luz configurada en tu proyecto. La tapa se vuelve transparente para mostrar el interior. El soporte de la luz no está incluido en los STL.",
  },
  {
    title: "Orientá el cuadro hacia la pared",
    short: "Resultado",
    part: null,
    description:
      "La tapa lisa mira hacia la habitación y el lado abierto hacia la pared. Compará la proyección de tu diseño y ajustá la posición real de la luz antes del montaje definitivo.",
  },
] as const;

export type AssemblyPart = "top" | "bottom" | "left" | "right" | "front";
export const PLACEMENT_ORDER: AssemblyPart[] = [
  "front",
  "bottom",
  "left",
  "right",
  "top",
];

export function assemblyPosition(
  part: AssemblyPart,
  settings: BoxSettings,
  exploded: boolean,
): [number, number, number] {
  const { width: w, height: h, depth: d } = settings;
  const gap = exploded ? Math.max(w, h, d) * 0.65 : 0;
  switch (part) {
    case "top":
      return [0, h / 2 + gap, d / 2];
    case "bottom":
      return [0, -h / 2 - gap, d / 2];
    case "left":
      return [-w / 2 - gap, 0, d / 2];
    case "right":
      return [w / 2 + gap, 0, d / 2];
    case "front":
      return [0, 0, d + gap];
  }
}
