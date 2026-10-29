import { isWallMount, wallPanelStart } from "./enclosure-config";
import { wallMountLayout, wallMountParts, wallMountPoint } from "./wallmount";
import { wallFrontMesh } from "./wall-front";
import {
  wallSeatTabs,
  wallSeatFit,
  WALL_BASE_FLOOR,
  WALL_SEAT_ENTRY,
  WALL_SEAT_RAIL,
} from "./wall-seat";
import { ShapeUtils, Vector2 } from "three";
import {
  hasEnclosure,
  validateEnclosure,
  enclosureLayout,
  enclosureParts,
  enclosurePoint,
  cablePassage,
  type EnclosureSettings,
  type EnclosurePartId,
} from "./enclosure";
import { solidMesh, type Bounds } from "./solid-mesh";
import { layeredPanelMesh } from "./layered-panel";
import {
  isModular,
  modularLayout,
  modularLid,
  modularParts,
  modularPoint,
  validateModular,
  defaultModular,
  type ModularSettings,
  type ModularPartId,
} from "./modular";
import {
  cobLayout,
  isCob,
  validateCob,
  defaultCob,
  type CobSettings,
} from "./cob";
import {
  boundaryLoops,
  panelMesh,
  printParts,
  printableMask,
  validateBox,
  FACES,
  PRINT_PARTS,
  type BoxSettings,
  type WallMask,
} from "./engine";

/** Millimeters, except LED count. Kept separate from optical settings. */
export type Fabrication = {
  illumination?: "individual" | "cob" | "modular";
  cob?: CobSettings;
  modular?: ModularSettings;
  enclosure?: EnclosureSettings;
  ledCount: 6 | 9 | 10 | 12;
  ledDiameter: number;
  flangeDiameter: number;
  ledHeight: number;
  clearance: number;
  joints: boolean;
};
export const defaultFabrication: Fabrication = {
  ledCount: 6,
  ledDiameter: 5,
  flangeDiameter: 5.2,
  ledHeight: 5,
  clearance: 0.25,
  joints: true,
};
export function validateFabrication(f: Fabrication) {
  if (
    f?.illumination !== undefined &&
    !["individual", "cob", "modular"].includes(f.illumination)
  )
    throw new Error("Elegí un tipo de iluminación válido.");
  if (isCob(f)) validateCob(f.cob ?? defaultCob);
  if (isModular(f)) validateModular(f.modular ?? defaultModular);
  if (f?.enclosure !== undefined) validateEnclosure(f.enclosure);
  if (
    !f ||
    ![6, 9, 10, 12].includes(f.ledCount) ||
    typeof f.joints !== "boolean" ||
    ![f.ledDiameter, f.flangeDiameter, f.ledHeight, f.clearance].every(
      Number.isFinite,
    ) ||
    f.ledDiameter < 3 ||
    f.ledDiameter > 10 ||
    f.flangeDiameter < f.ledDiameter ||
    f.flangeDiameter > f.ledDiameter + 3 ||
    f.ledHeight < 2 ||
    f.ledHeight > 15 ||
    f.clearance < 0.1 ||
    f.clearance > 0.8
  )
    throw new Error("Revisá las medidas del LED y la holgura de impresión.");
}
export function lightingLayout(s: BoxSettings, f: Fabrication) {
  validateFabrication(f);
  const layout = isModular(f)
    ? modularLayout(s, f)
    : isCob(f)
      ? cobLayout(s, f)
      : ledLayout(s, f);
  if (isWallMount(f)) {
    wallMountLayout(s, f);
  } else if (hasEnclosure(f)) {
    enclosureLayout(s, f);
    cablePassage(s, f);
  }
  return layout;
}
export function ledLayout(s: BoxSettings, f: Fabrication) {
  validateBox(s);
  validateFabrication(f);
  // Extra diametral allowance only for the LED seats, not the box joints.
  const pocketRadius = (f.flangeDiameter + f.clearance + 0.2) / 2;
  const outerRadius = pocketRadius + 1.5;
  const pitch = outerRadius * 2 + 1;
  const rows = { 6: [3, 3], 9: [3, 3, 3], 10: [3, 4, 3], 12: [4, 4, 4] }[
    f.ledCount
  ];
  // Keep the sources compact around the optical axis. Stagger the ten-LED
  // array with equal nearest-neighbor spacing; rotate for portrait lids.
  const rowPitch = f.ledCount === 10 ? (pitch * Math.sqrt(3)) / 2 : pitch;
  const centers = rows.flatMap((count, row) =>
    Array.from({ length: count }, (_, col): [number, number] => {
      const x = (col - (count - 1) / 2) * pitch;
      const y = (row - (rows.length - 1) / 2) * rowPitch;
      return s.width >= s.height ? [x, y] : [y, x];
    }),
  );
  const tip = (s.depth * 10 * s.lightPercent) / 100;
  const floor = s.depth * 10 + s.thickness / 2 - tip - f.ledHeight;
  const recess = Math.min(0.8, f.ledHeight / 4);
  if (floor < s.thickness + 1.5)
    throw new Error(
      "No hay altura para el soporte: bajá la posición de luz o aumentá la profundidad.",
    );
  if (
    centers.some(
      ([x, y]) =>
        outerRadius + Math.abs(x) + 3 >= s.width * 5 ||
        outerRadius + Math.abs(y) + 3 >= s.height * 5,
    )
  )
    throw new Error("Los LEDs no entran en la tapa con estas medidas.");
  if (f.joints && s.thickness < 1.2)
    throw new Error("Usá al menos 1,2 mm de espesor para los encastres.");
  return {
    centers,
    pitch,
    pocketRadius,
    outerRadius,
    tip,
    floor,
    top: floor + recess,
    wireRadius: Math.min(1.9, f.ledDiameter * 0.38),
  };
}

