import { expect, test } from "vitest";
import { defaults, validateSettings } from "../src/features/lithophane/mesh";
import { defaultHousing } from "../src/features/lithophane/housing-config";
import {
  createHousingParts,
  housingLayout,
  housingPoint,
} from "../src/features/lithophane/housing";
import {
  textureOptions,
  textureIntensity,
} from "../src/features/lithophane/frame-texture-config";
import { surfaceTextureDepth } from "../src/features/lithophane/frame-texture";
import { closed, materialAt } from "./mesh-assertions";

const base = {
  ...defaults,
  width: 60,
  height: 40,
  resolution: 40,
  housing: {
    ...defaultHousing,
    enabled: true,
    depth: 12,
    frameTexture: "waves" as const,
  },
};

test("old texture projects retain their exact full-exterior geometry and defaults", () => {
  const explicit = {
    ...base,
    housing: { ...base.housing, ...textureOptions(base.housing) },
  };
  const before = createHousingParts(base),
    after = createHousingParts(explicit);
  for (let i = 0; i < 3; i++) {
    expect(
      Buffer.from(before[i].positions.buffer).equals(
        Buffer.from(after[i].positions.buffer),
      ),
    ).toBe(true);
    expect(
      Buffer.from(before[i].indices.buffer).equals(
        Buffer.from(after[i].indices.buffer),
      ),
    ).toBe(true);
  }
  expect(textureIntensity(0.2)).toBe("Suave");
  expect(textureIntensity(0.4)).toBe("Medio");
  expect(textureIntensity(0.6)).toBe("Fuerte");
  expect(textureIntensity(0.35)).toBe("Personalizado");
});

test.each(["front", "sides", "all"] as const)(
  "%s independently selects safe exterior zones",
  (frameTextureArea) => {
    const settings = {
      ...base,
      angle: 90,
      housing: {
        ...base.housing,
        frameTextureArea,
        frameTextureDepth: 0.6,
        frameTextureScale: 0.75,
      },
    };
    const l = housingLayout(settings),
      parts = createHousingParts(settings);
    const plain = createHousingParts({
      ...settings,
      housing: { ...settings.housing, frameTexture: "none" },
    });
    for (const part of parts) closed(part);
    if (frameTextureArea === "front") {
      expect(parts[0]).toEqual(plain[0]);
      expect(parts[2]).toEqual(plain[2]);
    }
    const frontDepths: number[] = [],
      sideOffsets: number[] = [],
      backDepths: number[] = [];
    for (let k = 0; k < 3; k++)
      for (let i = 0; i < parts[k].positions.length; i += 3) {
        const x = parts[k].positions[i],
          y = parts[k].positions[i + 1],
          z = parts[k].positions[i + 2];
        const u = l.radius * Math.atan2(x, z + l.radius),
          d = Math.hypot(x, z + l.radius) - l.radius;
        const insideOuter =
          Math.abs(u) < l.outerX - 1.4 && Math.abs(y) < l.outerY - 1.4;
        const outsidePhoto =
          Math.max(
            Math.abs(u) - (l.halfWidth - 2),
            Math.abs(y) - (l.halfHeight - 2),
          ) > 1.4;
        if (
          k === 1 &&
          insideOuter &&
          outsidePhoto &&
          d > l.front + l.wall - 0.601
        )
          frontDepths.push(l.front + l.wall - d);
        if (k === 0 && Math.abs(u) > l.outerX - 0.601)
          sideOffsets.push(l.outerX - Math.abs(u));
        // Sample the rear face away from the original maker mark and side walls.
        if (
          k === 2 &&
          insideOuter &&
          y > l.halfHeight - 4 &&
          d < l.back - l.wall + 0.601
        )
          backDepths.push(d - (l.back - l.wall));
      }
    const max = (values: number[]) =>
      values.reduce((a, b) => Math.max(a, b), 0);
    expect(max(frontDepths)).toBeGreaterThanOrEqual(0);
    if (frameTextureArea === "sides")
      expect(max(frontDepths)).toBeLessThan(0.001);
    else expect(max(frontDepths)).toBeGreaterThan(0.15);
    if (frameTextureArea !== "front")
      expect(max(sideOffsets)).toBeGreaterThan(0.15);
    if (frameTextureArea !== "all") expect(max(backDepths)).toBeLessThan(0.001);
    else expect(max(backDepths)).toBeGreaterThan(0.15);
    expect(
      materialAt(
        parts[1],
        housingPoint(
          l.innerX - l.clearance / 2 - 0.7,
          0,
          l.front - l.frontEngagement / 2,
          l.radius,
        ),
      ),
    ).toBe(true);
    expect(
      materialAt(
        parts[2],
        housingPoint(0, -l.innerY + 10, l.back - l.wall / 2, l.radius),
      ),
    ).toBe(false);
  },
  20000,
);

test("depth and scale have bounded physical effects; unsafe imported values are rejected", () => {
  for (const depth of [0.15, 0.6])
    for (const scale of [0.75, 2]) {
      const options = { frameTextureDepth: depth, frameTextureScale: scale };
      expect(surfaceTextureDepth("dots", 0, 0, 3, options)).toBeCloseTo(depth);
      expect(surfaceTextureDepth("dots", 0, 0, 0.8, options)).toBe(0);
      expect(surfaceTextureDepth("dots", 5 * scale, 0, 3, options)).toBeCloseTo(
        depth,
      );
    }
  for (const patch of [
    { frameTextureDepth: 0.65 },
    { frameTextureDepth: NaN },
    { frameTextureScale: 0.1 },
    { frameTextureScale: Infinity },
    { frameTextureArea: "inside" },
    { frameTextureDepth: null },
  ])
    expect(() =>
      validateSettings({
        ...base,
        housing: { ...base.housing, ...patch },
      } as unknown as typeof base),
    ).toThrow();
});
