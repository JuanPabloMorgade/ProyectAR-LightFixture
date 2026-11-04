import { expect, test } from "vitest";
import { MODEL_MARK, MARK_DEPTH, modelMark } from "../src/lib/model-mark";
import {
  createMesh,
  defaults,
  binarySTL,
} from "../src/features/lithophane/mesh";
import { panelGrid } from "../src/features/lithophane/panel-grid";
import {
  createHousingParts,
  housingLayout,
} from "../src/features/lithophane/housing";
import { sphereGrid } from "../src/features/lithophane/sphere";
import { wallRearMesh } from "../src/features/shadowbox/wall-rear";
import {
  wallMountParts,
  wallMountLayout,
} from "../src/features/shadowbox/wallmount";
import { defaultBox } from "../src/features/shadowbox/engine";
import { currentFabrication } from "../src/features/shadowbox/editor-defaults";
import { projectionSettings } from "../src/features/shadowbox/projection-settings";
import { materialAt } from "./mesh-assertions";

const white = new Uint8ClampedArray([255, 255, 255, 255]);
const center = (cell: number[]) => [
  (cell[0] + cell[1]) / 2,
  (cell[2] + cell[3]) / 2,
];

test("the fixed attribution scales and reads from the exterior rear face", () => {
  expect(MODEL_MARK).toBe("©Generado en ProyectAR");
  for (const vertical of [false, true]) {
    const mark = modelMark(0, 0, 20, 20, vertical);
    expect(mark.cell).toBeGreaterThan(0);
    for (const cell of mark.cells) {
      const [x, y] = center(cell);
      expect(mark.contains(x, y)).toBe(true);
      expect(Math.abs(x)).toBeLessThan(10);
      expect(Math.abs(y)).toBeLessThan(10);
    }
    // The copyright glyph starts on the viewer's left (positive X from behind),
    // or above the other letters when the rear text is rotated vertically.
    expect(
      vertical ? center(mark.cells[0])[1] : center(mark.cells[0])[0],
    ).toBeGreaterThan(0);
  }
});

test.each([0, 120, 180])(
  "%s degree panels emboss the back and retain the minimum photo thickness",
  (angle) => {
    const s = {
      ...defaults,
      width: 80,
      height: 100,
      min: 0.6,
      angle,
      resolution: 40,
    };
    const grid = panelGrid(s),
      mesh = createMesh(white, 1, 1, s);
    const n = mesh.positions.length / 6;
    const radius = angle ? s.width / ((angle * Math.PI) / 180) : 0;
    let embossed = 0,
      plain = 0;
    for (let i = 0; i < n; i++) {
      const front = Array.from(mesh.positions.slice(i * 3, i * 3 + 3));
      const back = Array.from(
        mesh.positions.slice((i + n) * 3, (i + n + 1) * 3),
      );
      const frontDepth = radius
        ? Math.hypot(front[0], front[2] + radius) - radius
        : front[2];
      const rearDepth = radius
        ? Math.hypot(back[0], back[2] + radius) - radius
        : back[2];
      expect(frontDepth).toBeCloseTo(s.min, 4);
      expect(rearDepth).toBeGreaterThanOrEqual(-MARK_DEPTH - 1e-5);
      expect(rearDepth).toBeLessThanOrEqual(1e-5);
      if (rearDepth < -0.1) embossed++;
      if (Math.abs(rearDepth) < 1e-5) plain++;
      const column = i % (grid.cols + 1),
        row = Math.floor(i / (grid.cols + 1));
      if (!column || column === grid.cols || !row || row === grid.rows)
        expect(rearDepth).toBeCloseTo(0, 4);
    }
    expect(embossed).toBeGreaterThan(100);
    expect(plain).toBeGreaterThan(embossed);
    const stl = binarySTL(mesh.positions, mesh.indices);
    // Actual rear relief, not metadata or a viewer-only label, survives STL serialization.
    const view = new DataView(stl);
    let relief = false;
    for (let f = 0; f < mesh.indices.length / 3 && !relief; f++)
      for (let v = 0; v < 3; v++) {
        const x = view.getFloat32(84 + f * 50 + 12 + v * 12, true),
          z = view.getFloat32(84 + f * 50 + 20 + v * 12, true);
        if ((radius ? Math.hypot(x, z + radius) - radius : z) < -0.1)
          relief = true;
      }
    expect(relief).toBe(true);
  },
);