type Point = [number, number];
type Mesh = { positions: Float32Array; indices: Uint32Array };
export type FabricatedPart = Mesh & {
  id:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "front"
    | ModularPartId
    | EnclosurePartId
    | "base"
    | "separator";
  filename: string;
  label: string;
  width: number;
};
const axis = (values: number[]) =>
  [...new Set(values.map((v) => +v.toFixed(8)))].sort((a, b) => a - b);
const tabs = (span: number) =>
  [0.25, 0.5, 0.75].map((p) => {
    const half = Math.min(5, span / 16);
    return [span * p - half, span * p + half] as Point;
  });
const inTabs = (x: number, span: number, extra = 0) =>
  tabs(span).some(([a, b]) => x > a - extra && x < b + extra);

/** Keep a 1.2 mm material rail behind the fingers. Shared by SVG and optics. */
export function fabricationMasks(
  masks: WallMask[],
  s: BoxSettings,
  f: Pick<Fabrication, "joints" | "clearance">,
): WallMask[] {
  if (
    typeof f.joints !== "boolean" ||
    !Number.isFinite(f.clearance) ||
    f.clearance < 0.1 ||
    f.clearance > 0.8
  )
    throw new Error("Revisá la holgura de impresión.");
  if (!f.joints) return masks;
  const rail = s.thickness / 2 + f.clearance / 2 + 1.2;
  return masks.map((mask) => {
    const cells = mask.cells.slice();
    for (let x = 0; x < mask.columns; x++) {
      const u = ((x + 0.5) * mask.span * 10) / mask.columns;
      if (u < rail || u > mask.span * 10 - rail)
        for (let y = 0; y < mask.rows; y++) cells[y * mask.columns + x] = 0;
    }
    return printableMask({ ...mask, cells });
  });
}

function grid(
  xs: number[],
  ys: number[],
  solid: (x: number, y: number) => boolean,
): WallMask {
  const columns = xs.length - 1,
    rows = ys.length - 1;
  const cells = new Uint8Array(columns * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++)
      cells[y * columns + x] = solid(
        (xs[x] + xs[x + 1]) / 2,
        (ys[y] + ys[y + 1]) / 2,
      )
        ? 0
        : 1;
  return {
    face: "top",
    span: xs.at(-1)! / 10,
    depth: ys.at(-1)! / 10,
    columns,
    rows,
    cells,
  };
}

