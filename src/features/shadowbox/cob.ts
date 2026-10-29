import { isWallMount } from "./enclosure-config";
import { validateBox, type BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";

export type CobSegment = {
  x: number;
  y: number;
  length: number;
  rotation: 0 | 90;
};
export type CobSettings = {
  width: number;
  cutInterval: number;
  thickness: number;
  clearance: number;
  recessDepth: number;
  mode: "auto" | "manual";
  segments: CobSegment[];
};

/** Center the emitting footprint, retaining relative positions and cut lengths. */
export function centerCobSegments(
  segments: CobSegment[],
  width: number,
): CobSegment[] {
  if (!segments.length) return [];
  const bounds = segments.map((p) => ({
    x: p.x,
    y: p.y,
    halfWidth: (p.rotation === 0 ? p.length : width) / 2,
    halfHeight: (p.rotation === 0 ? width : p.length) / 2,
  }));
  const x =
    (Math.min(...bounds.map((p) => p.x - p.halfWidth)) +
      Math.max(...bounds.map((p) => p.x + p.halfWidth))) /
    2;
  const y =
    (Math.min(...bounds.map((p) => p.y - p.halfHeight)) +
      Math.max(...bounds.map((p) => p.y + p.halfHeight))) /
    2;
  return segments.map((p) => ({
    ...p,
    x: +(p.x - x).toFixed(8),
    y: +(p.y - y).toFixed(8),
  }));
}
export const defaultCob: CobSettings = {
  width: 8,
  cutInterval: 30,
  thickness: 1,
  clearance: 0.3,
  recessDepth: 0.4,
  mode: "auto",
  segments: [],
};
/** Front decoration is an open ring. COB beds stay entirely on its perimeter. */
export function wallFrameBand(f: Fabrication, margin = 3, thickness = 2) {
  const c = f.cob ?? defaultCob;
  return f.illumination === "cob"
    ? Math.max(
        6,
        c.width +
          c.clearance +
          Math.max(2, margin) +
          thickness +
          4 +
          (f.joints ? f.clearance / 2 : 0),
      )
    : Math.max(8, thickness + 6);
}
export const COB_OPTICAL_WARNING =
  "La simulación usa una fuente puntual central: no valida ópticamente una tira COB. Una fuente extendida puede producir penumbra y sombras múltiples. Probá físicamente la disposición antes de pegarla definitivamente.";
export const COB_WIRING =
  "Alimentación de 5 V. Conectá los tramos en paralelo: + con + y − con −; colocá el interruptor en el positivo. Identificá los contactos según las marcas de tu tira real: la marca A del alojamiento solo indica orientación, no polaridad. El consumo y la autonomía quedan pendientes de medir: la tira no declara W/m.";
export const isCob = (f?: Fabrication) => f?.illumination === "cob";
export function validateCob(c: CobSettings) {
  if (
    !c ||
    ![c.width, c.cutInterval, c.thickness, c.clearance, c.recessDepth].every(
      Number.isFinite,
    ) ||
    c.width < 2 ||
    c.width > 30 ||
    c.cutInterval < 5 ||
    c.cutInterval > 300 ||
    c.thickness < 0.2 ||
    c.thickness > 10 ||
    c.clearance < 0.1 ||
    c.clearance > 2 ||
    c.recessDepth < 0.1 ||
    c.recessDepth > 3 ||
    !["auto", "manual"].includes(c.mode) ||
    !Array.isArray(c.segments) ||
    c.segments.length > 24
  )
    throw new Error("Revisá las medidas y la distribución de la tira COB.");
  for (const p of c.segments) {
    if (
      !p ||
      ![p.x, p.y, p.length].every(Number.isFinite) ||
      ![0, 90].includes(p.rotation) ||
      p.length <= 0 ||
      (c.mode === "manual" &&
        Math.abs(
          p.length / c.cutInterval - Math.round(p.length / c.cutInterval),
        ) > 1e-7)
    )
      throw new Error(
        `Cada tramo COB debe medir un múltiplo entero de ${c.cutInterval} mm y tener posición y orientación válidas.`,
      );
  }
}
export type CobRect = { x: number; y: number; width: number; height: number };
export function cobFootprint(p: CobSegment, c: CobSettings, onFrame = false) {
  // Three free millimeters at EACH contact end for soldering and wire access.
  const along = p.length + c.clearance + 6,
    across = c.width + c.clearance;
  const pocket = {
    x: p.x,
    y: p.y,
    width: p.rotation === 0 ? along : across,
    height: p.rotation === 0 ? across : along,
  };
  // A small engraved dash at end A, outside the adhesive bed. No polarity.
  const a = -p.length / 2 + 1;
  const side =
    (across / 2 + 1.4) *
    (onFrame && (p.rotation === 0 ? p.y : p.x) < 0 ? -1 : 1);
  const marker = {
    x: p.x + (p.rotation === 0 ? a : side),
    y: p.y + (p.rotation === 0 ? side : a),
    width: p.rotation === 0 ? 2 : 0.8,
    height: p.rotation === 0 ? 0.8 : 2,
  };
  return { pocket, marker };
}
const overlaps = (a: CobRect, b: CobRect, gap = 0) =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap - 1e-7 &&
  Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap - 1e-7;
export function cobLayout(s: BoxSettings, f: Fabrication) {
  validateBox(s);
  const c = f.cob ?? defaultCob;
  validateCob(c);
  if (
    typeof f.joints !== "boolean" ||
    !Number.isFinite(f.clearance) ||
    f.clearance < 0.1 ||
    f.clearance > 0.8
  )
    throw new Error("Revisá los encastres y su holgura.");
  if (f.joints && s.thickness < 1.2)
    throw new Error("Usá al menos 1,2 mm de espesor para los encastres.");
  if (s.thickness - c.recessDepth < 1.2 - 1e-7)
    throw new Error(
      "El alojamiento COB debe dejar al menos 1,2 mm de tapa: reducí su profundidad o aumentá el espesor de pared.",
    );
  if (c.recessDepth > c.thickness + 1e-7)
    throw new Error(
      "El alojamiento es más profundo que la tira COB: reducí la profundidad para dejar la superficie y los contactos accesibles.",
    );
  const margin = Math.max(2, s.margin);
  // Inner wall planes, plus joint-slot clearance and a material margin.
  const usableWidth =
    s.width * 10 - s.thickness - (f.joints ? f.clearance : 0) - 2 * margin;
  const usableHeight =
    s.height * 10 - s.thickness - (f.joints ? f.clearance : 0) - 2 * margin;
  let segments = c.segments;
  if (c.mode === "auto") {
    segments = [];
    const rotations: (0 | 90)[] =
      usableWidth >= usableHeight ? [0, 90] : [90, 0];
    for (const rotation of rotations) {
      const along = rotation === 0 ? usableWidth : usableHeight;
      const across = rotation === 0 ? usableHeight : usableWidth;
      // A bounded central emitter, rather than filling the entire lid.
      const compactLength = Math.min(
        along,
        Math.max(40, c.cutInterval + c.clearance + 6),
      );
      const length =
        Math.floor((compactLength - c.clearance - 6 + 1e-7) / c.cutInterval) *
        c.cutInterval;
      const pitch = isWallMount(f)
        ? (rotation === 0 ? s.height : s.width) * 10 +
          (f.joints ? s.thickness : 0) -
          2 * wallFrameBand(f, s.margin, s.thickness) +
          c.width +
          c.clearance +
          2.8
        : c.width + c.clearance + 4;
      const count = isWallMount(f)
        ? 2
        : Math.min(
            4,
            Math.floor(
              (Math.min(across, Math.max(26, c.width + c.clearance + 3.6)) +
                4 -
                3.6) /
                pitch,
            ),
          );
      if (
        length < c.cutInterval ||
        count < 1 ||
        pitch < c.width + c.clearance + 4
      )
        continue;
      segments = Array.from({ length: count }, (_, i) => {
        const cross = (i - (count - 1) / 2) * pitch;
        return {
          x: rotation === 0 ? 0 : cross,
          y: rotation === 0 ? cross : 0,
          length,
          rotation,
        };
      });
      break;
    }
  }
  if (!segments.length)
    throw new Error(
      `No entra ningún tramo COB de ${c.cutInterval} mm con espacio para contactos, marcas, bordes y encastres. Espacio útil: ${usableWidth.toFixed(2)} × ${usableHeight.toFixed(2)} mm.`,
    );
  const footprints = segments.map((p) => cobFootprint(p, c, isWallMount(f)));
  for (const [i, footprint] of footprints.entries()) {
    for (const rect of [footprint.pocket, footprint.marker]) {
      if (
        Math.abs(rect.x) + rect.width / 2 > usableWidth / 2 + 1e-7 ||
        Math.abs(rect.y) + rect.height / 2 > usableHeight / 2 + 1e-7
      )
        throw new Error(
          `El tramo COB ${i + 1} o su marca invade el borde, el margen o los encastres.`,
        );
      if (
        isWallMount(f) &&
        overlaps(
          rect,
          {
            x: 0,
            y: 0,
            width:
              s.width * 10 +
              (f.joints ? s.thickness : 0) -
              2 * wallFrameBand(f, s.margin, s.thickness),
            height:
              s.height * 10 +
              (f.joints ? s.thickness : 0) -
              2 * wallFrameBand(f, s.margin, s.thickness),
          },
          1.2,
        )
      )
        throw new Error(
          "El tramo COB invade la abertura frontal. Colocalo sobre el marco, dejando 1,2 mm de material junto al hueco.",
        );
      for (const other of footprints.slice(i + 1))
        if ([other.pocket, other.marker].some((r) => overlaps(rect, r, 0.8)))
          throw new Error(
            `Los alojamientos COB ${i + 1} y otro tramo se superponen o no dejan 0,8 mm de separación.`,
          );
    }
  }
  const offset = isWallMount(f)
    ? f.enclosure!.depth -
      (s.panelExtension ?? 0) * 10 +
      (s.frontTrim ?? 0) * 10
    : (s.wallOffset ?? 0) * 10;
  const emitterZ =
    offset + s.depth * 10 - s.thickness / 2 + c.recessDepth - c.thickness;
  const opticalZ = isWallMount(f)
    ? emitterZ
    : (s.depth * 10 * s.lightPercent) / 100;
  if (emitterZ <= 0)
    throw new Error(
      "La tira COB sale de la caja: revisá el espesor de la tira y la profundidad de caja.",
    );
  return {
    segments,
    footprints,
    usableWidth,
    usableHeight,
    totalLength: segments.reduce((sum, p) => sum + p.length, 0),
    residual: s.thickness - c.recessDepth,
    opticalZ,
    emitterZ,
    floor: s.thickness - c.recessDepth,
  };
}
export function cobGuide(s: BoxSettings, f: Fabrication): string[] {
  const layout = cobLayout(s, f),
    c = f.cob ?? defaultCob;
  return [
    "TIRA LED COB BLANCA · 5 V",
    `Espacio útil de tapa: ${layout.usableWidth.toFixed(2)} × ${layout.usableHeight.toFixed(2)} mm. Residual: ${layout.residual.toFixed(2)} mm.`,
    `Ancho ${c.width} mm; espesor provisional ${c.thickness} mm (medir la tira real); alojamiento ${c.recessDepth} mm; holgura total ${c.clearance} mm.`,
    `Lista de cortes (solo en marcas reales, cada ${c.cutInterval} mm). Total: ${layout.totalLength} mm.`,
    ...layout.segments.map(
      (p, i) =>
        `Tramo ${i + 1}: ${p.length} mm, centro X=${p.x.toFixed(2)} / Y=${p.y.toFixed(2)} mm, ${p.rotation}°. A en el extremo ${p.rotation === 0 ? "X−" : "Y−"}.`,
    ),
    "Coordenadas de la vista frontal de la caja: X hacia la derecha, Y hacia arriba; al mirar la cara interior, X se ve invertido. A es el extremo junto a la pequeña raya grabada, sin polaridad asignada.",
    isWallMount(f)
      ? "El marco frontal está abierto. Los rebajes COB quedan sobre su perímetro, por detrás, con la luz hacia la pared. El relieve opcional pertenece a la tapa trasera de electrónica. Cada rebaje deja 3 mm para contactos y cables; no cubras la superficie luminosa."
      : "Imprimí la tapa con la cara exterior en la cama y los rebajes hacia arriba. Presentá los tramos antes de pegar. Cada rebaje deja 3 mm libres en ambos extremos para los contactos y cables. No cubras la superficie luminosa.",
    f.joints
      ? "Presentá las lengüetas en las ranuras de la tapa y alterná los dientes entre paredes. Probá la holgura antes de fijar. Los rebajes evitan esta zona de encastre."
      : "Encastres desactivados: presentá los bordes planos de las paredes antes de fijarlos.",
    COB_WIRING,
    COB_OPTICAL_WARNING,
    `Fuente puntual configurada: ${layout.opticalZ.toFixed(2)} mm de la pared; superficie COB estimada: ${layout.emitterZ.toFixed(2)} mm. La silueta, su escala y el radio de proyección se conservan.`,
  ];
}