test.each([
  [120, 100],
  [30, 30],
  [250, 30],
])(
  "flat %s × %s panels place horizontal lettering at the rear bottom-right",
  (width, height) => {
    const s = { ...defaults, width, height, resolution: 40 };
    const { mark } = panelGrid(s);
    const minX = Math.min(...mark.cells.map((c) => c[0]));
    const minY = Math.min(...mark.cells.map((c) => c[2]));
    const maxY = Math.max(...mark.cells.map((c) => c[3]));
    expect(minX).toBeCloseTo(-width / 2 + 5, 6);
    expect(minY).toBeCloseTo(-height / 2 + 5, 6);
    expect(maxY - minY).toBeLessThanOrEqual(4);
    const mesh = createMesh(white, 1, 1, s),
      n = mesh.positions.length / 6;
    let relief = 0;
    for (let i = n * 3; i < mesh.positions.length; i += 3)
      if (mesh.positions[i + 2] < -0.01) {
        relief++;
        expect(mesh.positions[i + 1]).toBeLessThan(-height / 2 + 10);
        expect(mesh.positions[i]).toBeGreaterThan(-width / 2 + 4);
      }
    expect(relief).toBeGreaterThan(0);
    expect(mark.sample(0, 0)).toBe(0);
  },
);

test("rear housing lid and frame engravings remove only a shallow surface layer", () => {
  const s = {
    ...defaults,
    resolution: 40,
    housing: { enabled: true, depth: 25, clearance: 0.3 },
  };
  const l = housingLayout(s),
    parts = createHousingParts(s);
  const marks = [
    { id: "lid", z: l.back - l.wall, mark: modelMark(0, 0, s.width - 10, 4) },
    {
      id: "bezel",
      z: l.front,
      mark: modelMark(0, (l.innerY + l.outerY) / 2, s.width - 6, l.wall - 0.4),
    },
  ];
  for (const { id, z, mark } of marks) {
    const part = parts.find((p) => p.id === id)!;
    const [x, y] = center(mark.cells[0]);
    expect(materialAt(part, [x, y, z + MARK_DEPTH / 2])).toBe(false);
    expect(materialAt(part, [x, y, z + MARK_DEPTH + 0.2])).toBe(true);
  }
});

test("wall base and electronics lid have rear engravings clear of their openings", () => {
  const f = currentFabrication(),
    s = projectionSettings({ ...defaultBox, lightPercent: 50 }, f);
  const l = wallMountLayout(s, f),
    base = wallMountParts(s, f).find((p) => p.id === "base")!;
  const mark = modelMark(
    l.width / 2,
    (l.height / 2 + l.socketOuter / 2 + l.hookBottom) / 2,
    l.width - 16,
    Math.max(1, l.hookBottom - 1 - (l.height / 2 + l.socketOuter / 2)),
  );
  const [x, y] = center(mark.cells[0]);
  expect(materialAt(base, [x, y, MARK_DEPTH / 2])).toBe(false);
  expect(materialAt(base, [x, y, MARK_DEPTH + 0.2])).toBe(true);
  const lid = wallRearMesh(100, 100, 12, false, 0);
  const lidMark = modelMark(50, (5 + 50 - 6 - 3) / 2, 88, 36);
  const [rawX, ly] = center(lidMark.cells[0]);
  const lx = 100 - rawX;
  expect(materialAt(lid, [lx, ly, 2 - MARK_DEPTH / 2])).toBe(false);
  expect(materialAt(lid, [lx, ly, 2 - MARK_DEPTH - 0.2])).toBe(true);
  expect(materialAt(lid, [50, 50, 1])).toBe(false);
});

test.each([30, 80, 250])(
  "%s mm spheres engrave the shoulder while keeping the bore and inner surface",
  (width) => {
    const s = { ...defaults, shape: "sphere" as const, width, resolution: 40 };
    const grid = sphereGrid(s),
      mesh = createMesh(white, 1, 1, s);
    const { shoulder } = grid;
    const n = mesh.positions.length / 6;
    let engraved = 0;
    for (let y = 0; y < shoulder.fractions.length - 2; y++)
      for (let x = 0; x < grid.cols; x++) {
        const t = shoulder.fractions[y + 1],
          theta = (x / grid.cols - 0.5) * 2 * Math.PI;
        const k = (1 + (grid.rows + 1 + y) * grid.cols + x) * 3;
        const radial = Math.hypot(mesh.positions[k], mesh.positions[k + 2]);
        const inner = k + n * 3;
        const bodyInner = (width / 2 - 2.4) * Math.cos(grid.top);
        const innerNeck = (s.sphereOpeningDiameter ?? 22) / 2;
        expect(
          Math.hypot(mesh.positions[inner], mesh.positions[inner + 2]),
        ).toBeCloseTo(bodyInner + t * (innerNeck - bodyInner), 4);
        const expected = shoulder.radial + t * shoulder.dr;
        const cut = expected - radial;
        expect(cut).toBeGreaterThanOrEqual(-1e-5);
        expect(cut).toBeLessThanOrEqual(MARK_DEPTH + 1e-5);
        if (cut > 0.03) {
          engraved++;
          expect(
            shoulder.lettering.sample(
              theta * shoulder.midRadius,
              t * shoulder.length,
            ),
          ).toBeGreaterThan(0);
        }
      }
    expect(engraved).toBeGreaterThan(50);
  },
);
