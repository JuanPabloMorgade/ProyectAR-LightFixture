import { ShapeUtils, Vector2 } from "three";
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
  ledCount: 1 | 2 | 3;
  ledDiameter: number;
  flangeDiameter: number;
  ledHeight: number;
  clearance: number;
  joints: boolean;
};
export const defaultFabrication: Fabrication = {
  ledCount: 1,
  ledDiameter: 5,
  flangeDiameter: 5.2,
  ledHeight: 5,
  clearance: 0.25,
  joints: true,
};
export function validateFabrication(f: Fabrication) {
  if (
    !f ||
    ![1, 2, 3].includes(f.ledCount) ||
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
export function ledLayout(s: BoxSettings, f: Fabrication) {
  validateBox(s);
  validateFabrication(f);
  const pocketRadius = (f.flangeDiameter + f.clearance) / 2;
  const outerRadius = pocketRadius + 1.5;
  const pitch = outerRadius * 2 + 1;
  const centers = Array.from(
    { length: f.ledCount },
    (_, i) => (i - (f.ledCount - 1) / 2) * pitch,
  );
  const tip = (s.depth * 10 * s.lightPercent) / 100;
  const floor = s.depth * 10 + s.thickness / 2 - tip - f.ledHeight;
  const recess = Math.min(0.8, f.ledHeight / 4);
  if (floor < s.thickness + 1.5)
    throw new Error(
      "No hay altura para el soporte: bajá la posición de luz o aumentá la profundidad.",
    );
  if (
    outerRadius + Math.abs(centers[0]) + 3 >= s.width * 5 ||
    outerRadius + 3 >= s.height * 5
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
  id: "top" | "bottom" | "left" | "right" | "front";
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
  const length = span + t;
  const fingers = 5,
    segment = end / fingers;
  const xs = axis([
    0,
    length,
    t + c / 2,
    length - t - c / 2,
    ...Array.from(
      { length: mask.columns + 1 },
      (_, i) => t / 2 + (span * i) / mask.columns,
    ),
    ...tabs(span)
      .flat()
      .map((v) => v + t / 2),
  ]);
  const ys = axis([
    0,
    end,
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
    return !mask.cells[row * mask.columns + col];
  });
  return panelMesh(shape, t, xs, ys);
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
  const layout = ledLayout(s, f),
    t = s.thickness,
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
  const wires = layout.centers.map((x) =>
    circle(width / 2 + x, height / 2, layout.wireRadius),
  );
  const outsides = layout.centers.map((x) =>
    circle(width / 2 + x, height / 2, layout.outerRadius),
  );
  const pockets = layout.centers.map((x) =>
    circle(width / 2 + x, height / 2, layout.pocketRadius),
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
): FabricatedPart[] {
  if (!f) return printParts(masks, s);
  ledLayout(s, f);
  if (
    masks.length !== 4 ||
    FACES.some((face) => masks.filter((m) => m.face === face).length !== 1)
  )
    throw new Error("Faltan paneles de la caja o hay paneles duplicados.");
  const supported = fabricationMasks(masks, s, f);
  return PRINT_PARTS.map((part) => {
    const mask = supported.find((m) => m.face === part.id);
    return {
      ...part,
      ...(part.id === "front"
        ? ledLid(s, f)
        : f.joints
          ? jointWall(mask!, s, f)
          : panelMesh(printableMask(mask!), s.thickness)),
      width:
        (part.id === "front" ? s.width : mask!.span) * 10 +
        (f.joints ? s.thickness : 0),
      label: part.id === "front" ? "Tapa frontal con soporte LED" : part.label,
    };
  });
}
export function fabricationMesh(
  masks: WallMask[],
  s: BoxSettings,
  f?: Fabrication,
): Mesh {
  const parts = fabricationParts(masks, s, f);
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
): [number, number, number] {
  const extra = f?.joints ? s.thickness / 10 : 0;
  const thickness = s.thickness / 10;
  if (part === "front")
    return [
      x / 10 - (s.width + extra) / 2,
      y / 10 - (s.height + extra) / 2,
      f ? thickness / 2 - z / 10 : z / 10 - thickness / 2,
    ];
  const normal = z / 10 - thickness / 2;
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
  for (let i = 0; i < positions.length; i += 3)
    positions.set(
      fabricationPoint(
        part.id,
        part.positions[i],
        part.positions[i + 1],
        part.positions[i + 2],
        s,
        f,
      ),
      i,
    );
  const indices = part.indices.slice();
  // The lid faces inward; reflection reverses winding as well as its Z axis.
  if (f && part.id === "front")
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  return { positions, indices };
}
