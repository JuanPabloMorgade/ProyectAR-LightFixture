import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { frameTextures } from "../src/features/lithophane/frame-texture-config";
import { binarySTL, defaults } from "../src/features/lithophane/mesh";
import { defaultHousing } from "../src/features/lithophane/housing-config";
import {
  createHousingParts,
  housingLayout,
  housingPoint,
  housingPrintMesh,
} from "../src/features/lithophane/housing";
import { closed, materialAt } from "./mesh-assertions";

const additions = frameTextures.slice(4);
for (const mode of ["maximum", "minimum"] as const) {
  test.each(additions.map((t, index) => ({ ...t, index })))(
    `${mode} $label: rounded square/rectangle, zones, thickness and printable solids`,
    ({ value, index }) => {
      const settings = {
        ...defaults,
        width: index % 2 ? 80 : 40,
        height: 40,
        resolution: 40,
        angle: mode === "minimum" && index % 2 ? 90 : 0,
        housing: {
          ...defaultHousing,
          enabled: true,
          depth: 12,
          frameTexture: value,
          frameTextureArea:
            mode === "maximum"
              ? ("all" as const)
              : index % 2
                ? ("sides" as const)
                : ("front" as const),
          frameTextureScale: mode === "maximum" ? 0.75 : 2,
          frameTextureDepth: mode === "maximum" ? 0.6 : 0.15,
          frameCornerRounding: mode === "maximum" ? 100 : index % 2 ? 50 : 1,
        },
      };
      const parts = createHousingParts(settings),
        l = housingLayout(settings);
      const p = (u: number, y: number, z: number) =>
        housingPoint(u, y, z, l.radius);
      for (const part of parts) {
        closed(part);
        const printable = housingPrintMesh(part, settings);
        closed(printable);
        let bottom = Infinity;
        for (let i = 2; i < printable.positions.length; i += 3)
          bottom = Math.min(bottom, printable.positions[i]);
        expect(bottom).toBeCloseTo(0, 4);
        // Optional, reproducible real STL fixtures for external slicer QA.
        const output = process.env.PROYECTAR_TEXTURE_QA_DIR;
        if (output && mode === "maximum") {
          mkdirSync(output, { recursive: true });
          writeFileSync(
            join(output, `${value}-${part.id}.stl`),
            Buffer.from(binarySTL(printable.positions, printable.indices)),
          );
        }
      }
      // Functional skirt, photo opening, cable passage and worst-case wall cores.
      expect(
        materialAt(
          parts[1],
          p(
            l.innerX - l.clearance / 2 - 0.7,
            0,
            l.front - l.frontEngagement / 2,
          ),
        ),
      ).toBe(true);
      expect(
        materialAt(parts[2], p(0, -l.innerY + 10, l.back - l.wall / 2)),
      ).toBe(false);
      expect(materialAt(parts[1], p(0, 0, l.front + 1))).toBe(false);
      expect(
        materialAt(parts[0], p(l.outerX - l.wall / 2, 0, l.back / 2)),
      ).toBe(true);
      expect(materialAt(parts[2], p(0, l.halfHeight - 4, l.back - 1.2))).toBe(
        true,
      );
      if (settings.housing.frameTextureArea === "front") {
        const plain = createHousingParts({
          ...settings,
          housing: { ...settings.housing, frameTexture: "none" },
        });
        expect(parts[0]).toEqual(plain[0]);
        expect(parts[2]).toEqual(plain[2]);
      }
    },
    30000,
  );
}

test("recesses cannot cross the rear engraved mark floor", () => {
  // Regression: Low Poly used to move only the outer face through the mark.
  const settings = {
    ...defaults,
    width: 60,
    height: 40,
    housing: {
      ...defaultHousing,
      enabled: true,
      depth: 12,
      frameTexture: "low-poly" as const,
    },
  };
  closed(createHousingParts(settings)[2]);
});
