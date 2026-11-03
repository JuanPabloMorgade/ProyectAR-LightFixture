import { test, expect } from "vitest";
import { defaults, createMesh } from "../src/features/lithophane/mesh";
import {
  createSphereCap,
  sphereCapForPrinting,
  sphereCapTube,
  SPHERE_CAP_TUBE_LENGTH,
} from "../src/features/lithophane/sphere-cap";
import { sphereNeck, sphereNeckY } from "../src/features/lithophane/sphere";
import { closed, materialAt } from "./mesh-assertions";

test("the 22 mm opening gets a guide half as wide and twice as long", () => {
  const tube = sphereCapTube({ ...defaults, sphereOpeningDiameter: 22 });
  expect(tube.outer * 2).toBeCloseTo(10.7, 5);
  expect(tube.length).toBe(36);
  expect(tube.outer - tube.inner).toBeCloseTo(1.2, 5);
});

test.each([8, 22, 30])(
  "cap for %s mm opening is closed, slotted and clears the neck",
  (sphereOpeningDiameter) => {
    const s = {
      ...defaults,
      shape: "sphere" as const,
      sphereOpeningDiameter,
      resolution: 40,
    };
    const cap = createSphereCap(s);
    closed(cap);
    const print = sphereCapForPrinting(cap);
    closed(print);
    const ys = Array.from(
      { length: print.positions.length / 3 },
      (_, i) => print.positions[i * 3 + 2],
    );
    expect(Math.min(...ys)).toBeCloseTo(0, 4);
    expect(Math.max(...ys)).toBeCloseTo(SPHERE_CAP_TUBE_LENGTH + 2, 4);
    const base = sphereNeckY(s),
      neck = sphereNeck(s);
    expect(materialAt(cap, [0, base + 8, 0])).toBe(false);
    expect(materialAt(cap, [0, base + 8, neck.outer])).toBe(false);
    expect(materialAt(cap, [neck.outer, base + 8, 0])).toBe(true);
    expect(materialAt(cap, [neck.outer + 0.8, base + 6, 0])).toBe(false);
    const tube = sphereCapTube(s);
    expect(materialAt(cap, [tube.outer - 0.5, base - 5, 0])).toBe(true);
    expect(materialAt(cap, [0, base - 5, 0])).toBe(false);
    expect(materialAt(cap, [0, base - 5, tube.outer - 0.5])).toBe(false);
    const sphere = createMesh(
      new Uint8ClampedArray([255, 255, 255, 255]),
      1,
      1,
      s,
    );
    // No cap vertex is embedded in the ornament when assembled.
    for (let i = 0; i < cap.positions.length; i += 3)
      expect(
        materialAt(sphere, Array.from(cap.positions.slice(i, i + 3))),
      ).toBe(false);
  },
);

test.each([
  [30, 8],
  [30, 22],
  [38, 30],
])(
  "tube clears the thickest photo in a %s mm sphere with %s mm opening",
  (width, sphereOpeningDiameter) => {
    const s = {
      ...defaults,
      width,
      sphereOpeningDiameter,
      max: 5,
      shape: "sphere" as const,
      resolution: 40,
    };
    const sphere = createMesh(new Uint8ClampedArray([0, 0, 0, 255]), 1, 1, s);
    const cap = createSphereCap(s);
    expect(sphereCapTube(s).length).toBeLessThan(36);
    closed(cap);
    for (let i = 0; i < cap.positions.length; i += 3)
      expect(
        materialAt(sphere, Array.from(cap.positions.slice(i, i + 3))),
      ).toBe(false);
  },
);
