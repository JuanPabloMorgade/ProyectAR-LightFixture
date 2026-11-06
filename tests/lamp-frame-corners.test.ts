import { expect, test } from "vitest";
import {
  defaults,
  createMesh,
  validateSettings,
  binarySTL,
  type Settings,
} from "../src/features/lithophane/mesh";
import { defaultHousing } from "../src/features/lithophane/housing-config";
import {
  createHousingParts,
  housingLayout,
  housingPoint,
  housingPrintMesh,
  housingGuide,
} from "../src/features/lithophane/housing";
import { frameCornerRadius } from "../src/features/lithophane/frame-texture-config";
import { housingZIP } from "../src/features/lithophane/housing-export";
import { closed, materialAt } from "./mesh-assertions";

const base = {
  ...defaults,
  width: 60,
  height: 40,
  resolution: 40,
  printStand: false,
  housing: { ...defaultHousing, enabled: true, depth: 12 },
};
const pixels = new Uint8ClampedArray([160, 160, 160, 255]);

test.each([
  { angle: 0, percent: 1, texture: "none" as const },
  { angle: 0, percent: 100, texture: "none" as const },
  { angle: 90, percent: 50, texture: "waves" as const },
  { angle: 90, percent: 100, texture: "dots" as const },
])(
  "$angle° at $percent% with $texture: round closed shells and intact fits",
  ({ angle, percent, texture }) => {
    const s = {
      ...base,
      angle,
      housing: {
        ...base.housing,
        frameTexture: texture,
        frameCornerRounding: percent,
      },
    };
    const l = housingLayout(s),
      radius = frameCornerRadius(percent),
      parts = createHousingParts(s);
    expect(createMesh(pixels, 1, 1, s)).toEqual(
      createMesh(pixels, 1, 1, {
        ...s,
        housing: { ...s.housing, frameCornerRounding: 0 },
      }),
    );
    for (const part of parts) {
      closed(part);
      const print = housingPrintMesh(part, s);
      closed(print);
      let bottom = Infinity,
        closest = Infinity;
      for (let i = 0; i < part.positions.length; i += 3) {
        bottom = Math.min(bottom, print.positions[i + 2]);
        const x = part.positions[i],
          y = part.positions[i + 1],
          z = part.positions[i + 2];
        const u = l.radius ? l.radius * Math.atan2(x, z + l.radius) : x;
        closest = Math.min(
          closest,
          Math.hypot(l.outerX - Math.abs(u), l.outerY - Math.abs(y)),
        );
      }
      expect(bottom).toBeCloseTo(0, 4);
      // The old sharp peak is gone on every piece, including at just 1%.
      expect(closest).toBeGreaterThan(radius * 0.35);
    }
    const p = (u: number, y: number, z: number) =>
      housingPoint(u, y, z, l.radius);
    const [body, bezel, lid] = parts;
    const peak = p(
      l.outerX - radius * 0.05,
      l.outerY - radius * 0.05,
      l.back / 2,
    );
    expect(materialAt(body, peak)).toBe(false);
    // All four square internal corners still fit the guiding skirts and photo seat.
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const u = sx * (l.innerX - l.clearance / 2 - 0.7),
          y = sy * (l.innerY - l.clearance / 2 - 0.7);
        expect(
          materialAt(bezel, p(u, y, l.front - l.frontEngagement / 2)),
        ).toBe(true);
        expect(materialAt(body, p(u, y, l.front - l.frontEngagement / 2))).toBe(
          false,
        );
        expect(materialAt(lid, p(u, y, l.back + 1.5))).toBe(true);
        expect(
          materialAt(
            body,
            p(
              sx * (l.halfWidth - 1),
              sy * (l.halfHeight - 1),
              -0.8 - l.clearance / 2,
            ),
          ),
        ).toBe(true);
      }
    expect(materialAt(lid, p(0, -l.innerY + 10, l.back - l.wall / 2))).toBe(
      false,
    );
    expect(housingGuide(s)).toContain(`redondeadas al ${percent}`);

    const zip = housingZIP(createMesh(pixels, 1, 1, s), parts, s, "Esquinas"),
      view = new DataView(zip);
    const files = new Map<string, Uint8Array>();
    for (let cursor = 0; view.getUint32(cursor, true) === 0x04034b50;) {
      const size = view.getUint32(cursor + 18, true),
        n = view.getUint16(cursor + 26, true);
      files.set(
        new TextDecoder().decode(new Uint8Array(zip, cursor + 30, n)),
        new Uint8Array(zip, cursor + 30 + n, size),
      );
      cursor += 30 + n + size;
    }
    for (const part of parts) {
      const print = housingPrintMesh(part, s);
      expect(
        Buffer.from(files.get(`Esquinas-${part.filename}.stl`)!).equals(
          Buffer.from(binarySTL(print.positions, print.indices)),
        ),
      ).toBe(true);
    }
  },
  20000,
);

test("missing corner setting is byte-identical to 0%; malformed imports fail validation", () => {
  const old = createHousingParts(base),
    sharp = createHousingParts({
      ...base,
      housing: { ...base.housing, frameCornerRounding: 0 },
    });
  for (let i = 0; i < 3; i++) {
    expect(
      Buffer.from(old[i].positions.buffer).equals(
        Buffer.from(sharp[i].positions.buffer),
      ),
    ).toBe(true);
    expect(
      Buffer.from(old[i].indices.buffer).equals(
        Buffer.from(sharp[i].indices.buffer),
      ),
    ).toBe(true);
  }
  for (const value of [-1, 0.5, 101, NaN, Infinity, null, "50"]) {
    expect(() =>
      validateSettings({
        ...base,
        housing: { ...base.housing, frameCornerRounding: value },
      } as unknown as Settings),
    ).toThrow(/redondeo/);
  }
});
