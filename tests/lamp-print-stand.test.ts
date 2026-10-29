import { expect, test } from "vitest";
import {
  createMesh,
  defaults,
  validateSettings,
} from "../src/features/lithophane/mesh";
import {
  createPrintStand,
  panelForPrinting,
  STAND_LIFT,
  STAND_GAP,
} from "../src/features/lithophane/print-stand";
import { closed, materialAt } from "./mesh-assertions";

const pixels = new Uint8ClampedArray([
  0, 0, 0, 255, 255, 255, 255, 255, 128, 128, 128, 255, 0, 0, 0, 255,
]);
test.each([0, 120, 180])(
  "upright %s degree panel and removable foot form one closed connected STL",
  (angle) => {
    const s = { ...defaults, angle, resolution: 40 };
    const panel = createMesh(pixels, 2, 2, s),
      before = panel.positions.slice();
    const { printMesh, support, contactCount } = createPrintStand(panel, s);
    closed(printMesh);
    expect(contactCount).toBe(4);
    expect(support.positions.length).toBeGreaterThan(0);
    expect(panel.positions).toEqual(before);
    let low = Infinity,
      high = -Infinity;
    for (let i = 2; i < printMesh.positions.length; i += 3) {
      low = Math.min(low, printMesh.positions[i]);
      high = Math.max(high, printMesh.positions[i]);
    }
    expect(low).toBeCloseTo(0, 4);
    expect(high).toBeCloseTo(s.height + STAND_LIFT, 4);
    // Sample the photo volume away from the sacrificial edge in both coordinate systems.
    const r = angle ? s.width / ((angle * Math.PI) / 180) : 0;
    for (const u of [-20, 5, 22])
      for (const d of [0.2, 1.4, 4]) {
        const x = r ? (r + d) * Math.sin(u / r) : u,
          z = r ? (r + d) * Math.cos(u / r) - r : d;
        expect(
          materialAt(printMesh, [x, -z, s.height / 2 + STAND_LIFT + 7]),
        ).toBe(materialAt(panel, [x, 7, z]));
      }
  },
);

test("the support leaves an air gap except for narrow cuttable contacts", () => {
  const s = { ...defaults, angle: 0, resolution: 40 };
  const panel = createMesh(pixels, 2, 2, s),
    { printMesh } = createPrintStand(panel, s);
  expect(materialAt(printMesh, [0, -0.3, STAND_LIFT - STAND_GAP / 2])).toBe(
    false,
  );
  expect(materialAt(printMesh, [-15, -0.3, STAND_LIFT - STAND_GAP / 2])).toBe(
    true,
  );
  expect(materialAt(printMesh, [0, -0.3, STAND_LIFT - STAND_GAP - 0.1])).toBe(
    true,
  );
  expect(materialAt(printMesh, [0, 2, 0.6])).toBe(true);
});

test("coarse sampling and thick photo edges still produce narrow watertight contacts", () => {
  const s = {
    ...defaults,
    angle: 0,
    width: 250,
    height: 100,
    min: 0.6,
    max: 5,
    resolution: 40,
  };
  const panel = createMesh(pixels, 2, 2, s),
    { printMesh, contactCount } = createPrintStand(panel, s);
  closed(printMesh);
  expect(contactCount).toBe(8);
});

test("stand can be disabled and malformed preferences are rejected", () => {
  const s = { ...defaults, resolution: 40, printStand: false },
    panel = createMesh(pixels, 2, 2, s);
  expect(panelForPrinting(panel, s)).toBe(panel);
  expect(() =>
    validateSettings({ ...s, printStand: "yes" as unknown as boolean }),
  ).toThrow();
});

test.each([0, 120, 180])(
  "a uniformly thick %s degree photo has no slivers at 384 points",
  (angle) => {
    const s = {
      ...defaults,
      angle,
      width: 249.7,
      height: 30,
      min: 0.6,
      max: 5,
      resolution: 384,
    };
    const panel = createMesh(new Uint8ClampedArray([0, 0, 0, 255]), 1, 1, s);
    closed(createPrintStand(panel, s).printMesh);
  },
  15000,
);
