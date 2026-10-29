import { isWallMount } from "./enclosure-config";
import { wallMountLayout, wallMountGuide } from "./wallmount";
import { validateBox, type BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import { isModular, defaultModular } from "./modular";
import { cobLayout } from "./cob";
import { solidMesh, type Bounds } from "./solid-mesh";

import { validateEnclosure } from "./enclosure-config";
export {
  hasEnclosure,
  defaultEnclosure,
  validateEnclosure,
  type EnclosureSettings,
} from "./enclosure-config";
export type EnclosurePartId = "electronics" | "face";

/** Wall = Z0; person = +Z. Electronics live outside the optical chamber. */
export function enclosureLayout(s: BoxSettings, f: Fabrication) {
  if (isWallMount(f))
    return {
      ...wallMountLayout(s, f),
      cover: 2,
      skirt: 3,
      clearance: f.clearance,
      opticalExterior: f.enclosure!.depth,
    };
  validateBox(s);
  validateEnclosure(f.enclosure!);
  if (s.thickness < 1.2)
    throw new Error(
      "Usá al menos 1,2 mm de espesor para separar luz y electrónica.",
    );
  const width = s.width * 10 + (f.joints ? s.thickness : 0),
    height = s.height * 10 + (f.joints ? s.thickness : 0);
  const depth = f.enclosure!.depth,
    c = f.clearance;
  if (!Number.isFinite(c) || c < 0.1 || c > 0.8)
    throw new Error("Revisá la holgura del compartimento electrónico.");
  const m = f.modular ?? defaultModular;
  const wire = isModular(f) ? m.cableDiameter : 4;
  if (depth < wire + 6 + c)
    throw new Error(
      "La caja electrónica necesita más profundidad para que el reborde de la tapa no pince el cable de entrada.",
    );
  if (isModular(f) && m.power === "aaa") {
    if (m.holderHeight + 2 + 3 + c > depth)
      throw new Error(
        "El portapilas no entra en el compartimento electrónico: aumentá su profundidad o revisá la altura del portapilas.",
      );
    if (m.holderLength + c + 8 > width || m.holderWidth + c + 8 > height)
      throw new Error(
        "El portapilas invade los bordes del compartimento electrónico.",
      );
    if (m.holderWidth + c + 7 > height / 2 - m.cableDiameter / 2)
      throw new Error(
        "El portapilas tapa el paso central de cables. Aumentá el alto de la caja o revisá el ancho del portapilas.",
      );
  }
  return {
    width,
    height,
    depth,
    wall: 2,
    cover: 2,
    skirt: 3,
    clearance: c,
    opticalExterior: s.depth * 10 + s.thickness / 2,
    outerFace: s.depth * 10 + s.thickness / 2 + depth + 2,
  };
}

/** A shared cable location on BOTH separating plates, clear of COB recesses. */
export function cablePassage(s: BoxSettings, f: Fabrication) {
  const size = isModular(f) ? (f.modular ?? defaultModular).cableDiameter : 4;
  if (isModular(f)) return { x: 0, y: 0, size };
  const l = cobLayout(s, f),
    half = size / 2;
  const xLimit = l.usableWidth / 2 - half - 1.2,
    yLimit = l.usableHeight / 2 - half - 1.2;
  const candidates: Array<[number, number]> = [];
  for (const fy of [1, -1, 0, 0.5, -0.5])
    for (const fx of [0, 1, -1, 0.5, -0.5])
      candidates.push([fx * xLimit, fy * yLimit]);
  for (const [x, y] of candidates)
    if (
      xLimit >= 0 &&
      yLimit >= 0 &&
      l.footprints.every(({ pocket, marker }) =>
        [pocket, marker].every(
          (r) =>
            Math.abs(x - r.x) > half + r.width / 2 + 1.2 ||
            Math.abs(y - r.y) > half + r.height / 2 + 1.2,
        ),
      )
    )
      return { x, y, size };
  throw new Error(
    "No queda espacio para el paso de cables COB. Mové o reducí los tramos.",
  );
}

export function enclosureParts(s: BoxSettings, f: Fabrication) {
  const l = enclosureLayout(s, f),
    p = cablePassage(s, f),
    w = l.width,
    h = l.height,
    d = l.depth;
  const px = w / 2 + p.x,
    py = h / 2 + p.y,
    a = p.size / 2;
  const boxes: Bounds[] = [
    [0, w, 0, h, 0, 2],
    [0, 2, 0, h, 2, d],
    [w - 2, w, 0, h, 2, d],
    [2, w - 2, 0, 2, 2, d],
    [2, w - 2, h - 2, h, 2, d],
  ];
  const cuts: Bounds[] = [[px - a, px + a, py - a, py + a, 0, 2]];
  // Ingress on the bottom edge of the ELECTRONICS box, away from cutout walls.
  cuts.push([w / 2 - a, w / 2 + a, 0, 2, 3, 3 + p.size]);
  if (isModular(f) && (f.modular ?? defaultModular).power === "aaa") {
    const m = f.modular ?? defaultModular;
    const bw = m.holderLength + f.clearance,
      bh = m.holderWidth + f.clearance;
    const x = (w - bw) / 2,
      y = 4;
    // Low positioning rails; do not enclose the contacts or assume a bare-cell holder.
    boxes.push(
      [x - 1.5, x, y, y + bh + 1.5, 2, 6],
      [x + bw, x + bw + 1.5, y, y + bh + 1.5, 2, 6],
      [x, x + bw, y + bh, y + bh + 1.5, 2, 6],
    );
  }
  const body = solidMesh(boxes, cuts);
  const inset = 2 + f.clearance / 2;
  const face = solidMesh(
    [
      [0, w, 0, h, 0, 2],
      [inset, w - inset, inset, h - inset, 2, 5],
    ],
    [[inset + 1.5, w - inset - 1.5, inset + 1.5, h - inset - 1.5, 2, 5]],
  );
  const n = isModular(f) ? 8 : 6;
  return [
    {
      ...body,
      id: "electronics" as const,
      filename: `0${n}-caja-electronica`,
      label: "Caja electrónica separada de la luz",
      width: w,
    },
    {
      ...face,
      id: "face" as const,
      filename: `0${n + 1}-tapa-exterior`,
      label: "Tapa exterior hacia la persona",
      width: w,
    },
  ];
}

export function enclosurePoint(
  id: EnclosurePartId,
  x: number,
  y: number,
  z: number,
  s: BoxSettings,
  f: Fabrication,
): [number, number, number] {
  const l = enclosureLayout(s, f);
  return [
    (x - l.width / 2) / 10,
    (y - l.height / 2) / 10,
    id === "electronics"
      ? s.thickness / 20 + z / 10
      : s.thickness / 20 + (l.depth + 2 - z) / 10,
  ];
}

export function enclosureGuide(s: BoxSettings, f: Fabrication) {
  if (isWallMount(f)) return wallMountGuide(s, f);
  const l = enclosureLayout(s, f),
    p = cablePassage(s, f);
  return [
    "FRENTE HACIA LA PERSONA · SOMBRA SOBRE LA PARED DETRÁS",
    "Orden desde la pared hacia la persona: cámara con recortes y luz → placa portaluces 05 → caja electrónica → tapa exterior opaca.",
    `La cámara óptica conserva ${s.depth * 10} mm de profundidad; el conjunto exterior alcanza ${l.outerFace.toFixed(2)} mm desde la pared. La caja electrónica agrega ${l.depth} mm y la tapa exterior 2 mm.`,
    `Pasá los cables entre las dos placas por los huecos alineados: X=${p.x.toFixed(2)} mm / Y=${p.y.toFixed(2)} mm, sección ${p.size} × ${p.size} mm. Reservá longitud para abrir y desconectar; no pinces cables en el perímetro.`,
    "La caja electrónica se imprime con su fondo sobre la cama; la tapa exterior con la cara lisa sobre la cama y el reborde hacia arriba.",
    "Presentá el fondo de la caja electrónica contra la cara exterior de la placa portaluces y fijá el perímetro tras comprobar los cables. Son dos piezas independientes, sin mecanismo de bloqueo integrado.",
    "La tapa exterior entra con reborde de guiado y holgura, sin pestillo: probá el ajuste y usá una fijación removible si es necesario. Retirala para acceder a pilas y conexiones.",
    "La luz mira hacia la pared por dentro de la cámara. La persona ve la tapa exterior cerrada, con la sombra alrededor. Ver interior es una ayuda de montaje del visor, no una tapa transparente para imprimir.",
  ];
}
