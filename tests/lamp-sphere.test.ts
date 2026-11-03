import { expect, test } from "vitest";
import {
  createMesh,
  defaults,
  validateSettings,
} from "../src/features/lithophane/mesh";
import {
  sphereForPrinting,
  sphereNeckY,
  spherePhotoLatitude,
  sphereNeck,
  SPHERE_NECK_HEIGHT,
  DEFAULT_OPENING_DIAMETER,
  sphereGrid,
  SPHERE_ULTRA_RESOLUTION,
} from "../src/features/lithophane/sphere";
import { binarySTL } from "../src/features/lithophane/mesh";
import { sphereZIP } from "../src/features/lithophane/sphere-export";
import { createHousingParts } from "../src/features/lithophane/housing";
import { hasPrintStand } from "../src/features/lithophane/print-stand";
import { closed, materialAt } from "./mesh-assertions";

const photo = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);

test("Ultra samples an 80 mm sphere near 0.2 mm in both axes and exports the full grid", () => {
  const s = {
    ...defaults,
    shape: "sphere" as const,
    width: 80,
    resolution: SPHERE_ULTRA_RESOLUTION,
  };
  const grid = sphereGrid(s);
  expect(grid.horizontalStep).toBeLessThanOrEqual(0.2);
  expect(grid.verticalStep).toBeLessThanOrEqual(0.2);
  expect(grid.cols).toBe(1280);
  const mesh = createMesh(photo, 2, 1, s);
  const triangles = 4 * grid.cols * (grid.rows + 7);
  expect(mesh.positions.length / 3).toBe(2 * (1 + grid.cols * (grid.rows + 7)));
  expect(mesh.indices.length / 3).toBe(triangles);
  expect(mesh.positions.every(Number.isFinite)).toBe(true);
  const stl = binarySTL(mesh.positions, mesh.indices);
  expect(new DataView(stl).getUint32(80, true)).toBe(triangles);
  expect(stl.byteLength).toBe(84 + triangles * 50);
  expect(() => validateSettings({ ...s, resolution: 641 })).toThrow();
  expect(() => validateSettings({ ...s, shape: "panel" })).toThrow();
});

test.each([30, 120])(
  "outward relief stays within the %s mm body diameter at extreme thicknesses",
  (width) => {
    const s = {
      ...defaults,
      shape: "sphere" as const,
      width,
      min: 0.6,
      max: 5,
      resolution: 40,
    };
    for (const invert of [false, true]) {
      const mesh = createMesh(photo, 2, 1, { ...s, invert });
      closed(mesh);
      // Six neck rings follow the spherical body; the neck deliberately extends above it.
      const bodyVertices = mesh.positions.length / 6 - 6 * 80;
      for (let i = 0; i < bodyVertices; i++)
        expect(
          Math.hypot(...mesh.positions.slice(i * 3, (i + 1) * 3)),
        ).toBeLessThanOrEqual(width / 2 + 1e-5);
    }
  },
);

test.each([30, 80, 250])(
  "a %s mm sphere has a closed bottom and open reinforced neck",
  (width) => {
    const s = {
      ...defaults,
      shape: "sphere" as const,
      width,
      resolution: 40,
      housing: { enabled: true, depth: 25, clearance: 0.3 },
    };
    const mesh = createMesh(photo, 2, 1, s);
    closed(mesh);
    const print = sphereForPrinting(mesh);
    closed(print);
    const r = width / 2;
    // Hollow center and open neck, but the former bottom opening is closed.
    expect(materialAt(mesh, [0, 0, 0])).toBe(false);
    expect(materialAt(mesh, [0, sphereNeckY(s) + 2, 0])).toBe(false);
    const bottom = Math.sqrt(r * r - 9);
    expect(materialAt(mesh, [0, -bottom + 0.2, 0])).toBe(true);
    const wall = sphereNeck(s).inner + 1;
    expect(materialAt(mesh, [wall, sphereNeckY(s) + 2, 0])).toBe(true);
    expect(materialAt(mesh, [wall, sphereNeckY(s) + 6, 0])).toBe(true);
    expect(materialAt(mesh, [-r + 0.3, 0, 0])).toBe(true);
    expect(materialAt(mesh, [r - 0.3, 0, 0])).toBe(false);
    expect(materialAt(mesh, [r + 0.3, 0, 0])).toBe(false);
    let low = Infinity;
    for (let i = 2; i < print.positions.length; i += 3)
      low = Math.min(low, print.positions[i]);
    expect(low).toBeCloseTo(0, 4);
    expect(hasPrintStand(s)).toBe(false);
    expect(createHousingParts(s)).toEqual([]);
  },
);

