import { expect, test } from "vitest";
import {
  defaults,
  createMesh,
  validateSettings,
  binarySTL,
} from "../src/features/lithophane/mesh";
import { defaultHousing } from "../src/features/lithophane/housing-config";
import {
  frameTextures,
  FRAME_TEXTURE_DEPTH,
} from "../src/features/lithophane/frame-texture";
import {
  createHousingParts,
  housingLayout,
  housingPoint,
  housingPrintMesh,
  housingGuide,
} from "../src/features/lithophane/housing";
import { housingZIP } from "../src/features/lithophane/housing-export";
import { validateProject } from "../src/features/lithophane/projects";
import { closed, materialAt } from "./mesh-assertions";

const base = {
  ...defaults,
  width: 60,
  height: 40,
  resolution: 40,
  housing: { ...defaultHousing, enabled: true, depth: 12 },
};
const pixels = new Uint8ClampedArray([80, 80, 80, 255]);

for (const angle of [0, 90]) {
  test.each(frameTextures.filter((t) => t.value !== "none"))(
    `${angle}° $label: closed printable solid, unchanged photo, fit and envelope`,
    ({ value }) => {
      const plain = { ...base, angle };
      const s = {
        ...plain,
        housing: { ...plain.housing, frameTexture: value },
      };
      const l = housingLayout(s);
      const original = createHousingParts(plain);
      const parts = createHousingParts(s);
      // All exterior pieces change; the image geometry stays byte-identical.
      for (let index = 0; index < parts.length; index++) {
        expect(parts[index].positions.length).toBeGreaterThan(
          original[index].positions.length,
        );
        closed(parts[index]);
        const printable = housingPrintMesh(parts[index], s);
        closed(printable);
        let bottom = Infinity;
        for (let i = 2; i < printable.positions.length; i += 3)
          bottom = Math.min(bottom, printable.positions[i]);
        expect(bottom).toBeCloseTo(0, 4);
      }
      expect(createMesh(pixels, 1, 1, s)).toEqual(
        createMesh(pixels, 1, 1, plain),
      );
      const bezel = parts[1];
      const print = housingPrintMesh(bezel, s);
      let bottom = Infinity,
        deepest = 0;
      for (let i = 2; i < print.positions.length; i += 3)
        bottom = Math.min(bottom, print.positions[i]);
      expect(bottom).toBeCloseTo(0, 4);
      const face = l.front + l.wall;
      let maxDepth = -Infinity,
        maxY = 0;
      for (let i = 0; i < bezel.positions.length; i += 3) {
        const x = bezel.positions[i],
          y = bezel.positions[i + 1],
          z = bezel.positions[i + 2];
        const depth = l.radius ? Math.hypot(x, z + l.radius) - l.radius : z;
        maxDepth = Math.max(maxDepth, depth);
        if (depth > face - FRAME_TEXTURE_DEPTH - 0.0001)
          deepest = Math.max(deepest, face - depth);
        maxY = Math.max(maxY, Math.abs(y));
      }
      expect(maxDepth).toBeLessThanOrEqual(face + 0.0001);
      expect(maxY).toBeLessThanOrEqual(l.outerY + 0.0001);
      expect(deepest).toBeGreaterThan(0.3);
      const p = (u: number, y: number, z: number) =>
        housingPoint(u, y, z, l.radius);
      const sides = new Set<string>();
      const body = parts[0],
        lid = parts[2];
      for (let i = 0; i < body.positions.length; i += 3) {
        const x = body.positions[i],
          y = body.positions[i + 1],
          z = body.positions[i + 2];
        const u = l.radius ? l.radius * Math.atan2(x, z + l.radius) : x;
        const depth = l.radius ? Math.hypot(x, z + l.radius) - l.radius : z;
        if (depth > l.back + 1.4 && depth < l.front - 1.4) {
          if (Math.abs(u) < l.outerX - 0.05 && Math.abs(u) > l.outerX - 0.61)
            sides.add(u > 0 ? "right" : "left");
          if (Math.abs(y) < l.outerY - 0.05 && Math.abs(y) > l.outerY - 0.61)
            sides.add(y > 0 ? "top" : "bottom");
        }
      }
      expect(sides.size).toBe(4);
      // Inner seats, lid skirt and round cable passage stay free and usable.
      expect(materialAt(body, p(0, 0, l.back / 2))).toBe(false);
      expect(materialAt(body, p(l.outerX - l.wall / 2, 0, l.back / 2))).toBe(
        true,
      );
      expect(
        materialAt(lid, p(l.innerX - l.clearance / 2 - 0.7, 0, l.back + 1.5)),
      ).toBe(true);
      expect(materialAt(lid, p(0, -l.innerY + 10, l.back - l.wall / 2))).toBe(
        false,
      );
      expect(materialAt(bezel, p(0, 0, l.front + 1))).toBe(false);
      expect(
        materialAt(
          bezel,
          p(
            l.innerX - l.clearance / 2 - 0.7,
            0,
            l.front - l.frontEngagement / 2,
          ),
        ),
      ).toBe(true);
      expect(materialAt(bezel, p(0, l.halfHeight - 1, l.front + 1))).toBe(true);

      // ZIP serializes the exact preview geometry, rotated for the print bed.
      const zip = housingZIP(createMesh(pixels, 1, 1, s), parts, s, "Textura");
      const view = new DataView(zip);
      let cursor = 0;
      const exported = new Map<string, Uint8Array>();
      while (view.getUint32(cursor, true) === 0x04034b50) {
        const size = view.getUint32(cursor + 18, true),
          n = view.getUint16(cursor + 26, true);
        const filename = new TextDecoder().decode(
          new Uint8Array(zip, cursor + 30, n),
        );
        exported.set(filename, new Uint8Array(zip, cursor + 30 + n, size));
        cursor += 30 + n + size;
      }
      for (const part of parts) {
        const bytes = exported.get(`Textura-${part.filename}.stl`);
        expect(bytes).toBeDefined();
        const printable = housingPrintMesh(part, s);
        expect(
          Buffer.from(bytes!).equals(
            Buffer.from(binarySTL(printable.positions, printable.indices)),
          ),
        ).toBe(true);
      }
      expect(housingGuide(s)).toContain(
        "Relieve hacia adentro de hasta 0,6 mm",
      );
    },
    20000,
  );
}

test("legacy projects are smooth and unknown imported textures are rejected", () => {
  const { frameTexture: _, ...legacyHousing } = base.housing;
  const legacy = { ...base, housing: legacyHousing };
  expect(createHousingParts(legacy)).toEqual(createHousingParts(base));
  const project = {
    version: 1 as const,
    name: "Anterior",
    photo: "data:image/png;base64,AA==",
    settings: legacy,
  };
  expect(() => validateProject(project)).not.toThrow();
  for (const frameTexture of ["unknown-texture", null, 1]) {
    const settings = { ...base, housing: { ...base.housing, frameTexture } };
    expect(() => validateSettings(settings as unknown as typeof base)).toThrow(
      /textura/,
    );
  }
});
