import { validateBox, sourceDistance, type BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import {
  defaultModular,
  isModular,
  WALL_POST_DIAMETER,
} from "./modular-config";
import {
  validateEnclosure,
  wallPanelStart,
  WALL_BASE_RIM,
} from "./enclosure-config";
import { projectionSettings } from "./projection-settings";
import { wallRearMesh } from "./wall-rear";
import { wallFrameBand } from "./cob";
import { roundOpening, roundOpeningAxes } from "./round-opening";
import { minimumWallEmitter, wallLightRange } from "./light-position";
import { HEAD_INSERTION, POST_TO_EMITTER, postHeadMesh } from "./head-mount";
import { solidMesh, type Bounds, type Mesh } from "./solid-mesh";
import { MARK_DEPTH, modelMark } from "@/lib/model-mark";
import {
  wallSeatTabs,
  wallSeatFit,
  WALL_BASE_FLOOR,
  BATTERY_DOOR_PLATE,
  BATTERY_DOOR_TOP,
} from "./wall-seat";
import {
  cornerSamples,
  roundCorners,
  keyholeSamples,
  roundKeyhole,
  chamferSocket,
  REAR_CORNER_RADIUS,
  LID_CORNER_RADIUS,
  SOCKET_CHAMFER,
} from "./rear-finish";

export type WallPartId =
  "base" | "separator" | "post" | "head" | "battery-cover";

// Curved base geometry does not depend on the artwork or source position.
// Reuse a small bounded set while drawing, previewing and exporting the same fixture.
const baseMeshes = new Map<string, Mesh>();
export function wallMountLayout(raw: BoxSettings, f: Fabrication) {
  const s = projectionSettings(raw, f);
  validateBox(s);
  validateEnclosure(f.enclosure!);
  const e = f.enclosure!,
    m = f.modular ?? defaultModular,
    c = f.clearance,
    t = s.thickness;
  if (!Number.isFinite(c) || c < 0.1 || c > 0.8 || t < 1.2)
    throw new Error("Revisá el espesor y la holgura del montaje de pared.");
  const width = s.width * 10 + (f.joints ? t : 0),
    height = s.height * 10 + (f.joints ? t : 0);
  const depth = e.depth,
    panelStart = wallPanelStart(f),
    wall = 2,
    floor = WALL_BASE_FLOOR,
    // One collar: the shadow walls sleeve around its external guide ribs.
    enclosureInset = wallSeatFit(t, c, f.joints).inset,
    wire = isModular(f) ? m.cableDiameter : 4;
  if (
    !isModular(f) &&
    wallFrameBand(f, s.margin, t) * 2 > Math.min(width, height) - 12
  )
    throw new Error(
      "El marco necesita más espacio para conservar el frente abierto: aumentá el cuadro o reducí el ancho de la tira COB.",
    );
  const entry = e.hangerEntry ?? 8,
    neck = e.hangerNeck ?? 4;
  const hookY = height - 24,
    hookBottom = hookY - 8,
    hookTop = hookY + 14;
  const socket = (isModular(f) ? WALL_POST_DIAMETER : 10) + c,
    socketOuter = socket + 4;
  const separatorWidth = width - 2 * (enclosureInset + wall) - c,
    separatorHeight = height - 2 * (enclosureInset + wall) - c;
  const source = sourceDistance(s) * 10;
  const postLength = source - POST_TO_EMITTER - floor;
  // Keep the board and emitting plane unchanged when replacing the frame bridge.
  const headZ = source + m.emitterHeight;
  const headOrigin = source - POST_TO_EMITTER - HEAD_INSERTION;
  const headSeat = m.starThickness;
  const headWidth = m.starDiameter + c + 4;
  const headCenterY = headWidth / 2;
  // Aim the two arms at opposite corners, away from the middle of each panel.
  const headAngle = Math.atan2(height, width);
  const batteryWidth = m.holderLength + c + 4,
    batteryHeight = m.holderWidth + c + 4;
  // The separator skirt reaches 4.9 mm inward from its edge (wall-rear.ts).
  // Keep the purchased holder and its walls clear of that skirt on every side.
  const batteryMargin = enclosureInset + wall + c / 2 + 4.9 + 1;
  const batteryX = (width - batteryWidth) / 2,
    batteryY = Math.max(10, batteryMargin);
  const batteryTop = depth - 2,
    coverTop = BATTERY_DOOR_TOP;
  if (
    separatorWidth < 25 ||
    separatorHeight < 25 ||
    hookBottom < height / 2 + socketOuter / 2 + 3
  )
    throw new Error(
      "La base no deja espacio entre el tubo y el anclaje. Aumentá el alto del cuadro.",
    );
  if (depth < Math.max(12, wire + 10))
    throw new Error(
      "La base necesita más profundidad para el cableado y la tapa electrónica.",
    );
  if (isModular(f) && m.power === "aaa") {
    if (
      batteryX < batteryMargin ||
      batteryY + batteryHeight + 3 > height / 2 - socketOuter / 2
    )
      throw new Error(
        "El portapilas invade el tubo o el borde de la base. Aumentá el ancho/alto del cuadro o revisá el portapilas.",
      );
    if (coverTop + m.holderHeight + c > batteryTop)
      throw new Error(
        "El portapilas y su tapita no entran debajo de la tapa electrónica: aumentá la profundidad de la base.",
      );
  }
  if (isModular(f)) {
    const editorDepth = s.depth - (s.panelExtension ?? 0) + (s.frontTrim ?? 0);
    const min = minimumWallEmitter(f),
      max = editorDepth * 10 - t / 2 - m.emitterHeight - m.starThickness - 3;
    const limits = wallLightRange(s, f);
    if (limits.min > limits.max)
      throw new Error(
        "La profundidad máxima no deja espacio para el cabezal. Aumentá la profundidad óptica.",
      );
    const rel = source - depth;
    if (rel < min - 1e-6 || rel > max + 1e-6)
      throw new Error(
        `No hay espacio para el LED y el tubo: usá una posición de luz entre ${limits.min}% y ${limits.max}%, o aumentá la profundidad óptica.`,
      );
    if (headWidth + 8 > Math.min(s.width * 10 - t, s.height * 10 - t))
      throw new Error("El cabezal no entra entre los paneles de sombra.");
  }
  return {
    s,
    width,
    height,
    depth,
    wall,
    floor,
    panelStart,
    panelDepth: s.depth * 10,
    frontTrim: (s.frontTrim ?? 0) * 10,
    enclosureInset,
    wire,
    entry,
    neck,
    hookY,
    hookBottom,
    hookTop,
    socket,
    socketOuter,
    separatorWidth,
    separatorHeight,
    source,
    postLength,
    headZ,
    headOrigin,
    headSeat,
    headWidth,
    headCenterY,
    headAngle,
    batteryWidth,
    batteryHeight,
    batteryX,
    batteryY,
    batteryTop,
    coverTop,
    outerFace:
      panelStart +
      s.depth * 10 +
      (isModular(f) ? (f.joints ? -t / 2 - c / 2 : 0) : t / 2 + 1),
  };
}

export const wallPartCount = (f: Fabrication) =>
  isModular(f) ? ((f.modular ?? defaultModular).power === "aaa" ? 9 : 8) : 7;
export function wallPartInfo(f: Fabrication) {
  return [
    {
      id: "base" as const,
      filename: isModular(f) ? "05-base-pared" : "06-base-pared",
      label: "Base de pared con anclaje y electrónica",
    },
    {
      id: "separator" as const,
      filename: isModular(f) ? "06-tapa-electronica" : "07-tapa-electronica",
      label: "Separador de electrónica con paso central",
    },
    ...(isModular(f)
      ? [
          {
            id: "post" as const,
            filename: "07-tubo-hueco",
            label: "Poste hueco con encastre para el cabezal",
          },
          {
            id: "head" as const,
            filename: "08-cabezal-led",
            label: "Cabezal circular encastrado al poste",
          },
          ...((f.modular ?? defaultModular).power === "aaa"
            ? [
                {
                  id: "battery-cover" as const,
                  filename: "09-tapa-pilas",
                  label: "Tapa de pilas accesible desde la cara posterior",
                },
              ]
            : []),
        ]
      : []),
  ];
}

function tube(length: number, wire: number): Mesh {
  const radius = WALL_POST_DIAMETER / 2;
  const p: number[] = [],
    idx: number[] = [],
    n = 64;
  const ring = (r: number, z: number) =>
    Array.from({ length: n }, (_, i) => [
      radius + r * Math.cos((i * 2 * Math.PI) / n),
      radius + r * Math.sin((i * 2 * Math.PI) / n),
      z,
    ]);
  const outer0 = ring(radius, 0),
    outer1 = ring(radius, length),
    inner0 = ring(wire / 2, 0),
    inner1 = ring(wire / 2, length);
  function quad(a: number[], b: number[], c: number[], d: number[]) {
    const start = p.length / 3;
    p.push(...a, ...b, ...c, ...d);
    idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    quad(outer0[i], outer0[j], outer1[j], outer1[i]);
    quad(inner0[j], inner0[i], inner1[i], inner1[j]);
    quad(outer1[i], outer1[j], inner1[j], inner1[i]);
    quad(outer0[j], outer0[i], inner0[i], inner0[j]);
  }
  return { positions: new Float32Array(p), indices: new Uint32Array(idx) };
}

export function wallMountParts(
  s: BoxSettings,
  f: Fabrication,
  artwork?: Uint8ClampedArray,
) {
  const l = wallMountLayout(s, f),
    m = f.modular ?? defaultModular,
    w = l.width,
    h = l.height,
    d = l.depth;
  const c = f.clearance,
    inset = l.enclosureInset,
    rim = WALL_BASE_RIM;
  const fit = wallSeatFit(s.thickness, c, f.joints);
  const baseKey = JSON.stringify([
    w,
    h,
    d,
    c,
    inset,
    rim,
    s.thickness,
    f.joints,
    l.panelStart,
    l.entry,
    l.neck,
    l.socket,
    l.socketOuter,
    l.wire,
    isModular(f),
    m.power,
    m.holderLength,
    m.holderWidth,
    m.holderHeight,
  ]);
  let base = baseMeshes.get(baseKey);
  if (!base) {
    const boxes: Bounds[] = [
      [0, w, 0, h, 0, 2],
      // Single enclosure perimeter; the floor outside it is the panel shoulder.
      [inset, inset + 2, inset, h - inset, 2, d],
      [w - inset - 2, w - inset, inset, h - inset, 2, d],
      [inset + 2, w - inset - 2, inset, inset + 2, 2, d],
      [inset + 2, w - inset - 2, h - inset - 2, h - inset, 2, d],
      // Raised load-bearing pad around the keyhole. It stays away from batteries and tube.
      [
        w / 2 - l.entry / 2 - 5,
        w / 2 + l.entry / 2 + 5,
        l.hookBottom - 4,
        l.hookTop + 2,
        2,
        6,
      ],
      // Ledge supporting the independent electronics cover.
      [inset + 2, inset + 5, inset + 2, h - inset - 2, d - 3.2, d - 2],
      [w - inset - 5, w - inset - 2, inset + 2, h - inset - 2, d - 3.2, d - 2],
      [inset + 5, w - inset - 5, inset + 2, inset + 5, d - 3.2, d - 2],
      [inset + 5, w - inset - 5, h - inset - 5, h - inset - 2, d - 3.2, d - 2],
    ];
    const cuts: Bounds[] = [
      [w / 2 - l.entry / 2, w / 2 + l.entry / 2, l.hookBottom, l.hookY, 0, 6],
      [w / 2 - l.neck / 2, w / 2 + l.neck / 2, l.hookY - 1, l.hookTop, 0, 6],
      [w / 2 - l.wire / 2, w / 2 + l.wire / 2, 0, inset + 2, 0, rim],
    ];
    if (f.joints) {
      // Narrow ribs on the OUTSIDE of the collar, matching inner wall grooves.
      const extra = s.thickness / 2;
      for (const horizontal of [true, false]) {
        const span = (horizontal ? s.width : s.height) * 10;
        for (const [a, b] of wallSeatTabs(span))
          for (const far of [false, true]) {
            const along = [a + extra, b + extra];
            const edge = horizontal ? h : w;
            const across = far
              ? [edge - inset - l.wall, edge - s.thickness + fit.engagement]
              : [s.thickness - fit.engagement, inset + l.wall];
            boxes.push(
              horizontal
                ? [along[0], along[1], across[0], across[1], l.floor, d - 0.6]
                : [across[0], across[1], along[0], along[1], l.floor, d - 0.6],
            );
          }
      }
    }
    if (isModular(f)) {
      const o = l.socketOuter / 2,
        i = l.socket / 2;
      // Allow for the local radial mapping so the cable slot keeps its clear width.
      const halfWire = (l.wire + c) / 2;
      const slot = (halfWire * i) / Math.sqrt(i * i - halfWire * halfWire);
      boxes.push([w / 2 - o, w / 2 + o, h / 2 - o, h / 2 + o, 2, 8]);
      cuts.push(
        [w / 2 - i, w / 2 + i, h / 2 - i, h / 2 + i, 2, 8],
        [w / 2 - slot, w / 2 + slot, h / 2 - o, h / 2 - i, 2, 6],
      );
      if (m.power === "aaa") {
        const {
          batteryX: x,
          batteryY: y,
          batteryWidth: bw,
          batteryHeight: bh,
          batteryTop: z,
        } = l;
        boxes.push(
          [x, x + 2, y, y + bh, 2, z],
          [x + bw - 2, x + bw, y, y + bh, 2, z],
          [x + 2, x + bw - 2, y, y + 2, 2, z],
          [x + 2, x + bw - 2, y + bh - 2, y + bh, 2, z],
        );
        cuts.push([
          w / 2 - l.wire / 2,
          w / 2 + l.wire / 2,
          y + bh - 2,
          y + bh,
          2,
          6,
        ]);
        // Rear access: full holder opening and a shallow rebate for a flush door.
        cuts.push(
          [x + 2, x + bw - 2, y + 2, y + bh - 2, 0, l.floor],
          [x, x + bw, y, y + bh, 0, BATTERY_DOOR_PLATE],
          [w / 2 - 4, w / 2 + 4, y - 1.2, y, 0, 0.8],
        );
      }
    }
    const radius = l.socketOuter / 2;
    const tubeAxes = isModular(f)
      ? roundOpeningAxes(w / 2, h / 2, [
          l.socket / 2,
          radius,
          radius + 1,
          radius + 2,
        ])
      : { xs: [], ys: [] };
    const pad = [
      w / 2 - l.entry / 2 - 5,
      w / 2 + l.entry / 2 + 5,
      l.hookBottom - 4,
      l.hookTop + 2,
    ] as const;
    const curves = [
      tubeAxes,
      cornerSamples(0, w, 0, h, REAR_CORNER_RADIUS),
      cornerSamples(inset, w - inset, inset, h - inset, REAR_CORNER_RADIUS),
      cornerSamples(...pad, REAR_CORNER_RADIUS),
      keyholeSamples(
        w / 2,
        l.hookY - 4,
        l.entry,
        l.neck,
        l.hookTop - l.hookY + 4,
      ),
      ...(isModular(f) && m.power === "aaa"
        ? [
            cornerSamples(
              l.batteryX,
              l.batteryX + l.batteryWidth,
              l.batteryY,
              l.batteryY + l.batteryHeight,
              LID_CORNER_RADIUS,
            ),
          ]
        : []),
    ];
    const extraAxes = {
      xs: curves.flatMap((a) => a.xs),
      ys: curves.flatMap((a) => a.ys),
      zs: isModular(f) ? [8 - SOCKET_CHAMFER] : [],
      minimumGap: 0.12,
    };
    const markBottom = h / 2 + l.socketOuter / 2 + 0.5;
    const markTop = l.hookBottom - 0.5;
    cuts.push(
      ...modelMark(
        w / 2,
        (markBottom + markTop) / 2,
        w - 16,
        Math.max(1, markTop - markBottom),
      ).cuts(0, MARK_DEPTH),
    );
    const rawBase = solidMesh(boxes, cuts, undefined, 0, extraAxes);
    base = isModular(f) ? roundOpening(rawBase, w / 2, h / 2, radius) : rawBase;
    if (isModular(f))
      base = chamferSocket(base, w / 2, h / 2, l.socket / 2, radius, 8);
    base = roundKeyhole(
      base,
      w / 2,
      l.hookY - 4,
      l.entry,
      l.neck,
      l.hookTop - l.hookY + 4,
    );
    base = roundCorners(base, 0, w, 0, h, REAR_CORNER_RADIUS);
    base = roundCorners(
      base,
      inset,
      w - inset,
      inset,
      h - inset,
      REAR_CORNER_RADIUS,
    );
    base = roundCorners(base, ...pad, REAR_CORNER_RADIUS, true);
    // Keep the battery rebate rectangular so the rear door and holder fit exactly.
    baseMeshes.set(baseKey, base);
    if (baseMeshes.size > 8) baseMeshes.delete(baseMeshes.keys().next().value!);
  }
  const sw = l.separatorWidth,
    sh = l.separatorHeight;
  const separator = wallRearMesh(
    sw,
    sh,
    (isModular(f) ? WALL_POST_DIAMETER : 4) + c,
    f.enclosure?.front === "design",
    f.enclosure?.relief ?? 0.6,
    artwork,
  );
  const meshes: Array<{ id: WallPartId; width: number } & Mesh> = [
    { ...base, id: "base", width: w },
    { ...separator, id: "separator", width: sw },
  ];
  if (isModular(f)) {
    meshes.push({
      ...tube(l.postLength, l.wire),
      id: "post",
      width: WALL_POST_DIAMETER,
    });
    const head = postHeadMesh(
      m.starDiameter,
      m.starThickness,
      m.emitterHeight,
      l.wire,
      c,
      l.headAngle,
    );
    meshes.push({ ...head, id: "head", width: l.headWidth });
    if (m.power === "aaa") {
      const bw = l.batteryWidth - c,
        bh = l.batteryHeight - c,
        skirt = 2 + c / 2;
      const cap = solidMesh(
        [
          [0, bw, 0, bh, 0, BATTERY_DOOR_PLATE],
          [
            skirt,
            bw - skirt,
            skirt,
            bh - skirt,
            BATTERY_DOOR_PLATE,
            BATTERY_DOOR_TOP,
          ],
        ],
        [
          [
            skirt + 1,
            bw - skirt - 1,
            skirt + 1,
            bh - skirt - 1,
            BATTERY_DOOR_PLATE,
            BATTERY_DOOR_TOP,
          ],
        ],
      );
      meshes.push({ ...cap, id: "battery-cover", width: bw });
    }
  }
  return meshes.map((mesh) => ({
    ...mesh,
    ...wallPartInfo(f).find((p) => p.id === mesh.id)!,
  }));
}

/** Assembly-relative cm: the hollow post and its removable head are wall-based. */
export function wallMountPoint(
  id: WallPartId,
  x: number,
  y: number,
  z: number,
  s: BoxSettings,
  f: Fabrication,
  layout?: ReturnType<typeof wallMountLayout>,
): [number, number, number] {
  const l = layout ?? wallMountLayout(s, f);
  switch (id) {
    case "base":
      return [(x - l.width / 2) / 10, (y - l.height / 2) / 10, z / 10];
    case "separator":
      return [
        (l.separatorWidth / 2 - x) / 10,
        (y - l.separatorHeight / 2) / 10,
        (l.depth +
          (f.enclosure?.front === "design" ? (f.enclosure.relief ?? 0.6) : 0) -
          z) /
          10,
      ];
    case "post":
      return [
        (x - WALL_POST_DIAMETER / 2) / 10,
        (y - WALL_POST_DIAMETER / 2) / 10,
        (2 + z) / 10,
      ];
    case "head":
      return [
        (x - l.headWidth / 2) / 10,
        (y - l.headCenterY) / 10,
        (l.headOrigin + z) / 10,
      ];
    case "battery-cover":
      return [
        (x + l.batteryX + f.clearance / 2 - l.width / 2) / 10,
        (y + l.batteryY + f.clearance / 2 - l.height / 2) / 10,
        z / 10,
      ];
  }
}

export function wallMountGuide(s: BoxSettings, f: Fabrication) {
  const l = wallMountLayout(s, f),
    m = f.modular ?? defaultModular;
  return [
    "BASE CONTRA LA PARED · CUADRO HACIA LA PERSONA",
    isModular(f)
      ? "Orden: base con anclaje y electrónica → tapita de pilas (3 AAA) → tapa electrónica con paso central → poste hueco → cuatro paredes de sombra → cabezal circular encastrado al poste. Frente abierto sin marco ni lengüetas delanteras."
      : "Orden: base con anclaje y electrónica → tapa electrónica con paso central → cuatro paredes de sombra → marco frontal COB.",
    `Anclaje tipo ojo de cerradura: entrada circular Ø${l.entry} mm y cuello de ${l.neck} mm con extremo redondeado; refuerzo de 6 mm de espesor total. Esquinas traseras suavizadas y boca del tubo con chaflán de 0,3 mm. Elegí tornillo y tarugo según la pared y verificá el ajuste/carga físicamente. No se incluyen en los STL.`,
    `La base empieza en la pared (Z=0) y mide ${l.depth} mm de alto. Tiene un solo perímetro elevado, sin canal entre dos paredes. Las paredes de sombra bajan por fuera de ese perímetro hasta el reborde inferior de ${l.floor} mm. Con encastres activos, las dos guías finas de cada lado entran en las ranuras interiores de cada pared al deslizarla desde arriba; holgura total ${f.clearance} mm. Los recortes empiezan sobre la tapa electrónica, a ${l.panelStart} mm. Tramo óptico de panel: ${l.panelDepth.toFixed(2)} mm. Tramo delantero eliminado: ${l.frontTrim.toFixed(2)} mm. Profundidad exterior máxima: ${l.outerFace.toFixed(2)} mm.`,
    `Paso circular en tapa electrónica: Ø${isModular(f) ? WALL_POST_DIAMETER + f.clearance : 4 + f.clearance} mm. El alojamiento ciego de la base también es circular y conserva su fondo. ${isModular(f) ? "El frente queda abierto, sin marco." : "El marco frontal tiene el centro abierto."} Pasá los cables por el tubo hacia el interior de la base antes de cerrar.`,
    ...(isModular(f)
      ? [
          `Tubo Ø${WALL_POST_DIAMETER} mm, canal Ø${l.wire} mm, pared de ${(WALL_POST_DIAMETER - l.wire) / 2} mm y largo ${l.postLength.toFixed(2)} mm. Apoyalo en el alojamiento de la base; pasa por el hueco de la tapa electrónica.`,
          `Encastrá el collar del cabezal sobre el tubo hasta su tope de ${HEAD_INSERTION} mm; holgura diametral ${f.clearance.toFixed(2)} mm. Orientá los dos brazos hacia esquinas opuestas como en la vista 3D. La estrella apoya en el asiento circular con el LED hacia la pared. El cabezal se sostiene en el poste, sin marco frontal. La simulación incluye la oclusión de los brazos. Probá el ajuste y usá fijación removible si hace falta. Emisor a ${l.source.toFixed(2)} mm de la pared, sin cambiar su posición. Medí altura del emisor y placa real antes de imprimir.`,
          ...(m.power === "aaa"
            ? [
                `Portapilas comercial de 3 AAA: ${m.holderLength} × ${m.holderWidth} × ${m.holderHeight} mm provisionales. Se introduce por la abertura posterior. La tapa 09 queda al ras de la cara contra la pared; descolgá el cuadro para cambiar pilas sin desmontar paredes ni separador. Usá la muesca para retirar la tapa. Ajuste guiado sin pestillo: verificá retención o usá fijación removible. No se imprimen contactos metálicos.`,
              ]
            : [
                "Alimentación USB regulada de 5 V mediante cable pasante; no incluye conector ni circuito de carga.",
              ]),
          "Para un LED blanco: positivo → interruptor → resistencia de 10 Ω / 5 W → LED → negativo. Elegí pilas o USB; no conectes USB a las pilas. Verificá corriente, polaridad y temperatura del montaje real.",
        ]
      : [
          "COB: colocá la tira en los rebajes posteriores del embellecedor, con la cara luminosa hacia la pared. La fuente puntual se sitúa a la altura real de esa cara; la simulación no modela una tira extendida.",
        ]),
    `Tapa trasera de electrónica ${f.enclosure?.front === "design" ? "con el mismo diseño en relieve" : "lisa"}, con agujero central para tubo/cables. El relieve mira hacia la persona y forma parte de su STL. ${isModular(f) ? "El frente queda abierto, sin embellecedor." : "El embellecedor delantero es solo un marco abierto."}`,
    "Imprimí la base con su cara posterior en la cama; revisá el pequeño voladizo del asiento de la tapa de pilas. Tapa de pilas con cara exterior lisa en la cama y reborde hacia arriba. Paredes acostadas con las ranuras interiores hacia arriba. Si elegís relieve del separador, revisá orientación y soportes en el laminador. Tubo de pie. Cabezal con la boca del collar sobre la cama y el asiento circular hacia arriba; revisá los voladizos de los brazos y del asiento en el laminador y agregá soportes si hace falta. Marco COB con rebajes hacia arriba.",
    "Los recortes completamente ocultos por base, tapas y soportes se omiten. La simulación incluye estas piezas impresas con una fuente puntual; no incluye cables, componentes comprados ni penumbra. Los ajustes son guiados: presentá y calibrá antes de fijar y conservá acceso removible a las pilas. Validá sombra y temperatura con un prototipo.",
  ];
}