test("photo contrast and inversion change the sphere's radial thickness", () => {
  const s = { ...defaults, shape: "sphere" as const, resolution: 40 };
  const mesh = createMesh(photo, 2, 1, s);
  const inverted = createMesh(photo, 2, 1, { ...s, invert: true });
  const n = mesh.positions.length / 6;
  const vertex = 16 * 80 + 10;
  const thickness = (positions: Float32Array) =>
    Math.hypot(
      ...[0, 1, 2].map(
        (axis) =>
          positions[vertex * 3 + axis] - positions[(vertex + n) * 3 + axis],
      ),
    );
  expect(thickness(mesh.positions)).toBeCloseTo(s.max, 3);
  expect(thickness(inverted.positions)).toBeCloseTo(s.min, 3);
  expect(mesh.positions.slice(n * 3)).toEqual(inverted.positions.slice(n * 3));
  const radial = (positions: Float32Array, i: number) =>
    Math.hypot(...positions.slice(i * 3, (i + 1) * 3));
  expect(radial(mesh.positions, vertex)).toBeCloseTo(s.width / 2, 3);
  expect(radial(inverted.positions, vertex)).toBeCloseTo(
    s.width / 2 - s.max + s.min,
    3,
  );
  expect(radial(mesh.positions, vertex + n)).toBeCloseTo(
    s.width / 2 - s.max,
    3,
  );
  expect(() =>
    validateSettings({ ...s, shape: "invalid" as "sphere" }),
  ).toThrow();
});

test.each([8, 22, 30])(
  "a %s mm opening remains unobstructed and changes the actual neck mesh",
  (sphereOpeningDiameter) => {
    const s = {
      ...defaults,
      shape: "sphere" as const,
      resolution: 40,
      sphereOpeningDiameter,
    };
    const mesh = createMesh(photo, 2, 1, s);
    closed(mesh);
    const y = sphereNeckY(s) + 5;
    expect(materialAt(mesh, [sphereOpeningDiameter / 2 - 0.2, y, 0])).toBe(
      false,
    );
    expect(materialAt(mesh, [sphereOpeningDiameter / 2 + 0.5, y, 0])).toBe(
      true,
    );
    for (const invalid of [7, 31, NaN])
      expect(() =>
        validateSettings({ ...s, sphereOpeningDiameter: invalid }),
      ).toThrow();
    expect(() =>
      validateSettings({ ...s, width: 30, sphereOpeningDiameter: 30 }),
    ).toThrow(/al menos 38 mm/);
  },
);

test("the reference profile has a smooth shoulder, outer lip and flared entrance", () => {
  expect(DEFAULT_OPENING_DIAMETER).toBe(22);
  const s = { ...defaults, shape: "sphere" as const, resolution: 40 };
  const mesh = createMesh(photo, 2, 1, s);
  const neck = sphereNeck(s),
    base = sphereNeckY(s);
  // Straight neck below the lip; the lip projects outward, never into the bore.
  expect(materialAt(mesh, [neck.outer + 0.5, base + 3, 0])).toBe(false);
  expect(materialAt(mesh, [neck.outer + 0.5, base + 6, 0])).toBe(true);
  expect(materialAt(mesh, [neck.inner - 0.2, base + 6, 0])).toBe(false);
  const n = mesh.positions.length / 6;
  const top = (n - 1) * 3;
  expect(mesh.positions[top + 1]).toBeCloseTo(base + SPHERE_NECK_HEIGHT, 4);
  expect(Math.hypot(mesh.positions[top], mesh.positions[top + 2])).toBeCloseTo(
    neck.outer + 0.5,
    4,
  );
  expect(
    Math.hypot(mesh.positions[top + n * 3], mesh.positions[top + n * 3 + 2]),
  ).toBeCloseTo(neck.inner + 0.5, 4);
  // The smooth cap begins at 55 degrees and runs straight to the neck.
  const shoulder = (1 + 32 * 80) * 3;
  expect(mesh.positions[shoulder + 1]).toBeCloseTo(
    (s.width / 2) * Math.sin((55 * Math.PI) / 180),
    4,
  );
});

