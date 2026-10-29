import { isWallMount } from "./enclosure-config";
import { wallMountLayout, wallPartCount } from "./wallmount";
import { fitWallLight, rawWallSettings } from "./light-position";
import { solidMesh, type Bounds } from "./solid-mesh";
import { hasEnclosure } from "./enclosure-config";
import { validateBox, type BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";

import {
  defaultModular,
  isModular,
  type ModularSettings,
} from "./modular-config";
export {
  defaultModular,
  isModular,
  type ModularSettings,
} from "./modular-config";
export const modularCount = (f?: Fabrication) =>
  isWallMount(f)
    ? wallPartCount(f!)
    : hasEnclosure(f)
      ? isModular(f)
        ? 9
        : 7
      : isModular(f)
        ? (f?.modular ?? defaultModular).power === "aaa"
          ? 8
          : 7
        : 5;
export type ModularPartId = "post" | "head" | "battery-cover";
type Mesh = { positions: Float32Array; indices: Uint32Array };
export type ModularPart = Mesh & {
  id: ModularPartId;
  filename: string;
  label: string;
  width: number;
};
type Point = [number, number];

const WALL = 2;
const SOCKET_HEIGHT = 5;
const POST = 10;
const HEAD_FLOOR = 2;
const COVER = 2;

export function validateModular(m: ModularSettings) {
  const ranges = [
    [m?.starDiameter, 15, 40],
    [m?.starThickness, 0.6, 4],
    [m?.emitterHeight, 1, 15],
    [m?.holderLength, 30, 100],
    [m?.holderWidth, 20, 80],
    [m?.holderHeight, 8, 35],
    [m?.cableDiameter, 2, 6],
  ];
  if (
    !m ||
    !["aaa", "usb"].includes(m.power) ||
    ranges.some(([v, min, max]) => !Number.isFinite(v) || v < min || v > max)
  )
    throw new Error(
      "Revisá las medidas del montaje modular y la alimentación.",
    );
}

export function modularLayout(s: BoxSettings, f: Fabrication) {
  if (isWallMount(f)) {
    validateModular(f.modular ?? defaultModular);
    const l = wallMountLayout(s, f);
    return {
      ...l,
      m: f.modular ?? defaultModular,
      margin: 4,
      starSeat: (f.modular ?? defaultModular).starDiameter + f.clearance,
      emitterLocal: l.source,
      headWidth: l.headWidth,
      coverZ: l.coverTop,
      tip: l.source,
      suggestedLightPercent: 50,
      minEmitter: l.depth + 14,
    };
  }
  validateBox(s);
  const m = f.modular ?? defaultModular;
  validateModular(m);
  if (!Number.isFinite(f.clearance) || f.clearance < 0.1 || f.clearance > 0.8)
    throw new Error("Revisá la holgura de impresión.");
  if (s.thickness < 1.2)
    throw new Error("Usá al menos 1,2 mm de espesor para la base modular.");
  const c = f.clearance;
  const width = s.width * 10 + (f.joints ? s.thickness : 0);
  const height = s.height * 10 + (f.joints ? s.thickness : 0);
  const margin = s.thickness + c / 2 + 3;
  const starSeat = m.starDiameter + c;
  const headWidth = starSeat + WALL * 2;
  const socket = POST + c;
  const socketOuter = socket + WALL * 2;
  const batteryWidth = m.holderLength + c + WALL * 2;
  const batteryHeight = m.holderWidth + c + WALL * 2;
  const batteryX = (width - batteryWidth) / 2;
  const batteryY = margin;
  // Reserve headroom for the 3 mm door skirt above the purchased holder.
  const batteryTop = s.thickness + m.holderHeight + c + 3;
  // A plug ring enters the box by 3 mm; the door sits on the box walls.
  const coverZ = batteryTop + COVER;
  const emitterLocal =
    s.depth * 10 + s.thickness / 2 - (s.depth * 10 * s.lightPercent) / 100;
  const postLength =
    emitterLocal - s.thickness - HEAD_FLOOR - m.starThickness - m.emitterHeight;
  const headZ = s.thickness + postLength - SOCKET_HEIGHT;
  const minEmitter = Math.max(
    s.thickness +
      SOCKET_HEIGHT * 2 +
      2 +
      HEAD_FLOOR +
      m.starThickness +
      m.emitterHeight,
    m.power === "aaa" && !hasEnclosure(f) ? coverZ + 4 : 0,
  );
  const suggestedLightPercent = Math.max(
    10,
    Math.min(
      60,
      Math.floor(
        ((s.depth * 10 + s.thickness / 2 - minEmitter - 2) / (s.depth * 10)) *
          100,
      ),
    ),
  );
  const base = {
    m,
    width,
    height,
    margin,
    starSeat,
    headWidth,
    socket,
    socketOuter,
    batteryWidth,
    batteryHeight,
    batteryX,
    batteryY,
    batteryTop,
    coverZ,
    emitterLocal,
    postLength,
    headZ,
    suggestedLightPercent,
    minEmitter,
  };
  if (headWidth + margin * 2 > Math.min(width, height))
    throw new Error("El cabezal de la estrella no entra en esta caja.");
  if (
    m.power === "aaa" &&
    (batteryWidth + margin * 2 > width ||
      (hasEnclosure(f)
        ? batteryY + batteryHeight + margin > height
        : batteryY + batteryHeight + 3 >
          height / 2 - Math.max(headWidth, socketOuter) / 2))
  )
    throw new Error(
      "El portapilas de 3 AAA invade el poste o los bordes. Aumentá el ancho/alto de la caja o revisá sus medidas.",
    );
  if (emitterLocal < minEmitter - 1e-6)
    throw new Error(
      `No hay profundidad para el poste y la luz. Bajá la posición de luz a ${suggestedLightPercent}% o aumentá la profundidad.`,
    );
  return base;
}

/** Suggestion independent of an invalid optical position; never silently changes it. */
export function modularLightPosition(s: BoxSettings, f: Fabrication) {
  if (isWallMount(f)) {
    const adjusted = fitWallLight(rawWallSettings(s), f);
    wallMountLayout(adjusted, f);
    return adjusted.lightPercent;
  }
  return modularLayout({ ...s, lightPercent: 10 }, f).suggestedLightPercent;
}

export function modularLid(
  s: BoxSettings,
  f: Fabrication,
  outline: Point[],
): Mesh {
  const l = modularLayout(s, f),
    t = s.thickness;
  const { width: w, height: h, socket: i, socketOuter: o } = l;
  const boxes: Bounds[] = [
    [
      w / 2 - o / 2,
      w / 2 + o / 2,
      h / 2 - o / 2,
      h / 2 + o / 2,
      t,
      t + SOCKET_HEIGHT,
    ],
  ];
  const cuts: Bounds[] = [
    [
      w / 2 - i / 2,
      w / 2 + i / 2,
      h / 2 - i / 2,
      h / 2 + i / 2,
      t,
      t + SOCKET_HEIGHT,
    ],
    [
      w / 2 - l.m.cableDiameter / 2,
      w / 2 + l.m.cableDiameter / 2,
      h / 2 - o / 2,
      h / 2 - i / 2,
      t,
      t + 3,
    ],
  ];
  if (l.m.power === "aaa" && !hasEnclosure(f)) {
    const {
      batteryX: x,
      batteryY: y,
      batteryWidth: bw,
      batteryHeight: bh,
      batteryTop: z,
    } = l;
    boxes.push([x, x + bw, y, y + bh, t, z]);
    cuts.push(
      [x + WALL, x + bw - WALL, y + WALL, y + bh - WALL, t, z],
      [
        w / 2 - l.m.cableDiameter / 2,
        w / 2 + l.m.cableDiameter / 2,
        y + bh - WALL,
        y + bh,
        t,
        t + 4,
      ],
    );
  } else if (!hasEnclosure(f)) {
    // Cable passthrough; no assumed USB socket/PCB footprint.
    const a = l.m.cableDiameter / 2;
    cuts.push([
      w / 2 - a,
      w / 2 + a,
      l.margin,
      l.margin + l.m.cableDiameter,
      0,
      t,
    ]);
  }
  if (hasEnclosure(f)) {
    const a = l.m.cableDiameter / 2;
    cuts.push([w / 2 - a, w / 2 + a, h / 2 - a, h / 2 + a, 0, t]);
  }
  return solidMesh(boxes, cuts, outline, t);
}

export function modularParts(s: BoxSettings, f: Fabrication): ModularPart[] {
  const l = modularLayout(s, f),
    a = POST / 2,
    h = l.headWidth,
    mid = h / 2;
  const wire = l.m.cableDiameter;
  const post = solidMesh(
    [[0, POST, 0, POST, 0, l.postLength]],
    [
      [a - wire / 2, a + wire / 2, a - wire / 2, a + wire / 2, 0, l.postLength],
      [a - wire / 2, a + wire / 2, 0, a - wire / 2, 0, 3],
    ],
  );
  const i = l.socket / 2,
    o = l.socketOuter / 2,
    seat = l.starSeat / 2;
  const floor = SOCKET_HEIGHT + HEAD_FLOOR;
  // Keep a material bridge between the wire hole and each ventilation window.
  // At an exact corner contact the surface would have four faces on one edge.
  const railHalf = wire / 2 + 1;
  // Open underside: peripheral shelf plus two support rails, no solid disc behind the star.
  const head = solidMesh(
    [
      [mid - o, mid + o, mid - o, mid + o, 0, SOCKET_HEIGHT],
      [0, h, 0, h, SOCKET_HEIGHT, floor],
      [0, h, 0, h, floor, floor + l.m.starThickness],
    ],
    [
      [mid - i, mid + i, mid - i, mid + i, 0, SOCKET_HEIGHT],
      ...[-1, 1].flatMap((sx) =>
        [-1, 1].map(
          (sy) =>
            [
              sx < 0 ? mid - seat + WALL : mid + railHalf,
              sx < 0 ? mid - railHalf : mid + seat - WALL,
              sy < 0 ? mid - seat + WALL : mid + railHalf,
              sy < 0 ? mid - railHalf : mid + seat - WALL,
              SOCKET_HEIGHT,
              floor,
            ] as Bounds,
        ),
      ),
      [
        mid - wire / 2,
        mid + wire / 2,
        mid - wire / 2,
        mid + wire / 2,
        SOCKET_HEIGHT,
        floor,
      ],
      [
        mid - seat,
        mid + seat,
        mid - seat,
        mid + seat,
        floor,
        floor + l.m.starThickness,
      ],
      [0, h, mid - wire / 2, mid + wire / 2, floor, floor + l.m.starThickness],
    ],
  );
  const parts: ModularPart[] = [
    {
      ...post,
      id: "post",
      filename: "06-poste-hueco",
      label: "Poste hueco desmontable",
      width: POST,
    },
    {
      ...head,
      id: "head",
      filename: "07-cabezal-estrella",
      label: "Cabezal abierto para placa estrella",
      width: h,
    },
  ];
  if (l.m.power === "aaa" && !hasEnclosure(f)) {
    const w = l.batteryWidth,
      b = l.batteryHeight,
      c = f.clearance;
    const skirt = WALL + c / 2;
    const cover = solidMesh(
      [
        [0, w, 0, b, 0, COVER],
        [skirt, w - skirt, skirt, b - skirt, COVER, COVER + 3],
      ],
      [
        [
          skirt + 1.5,
          w - skirt - 1.5,
          skirt + 1.5,
          b - skirt - 1.5,
          COVER,
          COVER + 3,
        ],
      ],
    );
    parts.push({
      ...cover,
      id: "battery-cover",
      filename: "08-tapa-3-AAA",
      label: "Tapita desmontable del portapilas de 3 AAA",
      width: w,
    });
  }
  return parts;
}

/** Additional parts are located relative to the same front plane as the chassis. */
export function modularPoint(
  id: ModularPartId,
  x: number,
  y: number,
  z: number,
  s: BoxSettings,
  f: Fabrication,
): [number, number, number] {
  const l = modularLayout(s, f);
  if (id === "post") return [x - POST / 2, y - POST / 2, s.thickness + z];
  if (id === "head")
    return [x - l.headWidth / 2, y - l.headWidth / 2, l.headZ + z];
  return [
    x + l.batteryX - l.width / 2,
    y + l.batteryY - l.height / 2,
    l.coverZ - z,
  ];
}

export function modularGuide(s: BoxSettings, f: Fabrication): string[] {
  const l = modularLayout(s, f),
    m = l.m;
  return [
    "MONTAJE MODULAR · LED DE 1 W",
    m.power === "aaa"
      ? "Alimentación: 3 pilas AAA alcalinas en serie (4,5 V nominales)."
      : "Alimentación: USB regulado de 5 V mediante cable pasante; no incluye conector USB ni placa electrónica.",
    `Placa estrella: diámetro nominal ${m.starDiameter} mm, espesor ${m.starThickness} mm. Holgura total ${f.clearance} mm.`,
    `Altura desde la cara de la estrella hasta el emisor: ${m.emitterHeight} mm (provisional: medir el LED real).`,
    `Poste de 10 × 10 mm, largo ${l.postLength.toFixed(2)} mm; canal ${m.cableDiameter} × ${m.cableDiameter} mm. La entrada lateral mira hacia el portapilas o el pasacables.`,
    "Imprimí la placa portaluces con la cara exterior en la cama. Poste de pie. Cabezal con el alojamiento del poste hacia la cama: verificá el puente sobre el hueco y usá soporte si tu impresora lo requiere.",
    "Encastres y cabezal son guías sin traba: calibrá el ajuste y fijá el poste y el cabezal después de probar la luz. No fuerces la estrella ni sus soldaduras.",
    "El cabezal deja ventanas detrás de la estrella. Sujetá la placa con adhesivo apropiado en el perímetro, sin tapar ventanas ni contactos; el plástico no sustituye un disipador.",
    ...(m.power === "aaa"
      ? [
          `Portapilas comercial 3 AAA: envolvente configurada ${m.holderLength} × ${m.holderWidth} × ${m.holderHeight} mm. Medidas iniciales provisionales: medir antes de imprimir. No incluye contactos metálicos.`,
          hasEnclosure(f)
            ? "El portapilas se aloja en la caja electrónica del lado de la persona, separado de la cámara de luz. Retirá la tapa exterior 09 para acceder a las conexiones."
            : "Pasá los cables por la abertura superior del compartimento. La tapita entra con un reborde de guiado, sin pestillo: comprobá su ajuste y usá una fijación removible si hace falta.",
          hasEnclosure(f)
            ? "Pasá los cables por los orificios alineados de la caja electrónica y la placa portaluces; no cierres la tapa exterior hasta probar la luz."
            : "Imprimí la tapita con su cara plana en la cama y el reborde hacia arriba; al montarla, el reborde entra en el compartimento.",
        ]
      : []),
    "Conexión propuesta para un solo LED blanco: positivo → interruptor → resistencia de 10 Ω / 5 W → ánodo LED; cátodo LED → negativo. Verificá polaridad y corriente real antes del montaje definitivo.",
    "Los valores de corriente/brillo dependen del LED y de la alimentación. La placa estrella no certifica por sí sola la disipación: comprobá la temperatura del conjunto y dejá espacio para la resistencia separado del plástico.",
    "Elegí una sola alimentación por montaje. No conectes USB a las pilas ni uses este circuito para cargarlas. 3 AAA NiMH tienen una tensión distinta a las alcalinas.",
    `Emisor centrado a ${((s.depth * 10 * s.lightPercent) / 100).toFixed(2)} mm de la pared. La simulación puntual no incluye la oclusión del soporte, el compartimento ni el tamaño real del emisor.`,
  ];
}
