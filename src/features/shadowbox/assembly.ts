import type { BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import { hasEnclosure } from "./enclosure";
import { isModular, modularCount } from "./modular";
import { isWallMount } from "./enclosure-config";

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

export type AssemblyPart =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "front"
  | "post"
  | "head"
  | "battery-cover"
  | "electronics"
  | "face"
  | "base"
  | "separator";

export type AssemblyStep = {
  title: string;
  short: string;
  part: AssemblyPart | null;
  description: string;
};
export function assemblySequence(f?: Fabrication): {
  steps: AssemblyStep[];
  lightStep: number;
  resultStep: number;
} {
  if (isWallMount(f))
    return {
      lightStep: 9,
      resultStep: 11,
      steps: [
        {
          title: `Reconocé las ${modularCount(f)} piezas`,
          short: "Piezas",
          part: null,
          description:
            "Identificá base con anclaje, tapa electrónica, tubo y cabezal (1 W), paredes y embellecedor. Las pilas tienen una tapita independiente. La base va contra la pared.",
        },
        {
          title: "Presentá la base contra la pared",
          short: "Base y anclaje",
          part: "base",
          description:
            "Identificá el ojo de cerradura reforzado y la abertura de pilas en la cara posterior. Probá la cabeza y el cuello del tornillo antes de colgar. La tapa de pilas queda al ras contra la pared y se retira después de descolgar el cuadro.",
        },
        {
          title: "Instalá las conexiones y cerrá las pilas",
          short: "Pilas y cables",
          part:
            isModular(f) && (f!.modular?.power ?? "aaa") === "aaa"
              ? "battery-cover"
              : "base",
          description:
            "Introducí el portapilas comercial por la abertura trasera de la base, probá conexiones e interruptor y colocá la tapa al ras de esa cara posterior. El ajuste es guiado, sin pestillo; comprobá su retención antes de colgar. En USB, prepará el cable de 5 V por la salida inferior. Reservá cable para subir por el tubo.",
        },
        {
          title: "Colocá la tapa electrónica",
          short: "Tapa de base",
          part: "separator",
          description:
            "La tapa electrónica apoya dentro de la base y separa las conexiones de la cámara óptica. Su agujero central deja pasar el tubo y los cables hacia abajo. El cierre es guiado, sin pestillo.",
        },
        {
          title: isModular(f)
            ? "Instalá el tubo hueco"
            : "Pasá los cables hacia la base",
          short: "Tubo y paso",
          part: isModular(f) ? "post" : "separator",
          description: isModular(f)
            ? "Pasá el tubo por el agujero de la tapa electrónica y apoyalo en el alojamiento central de la base. Los cables circulan por su interior y salen hacia las conexiones de abajo. Comprobá el largo antes de fijar."
            : "Llevá los cables de la tira COB desde el embellecedor hasta el paso central de la tapa electrónica, dejando longitud para abrir el frente.",
        },
        {
          ...ASSEMBLY_STEPS[2],
          description:
            "Alineá las ranuras interiores de la pared inferior con las dos guías finas del exterior de la base. Deslizá la pared por fuera del perímetro hasta el reborde inferior. Su tramo cerrado cubre el costado de la base; los recortes empiezan por encima de la tapa electrónica.",
        },
        ASSEMBLY_STEPS[3],
        ASSEMBLY_STEPS[4],
        {
          ...ASSEMBLY_STEPS[5],
          description:
            "Completá las cuatro paredes deslizándolas por fuera de la base, con sus ranuras sobre las guías si los encastres están activos. El tramo inferior cerrado llega hasta el reborde de la base. En 1 W los paneles terminan después del cabezal.",
        },
        {
          title: isModular(f)
            ? "Montá el cabezal y orientá el LED"
            : "Colocá la tira detrás del embellecedor",
          short: "Luz",
          part: isModular(f) ? "head" : "front",
          description: isModular(f)
            ? "Montá la estrella en el cabezal con el LED hacia la pared. Presentá los dos tetones del puente en los rebajes posteriores del marco, probá el ajuste y usá fijación removible si hace falta. El puente queda detrás del LED; el tubo central solo guía los cables y no sostiene el cabezal."
            : "La tira va en los rebajes posteriores del marco abierto, con la luz hacia la pared. Soldá y probá los tramos antes de fijarlos. El relieve decorativo queda en la tapa trasera de electrónica.",
        },
        {
          title: "Colocá el embellecedor frontal",
          short: "Embellecedor",
          part: "front",
          description:
            "Encastrá el marco con su cabezal ya montado sobre las cuatro paredes. Dejá el centro abierto y acomodá los cables finos hacia el tubo sin cruzarlos sobre la cara luminosa. El cierre liso o con diseño queda atrás. Calibrá los encastres antes de fijar.",
        },
        {
          title: "Colgá la base y revisá la sombra",
          short: "Resultado",
          part: null,
          description:
            "La base se cuelga del tornillo mediante el ojo de cerradura y queda contra la pared. El marco abierto mira a la persona; la sombra aparece alrededor y detrás del cuadro. Comprobá fijación, proyección y temperatura con el primer montaje.",
        },
      ],
    };
  if (!hasEnclosure(f))
    return {
      steps: ASSEMBLY_STEPS.map((item, i) =>
        isModular(f)
          ? {
              ...item,
              title:
                i === 0
                  ? `Reconocé las ${modularCount(f)} piezas`
                  : i === 1
                    ? "Empezá por la base modular"
                    : i === 6
                      ? "Montá el poste, el cabezal y la luz"
                      : item.title,
            }
          : item,
      ),
      lightStep: 6,
      resultStep: 7,
    };
  return {
    lightStep: 7,
    resultStep: 9,
    steps: [
      {
        title: `Reconocé las ${modularCount(f)} piezas`,
        short: "Piezas",
        part: null,
        description:
          "Identificá las cuatro paredes, la placa portaluces, la caja electrónica y la tapa exterior. El LED de 1 W suma el poste y el cabezal. La tapa exterior mira hacia la persona.",
      },
      {
        title: "Prepará la caja electrónica",
        short: "Electrónica",
        part: "electronics",
        description:
          "La caja electrónica es una pieza independiente. Presentá dentro las conexiones y, para 3 AAA, el portapilas comercial. La salida de alimentación queda en el borde inferior. No cierres todavía la tapa exterior.",
      },
      {
        title: "Separá la luz de las conexiones",
        short: "Placa de luz",
        part: "front",
        description:
          "La pieza 05 sostiene la luz en su cara interior. Presentá la caja electrónica contra su cara exterior y alineá los pasos de cable. Fijá el perímetro después de comprobar el recorrido; la electrónica queda fuera de la cámara de proyección.",
      },
      {
        ...ASSEMBLY_STEPS[2],
        description:
          "Ubicá la pared inferior por el lado de la luz, hacia la pared de proyección. Conservá el sentido de sus recortes.",
      },
      ASSEMBLY_STEPS[3],
      ASSEMBLY_STEPS[4],
      {
        ...ASSEMBLY_STEPS[5],
        description:
          "Completá las cuatro paredes alrededor de la placa portaluces. Sus recortes dejan pasar la luz hacia la pared de atrás.",
      },
      {
        title: isModular(f)
          ? "Montá el poste, el cabezal y la luz"
          : "Instalá la tira COB",
        short: "Luz",
        part: isModular(f) ? "post" : "front",
        description: isModular(f)
          ? "Instalá el poste 06 y el cabezal 07 en el lado óptico de la placa 05. La estrella y el LED miran hacia la pared de atrás. Pasá los cables por el poste y por los huecos alineados hacia la caja electrónica. Probá antes de fijar."
          : "Colocá los tramos COB en los rebajes de la cara interior de la placa 05, con la superficie luminosa hacia la pared de atrás. Pasá los cables por el orificio libre hacia la caja electrónica y comprobá polaridad y conexiones antes de pegar.",
      },
      {
        title: "Cerrá el frente hacia la persona",
        short: "Tapa exterior",
        part: "face",
        description:
          "Colocá la tapa exterior opaca sobre la caja electrónica, con el reborde hacia adentro. La persona ve esta cara lisa. El cierre es guiado, sin pestillo; comprobá el ajuste y conservá una fijación removible para acceder a las conexiones.",
      },
      {
        title: "Frente hacia la persona, sombra detrás",
        short: "Resultado",
        part: null,
        description:
          "La tapa exterior queda mirando a la habitación. La luz sale por los recortes laterales y proyecta la imagen en la pared detrás de la caja, como en la referencia. El frente central tapa parte de la proyección; validá el resultado con una prueba física.",
      },
    ],
  };
}
export function assemblyPlacement(part: AssemblyPart, f?: Fabrication) {
  if (isWallMount(f))
    return {
      base: 1,
      separator: 3,
      post: 4,
      head: 9,
      front: 10,
      bottom: 5,
      left: 6,
      right: 7,
      top: 8,
      "battery-cover": 2,
      electronics: 1,
      face: 10,
    }[part];
  if (hasEnclosure(f))
    return {
      electronics: 1,
      base: 1,
      separator: 2,
      front: 2,
      bottom: 3,
      left: 4,
      right: 5,
      top: 6,
      post: 7,
      head: 7,
      face: 8,
      "battery-cover": 8,
    }[part];
  return ["post", "head", "battery-cover"].includes(part)
    ? 6
    : PLACEMENT_ORDER.indexOf(part) + 1;
}
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
  const offset = settings.wallOffset ?? 0;
  const gap = exploded ? Math.max(w, h, d) * 0.65 : 0;
  switch (part) {
    case "top":
      return [0, h / 2 + gap, offset + d / 2];
    case "bottom":
      return [0, -h / 2 - gap, offset + d / 2];
    case "left":
      return [-w / 2 - gap, 0, offset + d / 2];
    case "right":
      return [w / 2 + gap, 0, offset + d / 2];
    case "front":
      return [0, 0, offset + d + gap];
    case "electronics":
      return [gap ? -gap * 2 : 0, 0, d];
    case "face":
      return [gap * 2, 0, d + gap];
    case "base":
      return [gap ? -gap * 2 : 0, 0, 0];
    case "separator":
      return [0, gap, 0];
    case "post":
      return [gap, 0, offset ? 0 : d];
    case "head":
      return [gap, gap, offset ? 0 : d];
    case "battery-cover":
      return [gap ? -gap : 0, gap ? -gap : 0, offset ? 0 : d];
  }
}
