import { expect, test } from "vitest";
import {
  frameTextures,
  textureProfile,
  texturesInCategory,
  textureSamplingStep,
} from "../src/features/lithophane/frame-texture-config";
import {
  surfaceTextureDepth,
  frameTextureGuide,
} from "../src/features/lithophane/frame-texture";
import { validateProject } from "../src/features/lithophane/projects";
import { defaults } from "../src/features/lithophane/mesh";
import { defaultHousing } from "../src/features/lithophane/housing-config";

test.each(frameTextures.filter((t) => t.value !== "none"))(
  "$label: deterministic bounded continuous profile, scale, presets and project round trip",
  ({ value }) => {
    const values: number[] = [];
    for (let y = -23; y <= 23; y += 1.13)
      for (let x = -23; x <= 23; x += 0.89) {
        const h = textureProfile(value, x, y);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(1);
        expect(textureProfile(value, x, y)).toBe(h);
        // Detect discontinuities, including cell and triangle boundaries.
        expect(
          Math.abs(textureProfile(value, x + 1e-6, y - 1e-6) - h),
        ).toBeLessThan(0.0001);
        for (const scale of [0.75, 2])
          expect(
            textureProfile(value, x * scale, y * scale, scale),
          ).toBeCloseTo(h, 10);
        values.push(h);
      }
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.5);
    const x = 3.13,
      y = 7.57;
    for (const depth of [0.15, 0.2, 0.4, 0.6]) {
      expect(
        surfaceTextureDepth(value, x, y, 3, { frameTextureDepth: depth }),
      ).toBeCloseTo(depth * textureProfile(value, x, y));
      expect(
        surfaceTextureDepth(value, x, y, 0.8, { frameTextureDepth: depth }),
      ).toBe(0);
    }
    const project = {
      version: 1 as const,
      name: "Textura",
      photo: "data:image/png;base64,AA==",
      settings: {
        ...defaults,
        housing: {
          ...defaultHousing,
          enabled: true,
          frameTexture: value,
          frameTextureScale: 1.35,
          frameTextureDepth: 0.35,
          frameCornerRounding: 63,
        },
      },
    };
    const recovered = JSON.parse(JSON.stringify(project));
    expect(() => validateProject(recovered)).not.toThrow();
    expect(recovered).toEqual(project);
  },
);

test("legacy height fields stay exactly unchanged", () => {
  for (const texture of ["lines", "waves", "dots"] as const)
    for (const scale of [0.75, 1, 2])
      for (let x = -15; x < 15; x += 0.37) {
        const u = x / scale,
          v = (x * 1.7) / scale;
        const wrap = (n: number) => n - 5 * Math.round(n / 5);
        const distance =
          texture === "dots"
            ? Math.hypot(wrap(u), wrap(v))
            : Math.abs(
                wrap(
                  texture === "waves"
                    ? u + 1.4 * Math.sin(v / 4)
                    : (u + v) / Math.SQRT2,
                ),
              );
        const old =
          distance < 1.2 ? (1 + Math.cos((Math.PI * distance) / 1.2)) / 2 : 0;
        expect(textureProfile(texture, x, x * 1.7, scale)).toBe(old);
      }
});

test("categories overlap without duplicates; filters never rewrite texture settings", () => {
  expect(texturesInCategory("all")).toHaveLength(frameTextures.length);
  expect(texturesInCategory("minimal").map((t) => t.value)).toEqual([
    "none",
    "lines",
    "waves",
    "dots",
  ]);
  expect(texturesInCategory("organic").map((t) => t.value)).toContain(
    "topographic",
  );
  expect(new Set(frameTextures.map((t) => t.value)).size).toBe(
    frameTextures.length,
  );
});

test("hexagonal regular cells, planar Low Poly facets and crossing diamond grooves", () => {
  expect(textureProfile("hexagonal", 0, 0)).toBe(0);
  expect(textureProfile("hexagonal", 4, 0)).toBeCloseTo(1);
  expect(textureProfile("hexagonal", 2, Math.sqrt(3) * 2)).toBeCloseTo(1);
  for (const [x, y] of [
    [0.3, 2.9],
    [5.4, 3.8],
  ]) {
    expect(textureProfile("hexagonal", x, y)).toBeCloseTo(
      textureProfile("hexagonal", x + 4, y + 4 * Math.sqrt(3)),
    );
  }
  const h = (x: number, y: number) => textureProfile("low-poly", x, y);
  expect(h(4, 1)).toBeCloseTo((h(3, 1) + h(5, 1)) / 2, 12);
  expect(h(1, 4)).toBeCloseTo((h(1, 3) + h(1, 5)) / 2, 12);
  for (const x of [1, 2, 6]) {
    expect(textureProfile("diamond", x, x)).toBe(1);
    expect(textureProfile("diamond", x, -x)).toBe(1);
  }
});

test("organic cache eviction and cell boundaries cannot change a saved pattern", () => {
  for (const texture of ["voronoi", "hammered"] as const) {
    const samples = [
      [-8, 0],
      [8, 8],
      [5.5, -5.5],
      [-32, 16],
      [0, 0],
      [43.12, -17.38],
    ];
    const before = samples.map(([x, y]) => textureProfile(texture, x, y));
    for (let i = 0; i < 600; i++) textureProfile(texture, i * 31, i * 23);
    expect(samples.map(([x, y]) => textureProfile(texture, x, y))).toEqual(
      before,
    );
    for (const [x, y] of samples) {
      expect(
        Math.abs(
          textureProfile(texture, x - 1e-6, y) -
            textureProfile(texture, x + 1e-6, y),
        ),
      ).toBeLessThan(0.0001);
    }
  }
  for (const r of [0, 5, 10])
    expect(textureProfile("concentric", r, 0)).toBeCloseTo(1);
  expect(textureProfile("concentric", 3, 4)).toBeCloseTo(1);
  expect(textureProfile("concentric", 3, 4)).not.toBeCloseTo(
    textureProfile("waves", 3, 4),
  );
});

test("sampling preserves legacy meshes and resolves small new patterns", () => {
  expect(textureSamplingStep("waves", 0.75)).toBe(0.5);
  expect(textureSamplingStep("hexagonal", 0.75)).toBeCloseTo(0.2625);
  expect(textureSamplingStep("wood", 1)).toBe(0.35);
  expect(textureSamplingStep("voronoi", 2)).toBe(0.5);
});

test("the exported guide warns about Voronoi lid supports only when the rear is textured", () => {
  expect(frameTextureGuide("voronoi", { frameTextureArea: "all" })).toContain(
    "soportes automáticos",
  );
  expect(
    frameTextureGuide("voronoi", { frameTextureArea: "front" }),
  ).not.toContain("zonas suspendidas");
  expect(frameTextureGuide("hexagonal")).not.toContain("zonas suspendidas");
});