function jointWall(raw: WallMask, s: BoxSettings, f: Fabrication): Mesh {
  const mask = printableMask(raw),
    t = s.thickness,
    c = f.clearance;
  const span = mask.span * 10,
    depth = s.depth * 10,
    end = depth - t / 2 - c / 2;
  const mounted = isWallMount(f);
  const length = span + (f.joints ? t : 0);
  const extra = f.joints ? t / 2 : 0;
  const cornerWidth = (f.joints ? t : t / 2) + c / 2;
  const rearTabs = mounted && f.joints ? wallSeatTabs(span) : [];
  const rearY = mounted ? WALL_BASE_FLOOR + c / 2 - wallPanelStart(f) : 0;
  const fingers = 5,
    segment = end / fingers;
  const xs = axis([
    0,
    length,
    cornerWidth,
    length - cornerWidth,
    ...Array.from(
      { length: mask.columns + 1 },
      (_, i) => extra + (span * i) / mask.columns,
    ),
    ...tabs(span)
      .flat()
      .map((v) => v + t / 2),
    ...rearTabs.flatMap(([a, b]) => [
      a + extra - c / 2,
      b + extra + c / 2,
      a + extra - c / 2 - WALL_SEAT_ENTRY,
      b + extra + c / 2 + WALL_SEAT_ENTRY,
    ]),
  ]);
  const ys = axis([
    0,
    ...(mounted ? [rearY, rearY + 0.6, -0.3, WALL_SEAT_RAIL] : []),
    end,
    ...(!f.joints ? [depth] : []),
    depth + t / 2,
    ...Array.from(
      { length: mask.rows + 1 },
      (_, i) => (depth * i) / mask.rows,
    ).filter((v) => v < end),
    ...Array.from({ length: fingers - 1 }, (_, i) => (i + 1) * segment).flatMap(
      (v) => [v - c / 2, v + c / 2],
    ),
  ]);
  const horizontal = mask.face === "top" || mask.face === "bottom";
  const shape = grid(xs, ys, (x, y) => {
    if (y < 0) {
      return horizontal || (x > cornerWidth && x < length - cornerWidth);
    }
    if (!f.joints) {
      if (y > depth) return false;
      const col = Math.min(
        mask.columns - 1,
        Math.floor((x / span) * mask.columns),
      );
      const row = Math.min(mask.rows - 1, Math.floor((y / depth) * mask.rows));
      return y < WALL_SEAT_RAIL || !mask.cells[row * mask.columns + col];
    }
    if (y > end) return inTabs(x - t / 2, span);
    const corner = x < t + c / 2 || x > length - t - c / 2;
    if (corner) {
      const phase = Math.min(fingers - 1, Math.floor(y / segment));
      if ((phase % 2 === 0) !== horizontal) return false;
      if (phase > 0 && y < phase * segment + c / 2) return false;
      if (phase < fingers - 1 && y > (phase + 1) * segment - c / 2)
        return false;
      return true;
    }
    const col = Math.min(
      mask.columns - 1,
      Math.max(0, Math.floor(((x - t / 2) / span) * mask.columns)),
    );
    const row = Math.min(mask.rows - 1, Math.floor((y / depth) * mask.rows));
    return (
      (mounted && y < WALL_SEAT_RAIL) || !mask.cells[row * mask.columns + col]
    );
  });
  if (!rearTabs.length) return panelMesh(shape, t, xs, ys);
  const fit = wallSeatFit(t, c);
  const ix = new Map(xs.slice(0, -1).map((a, i) => [(a + xs[i + 1]) / 2, i]));
  const iy = new Map(ys.slice(0, -1).map((a, i) => [(a + ys[i + 1]) / 2, i]));
  return layeredPanelMesh(xs, ys, axis([0, t - fit.groove, t]), (x, y, z) => {
    if (shape.cells[iy.get(y)! * shape.columns + ix.get(x)!]) return false;
    if (y >= -0.3) return true;
    const allowance = c / 2 + (y < rearY + 0.6 ? WALL_SEAT_ENTRY : 0);
    const groove = rearTabs.some(
      ([a, b]) => x > a + extra - allowance && x < b + extra + allowance,
    );
    // All four STL panels print with their grooves facing up.
    return !groove || z < t - fit.groove;
  });
}