test("sphere ZIP contains two oriented STL and the LED, attachment and image guidance", () => {
  const s = {
    ...defaults,
    shape: "sphere" as const,
    resolution: 40,
    sphereOpeningDiameter: 24,
  };
  const mesh = createMesh(photo, 2, 1, s);
  const buffer = sphereZIP(mesh, s, "Navidad");
  const view = new DataView(buffer),
    decoder = new TextDecoder();
  const files: { name: string; data: Uint8Array }[] = [];
  let cursor = 0;
  while (view.getUint32(cursor, true) === 0x04034b50) {
    const size = view.getUint32(cursor + 18, true),
      length = view.getUint16(cursor + 26, true);
    files.push({
      name: decoder.decode(new Uint8Array(buffer, cursor + 30, length)),
      data: new Uint8Array(buffer, cursor + 30 + length, size),
    });
    cursor += 30 + length + size;
  }
  expect(files.map((file) => file.name)).toEqual([
    "Navidad-01-esfera.stl",
    "Navidad-02-tapa.stl",
    "Guia-de-armado.txt",
  ]);
  for (const file of files.slice(0, 2)) {
    const stl = new DataView(
      file.data.buffer,
      file.data.byteOffset,
      file.data.byteLength,
    );
    expect(stl.byteLength).toBe(84 + 50 * stl.getUint32(80, true));
    let bottom = Infinity;
    for (let i = 84; i < stl.byteLength; i += 50)
      for (let vertex = 0; vertex < 3; vertex++)
        bottom = Math.min(bottom, stl.getFloat32(i + 20 + vertex * 12, true));
    expect(bottom).toBeCloseTo(0, 4);
  }
  const guide = decoder.decode(files[2].data);
  for (const text of [
    "Abertura superior libre de Ø24 mm",
    "1500 × 417 px",
    "polos quedan lisos, sin imagen",
    "el color frío no garantiza",
    "nunca del cable eléctrico",
    "La tapa no es un enganche de suspensión",
    "ranura lateral de 4 mm",
    "Relieve de la foto en el exterior",
  ])
    expect(guide).toContain(text);
});

test.each([30, 150])(
  "a %s mm sphere keeps both polar caps independent of photo and inversion",
  (width) => {
    const s = { ...defaults, width, shape: "sphere" as const, resolution: 40 };
    const black = new Uint8ClampedArray([0, 0, 0, 255]);
    const dark = createMesh(black, 1, 1, s);
    const light = createMesh(black, 1, 1, { ...s, invert: true });
    const n = dark.positions.length / 6;
    expect(dark.positions.slice(n * 3)).toEqual(light.positions.slice(n * 3));
    let north = 0,
      south = 0,
      image = 0;
    for (let i = 0; i < n; i++) {
      const latitude = Math.atan2(
        dark.positions[i * 3 + 1],
        Math.hypot(dark.positions[i * 3], dark.positions[i * 3 + 2]),
      );
      const a = Array.from(dark.positions.slice(i * 3, (i + 1) * 3));
      const b = Array.from(light.positions.slice(i * 3, (i + 1) * 3));
      if (Math.abs(latitude) >= spherePhotoLatitude(s)) {
        expect(a).toEqual(b);
        if (latitude > 0) north++;
        else south++;
      } else if (Math.abs(latitude) < 0.3) {
        expect(a).not.toEqual(b);
        image++;
      }
    }
    expect(north).toBeGreaterThan(0);
    expect(south).toBeGreaterThan(0);
    expect(image).toBeGreaterThan(0);
  },
);