/** Surfaces share exact circular rings, including the plate/tube interface. */
class MeshBuilder {
  positions: number[] = [];
  indices: number[] = [];
  triangle(a: number[], b: number[], c: number[]) {
    const n = this.positions.length / 3;
    this.positions.push(...a, ...b, ...c);
    this.indices.push(n, n + 1, n + 2);
  }
  surface(outline: Point[], holes: Point[][], z: number, up: boolean) {
    const outer = outline.map((p) => new Vector2(...p));
    const inner = holes.map((loop) => loop.map((p) => new Vector2(...p)));
    const vertices = [outer, ...inner].flat();
    for (const face of ShapeUtils.triangulateShape(outer, inner)) {
      // Split skipped collinear boundary vertices (rectangular notches/holes).
      const perimeter: number[] = [];
      for (let edge = 0; edge < 3; edge++) {
        const a = face[edge],
          b = face[(edge + 1) % 3],
          p = vertices[a],
          q = vertices[b];
        perimeter.push(a);
        const dx = q.x - p.x,
          dy = q.y - p.y,
          len = dx * dx + dy * dy;
        const between = vertices
          .map((r, i) => ({
            i,
            u: ((r.x - p.x) * dx + (r.y - p.y) * dy) / len,
            cross: (r.x - p.x) * dy - (r.y - p.y) * dx,
          }))
          .filter(
            (v) => v.u > 1e-8 && v.u < 1 - 1e-8 && Math.abs(v.cross) < 1e-7,
          )
          .sort((a, b) => a.u - b.u);
        perimeter.push(...between.map((v) => v.i));
      }
      const polygon = perimeter.map((i) => [vertices[i].x, vertices[i].y, z]);
      const center = [
        face.reduce((v, i) => v + vertices[i].x, 0) / 3,
        face.reduce((v, i) => v + vertices[i].y, 0) / 3,
        z,
      ];
      if (polygon.length === 3) {
        this.triangle(polygon[0], polygon[up ? 1 : 2], polygon[up ? 2 : 1]);
      } else
        for (let i = 0; i < polygon.length; i++)
          this.triangle(
            center,
            polygon[up ? i : (i + 1) % polygon.length],
            polygon[up ? (i + 1) % polygon.length : i],
          );
    }
  }
  wall(loop: Point[], z0: number, z1: number) {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i],
        b = loop[(i + 1) % loop.length];
      this.triangle([...a, z0], [...b, z0], [...b, z1]);
      this.triangle([...a, z0], [...b, z1], [...a, z1]);
    }
  }
  mesh(): Mesh {
    return {
      positions: new Float32Array(this.positions),
      indices: new Uint32Array(this.indices),
    };
  }
}
function circle(x: number, y: number, radius: number): Point[] {
  return Array.from({ length: 48 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 48;
    return [
      +(x + radius * Math.cos(angle)).toFixed(8),
      +(y + radius * Math.sin(angle)).toFixed(8),
    ];
  });
}
function ledLid(s: BoxSettings, f: Fabrication): Mesh {
  const t = s.thickness,
    c = f.clearance;
  const w = s.width * 10,
    h = s.height * 10;
  const extra = f.joints ? t : 0,
    width = w + extra,
    height = h + extra;
  const xs = axis([
    0,
    width,
    ...(f.joints
      ? [
          t + c / 2,
          width - t - c / 2,
          ...tabs(w).flatMap(([a, b]) => [
            a + t / 2 - c / 2,
            b + t / 2 + c / 2,
          ]),
        ]
      : []),
  ]);
  const ys = axis([
    0,
    height,
    ...(f.joints
      ? [
          t + c / 2,
          height - t - c / 2,
          ...tabs(h).flatMap(([a, b]) => [
            a + t / 2 - c / 2,
            b + t / 2 + c / 2,
          ]),
        ]
      : []),
  ]);
  const shape = grid(
    xs,
    ys,
    (x, y) =>
      !(
        f.joints &&
        (((y < t + c / 2 || y > height - t - c / 2) &&
          inTabs(x - t / 2, w, c / 2)) ||
          ((x < t + c / 2 || x > width - t - c / 2) &&
            inTabs(y - t / 2, h, c / 2)))
      ),
  );
  const outline = boundaryLoops({
    ...shape,
    cells: shape.cells.map((v) => 1 - v),
  }).map((loop) => loop.map(([x, y]) => [xs[x], ys[y]] as Point))[0];
  if (isWallMount(f)) return wallFrontMesh(s, f, outline);
  if (isModular(f)) return modularLid(s, f, outline);
  if (isCob(f)) {
    const layout = cobLayout(s, f);
    const rectangle = (r: {
      x: number;
      y: number;
      width: number;
      height: number;
    }): Point[] => {
      const x = width / 2 + r.x,
        y = height / 2 + r.y;
      return [
        [x - r.width / 2, y - r.height / 2],
        [x + r.width / 2, y - r.height / 2],
        [x + r.width / 2, y + r.height / 2],
        [x - r.width / 2, y + r.height / 2],
      ];
    };
    const recesses = layout.footprints.flatMap(({ pocket, marker }) => [
      { loop: rectangle(pocket), floor: layout.floor },
      {
        loop: rectangle(marker),
        floor: t - Math.min(0.2, (f.cob ?? defaultCob).recessDepth),
      },
    ]);
    if (hasEnclosure(f)) {
      const p = cablePassage(s, f),
        a = p.size / 2;
      const cuts: Bounds[] = recesses.map(({ loop, floor }) => [
        loop[0][0],
        loop[1][0],
        loop[0][1],
        loop[2][1],
        floor,
        t,
      ]);
      cuts.push([
        width / 2 + p.x - a,
        width / 2 + p.x + a,
        height / 2 + p.y - a,
        height / 2 + p.y + a,
        0,
        t,
      ]);
      return solidMesh([], cuts, outline, t);
    }
    const mesh = new MeshBuilder();
    mesh.surface(outline, [], 0, false);
    mesh.wall(outline, 0, t);
    mesh.surface(
      outline,
      recesses.map(({ loop }) => [...loop].reverse()),
      t,
      true,
    );
    for (const { loop, floor } of recesses) {
      mesh.surface(loop, [], floor, true);
      mesh.wall([...loop].reverse(), floor, t);
    }
    return mesh.mesh();
  }
  const layout = ledLayout(s, f);
  const wires = layout.centers.map(([x, y]) =>
    circle(width / 2 + x, height / 2 + y, layout.wireRadius),
  );
  const outsides = layout.centers.map(([x, y]) =>
    circle(width / 2 + x, height / 2 + y, layout.outerRadius),
  );
  const pockets = layout.centers.map(([x, y]) =>
    circle(width / 2 + x, height / 2 + y, layout.pocketRadius),
  );
  const mesh = new MeshBuilder();
  mesh.surface(
    outline,
    wires.map((v) => [...v].reverse()),
    0,
    false,
  );
  mesh.surface(
    outline,
    outsides.map((v) => [...v].reverse()),
    t,
    true,
  );
  mesh.wall(outline, 0, t);
  layout.centers.forEach((_, i) => {
    mesh.wall([...wires[i]].reverse(), 0, layout.floor);
    mesh.wall(outsides[i], t, layout.top);
    mesh.surface(pockets[i], [[...wires[i]].reverse()], layout.floor, true);
    mesh.wall([...pockets[i]].reverse(), layout.floor, layout.top);
    mesh.surface(outsides[i], [[...pockets[i]].reverse()], layout.top, true);
  });
  return mesh.mesh();
}

export function fabricationParts(
  masks: WallMask[],
  s: BoxSettings,
  f?: Fabrication,
  artwork?: Uint8ClampedArray,
): FabricatedPart[] {
  if (!f) return printParts(masks, s);
  lightingLayout(s, f);
  if (
    masks.length !== 4 ||
    FACES.some((face) => masks.filter((m) => m.face === face).length !== 1)
  )
    throw new Error("Faltan paneles de la caja o hay paneles duplicados.");
  const supported = fabricationMasks(masks, s, f);
  const parts: FabricatedPart[] = PRINT_PARTS.map((part) => {
    const mask = supported.find((m) => m.face === part.id);
    return {
      ...part,
      ...(hasEnclosure(f) && part.id === "front"
        ? {
            filename: isWallMount(f)
              ? "05-embellecedor"
              : "05-placa-portaluces",
          }
        : {}),
      ...(part.id === "front"
        ? ledLid(s, f)
        : f.joints || isWallMount(f)
          ? jointWall(mask!, s, f)
          : panelMesh(printableMask(mask!), s.thickness)),
      width:
        (part.id === "front" ? s.width : mask!.span) * 10 +
        (f.joints ? s.thickness : 0),
      label:
        part.id === "front"
          ? isWallMount(f)
            ? "Marco embellecedor frontal abierto"
            : hasEnclosure(f)
              ? isModular(f)
                ? "Placa portaluces con alojamiento de poste"
                : "Placa portaluces con rebajes COB"
              : isModular(f)
                ? "Base modular con alojamiento de poste"
                : isCob(f)
                  ? "Tapa frontal con rebajes COB"
                  : "Tapa frontal con soporte LED"
          : part.label,
    };
  });
  if (isWallMount(f)) return [...parts, ...wallMountParts(s, f, artwork)];
  const litParts = isModular(f) ? [...parts, ...modularParts(s, f)] : parts;
  return hasEnclosure(f) ? [...litParts, ...enclosureParts(s, f)] : litParts;
}
export function fabricationMesh(
  masks: WallMask[],
  s: BoxSettings,
  f?: Fabrication,
  artwork?: Uint8ClampedArray,
): Mesh {
  const parts = fabricationParts(masks, s, f, artwork);
  const positions: number[] = [],
    indices: number[] = [];
  let origin = 0;
  for (const part of parts) {
    const offset = positions.length / 3;
    for (let i = 0; i < part.positions.length; i += 3)
      positions.push(
        part.positions[i] + origin,
        part.positions[i + 1],
        part.positions[i + 2],
      );
    for (const index of part.indices) indices.push(index + offset);
    origin += part.width + 12;
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}

/** Local print coordinates → assembly-relative centimeters. */
export function fabricationPoint(
  part: FabricatedPart["id"],
  x: number,
  y: number,
  z: number,
  s: BoxSettings,
  f?: Fabrication,
  wallLayout?: ReturnType<typeof wallMountLayout>,
): [number, number, number] {
  const extra = f?.joints ? s.thickness / 10 : 0;
  const thickness = s.thickness / 10;
  if (f && isWallMount(f)) {
    if (["base", "separator", "post", "head", "battery-cover"].includes(part))
      return wallMountPoint(
        part as Parameters<typeof wallMountPoint>[0],
        x,
        y,
        z,
        s,
        f,
        wallLayout,
      );
    if (part === "front")
      return [
        x / 10 - (s.width + extra) / 2,
        y / 10 - (s.height + extra) / 2,
        z / 10 - thickness / 2,
      ];
  }
  if (f && (part === "electronics" || part === "face"))
    return enclosurePoint(part, x, y, z, s, f);
  if (f && (part === "post" || part === "head" || part === "battery-cover")) {
    const [px, py, pz] = modularPoint(part, x, y, z, s, f);
    return [px / 10, py / 10, thickness / 2 - pz / 10];
  }
  if (part === "front")
    return [
      x / 10 - (s.width + extra) / 2,
      y / 10 - (s.height + extra) / 2,
      f ? thickness / 2 - z / 10 : z / 10 - thickness / 2,
    ];
  const reverseWall =
    f && isWallMount(f) && (part === "bottom" || part === "right");
  const normal = (reverseWall ? s.thickness - z : z) / 10 - thickness / 2;
  return part === "top" || part === "bottom"
    ? [x / 10 - (s.width + extra) / 2, -normal, y / 10 - s.depth / 2]
    : [normal, x / 10 - (s.height + extra) / 2, y / 10 - s.depth / 2];
}

export function assemblyMesh(
  part: FabricatedPart,
  s: BoxSettings,
  f?: Fabrication,
): Mesh {
  const positions = new Float32Array(part.positions.length);
  const wallLayout = f && isWallMount(f) ? wallMountLayout(s, f) : undefined;
  for (let i = 0; i < positions.length; i += 3)
    positions.set(
      fabricationPoint(
        part.id,
        part.positions[i],
        part.positions[i + 1],
        part.positions[i + 2],
        s,
        f,
        wallLayout,
      ),
      i,
    );
  const indices = part.indices.slice();
  // The lid faces inward; reflection reverses winding as well as its Z axis.
  if (
    f &&
    (isWallMount(f)
      ? ["separator", "bottom", "right"].includes(part.id)
      : ["front", "post", "head", "face"].includes(part.id))
  )
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  return { positions, indices };
}
