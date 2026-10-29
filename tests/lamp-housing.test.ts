import { expect, test } from "vitest";
import {
  defaults,
  createMesh,
  validateSettings,
  binarySTL,
} from "../src/features/lithophane/mesh";
import { defaultHousing } from "../src/features/lithophane/housing-config";
import {
  createHousingParts,
  housingLayout,
  housingPoint,
  housingPrintMesh,
} from "../src/features/lithophane/housing";
import { housingZIP } from "../src/features/lithophane/housing-export";
import { closed, materialAt } from "./mesh-assertions";

const base = {
  ...defaults,
  resolution: 40,
  housing: { ...defaultHousing, enabled: true },
};

test.each([0, 120])(
  "%s degree housing has separate closed pieces, cable access and free mating profiles",
  (angle) => {
    const s = { ...base, angle },
      l = housingLayout(s),
      parts = createHousingParts(s);
    expect(parts.map((p) => p.id)).toEqual(["body", "bezel", "lid"]);
    for (const part of parts) {
      closed(part);
      const print = housingPrintMesh(part, s);
      closed(print);
      let bottom = Infinity;
      for (let i = 2; i < print.positions.length; i += 3)
        bottom = Math.min(bottom, print.positions[i]);
      expect(bottom).toBeGreaterThanOrEqual(-0.0001);
      expect(bottom).toBeCloseTo(0, 3);
    }
    const [body, bezel, lid] = parts;
    const p = (u: number, y: number, d: number) =>
      housingPoint(u, y, d, l.radius);
    expect(materialAt(body, p(l.outerX - l.wall / 2, 0, l.back / 2))).toBe(
      true,
    );
    expect(materialAt(body, p(0, 0, l.back / 2))).toBe(false);
    expect(materialAt(body, p(0, -l.outerY + l.wall / 2, l.back + 6))).toBe(
      false,
    );
    expect(materialAt(body, p(8, -l.outerY + l.wall / 2, l.back + 6))).toBe(
      true,
    );
    expect(materialAt(bezel, p(0, 0, l.front + 1))).toBe(false);
    expect(materialAt(bezel, p(0, l.halfHeight - 1, l.front + 1))).toBe(true);
    expect(materialAt(lid, p(0, 0, l.back - 1))).toBe(true);
    // Photo thickness envelope stays clear of both the body and the front skirt.
    for (const u of [-l.halfWidth + 0.1, 0, l.halfWidth - 0.1]) {
      expect(materialAt(body, p(u, 0, s.max / 2))).toBe(false);
      expect(materialAt(bezel, p(u, 0, s.max / 2))).toBe(false);
    }
    for (const [part, d] of [
      [bezel, l.front - l.frontEngagement / 2],
      [lid, l.back + 1.5],
    ] as const) {
      const point = p(l.innerX - l.clearance / 2 - 0.7, 0, d);
      expect(materialAt(part, point)).toBe(true);
      expect(materialAt(body, point)).toBe(false);
    }
  },
  15000,
);

test.each([0.1, 0.6])(
  "thin photos retain clear front skirts at %s mm clearance",
  (clearance) => {
    const s = {
      ...base,
      angle: 0,
      min: 0.6,
      max: 1.2,
      housing: { ...base.housing, clearance },
    };
    const l = housingLayout(s),
      [body, bezel] = createHousingParts(s);
    expect(l.front - l.frontEngagement).toBeGreaterThan(-clearance / 2);
    const point = [
      l.innerX - clearance / 2 - 0.7,
      0,
      l.front - l.frontEngagement / 2,
    ];
    expect(materialAt(bezel, point)).toBe(true);
    expect(materialAt(body, point)).toBe(false);
  },
);

test("legacy panel-only and semicircle settings keep their original single panel", () => {
  expect(createHousingParts(defaults)).toEqual([]);
  expect(createHousingParts({ ...base, angle: 180 })).toEqual([]);
});

test("front skirt centers a thin photo edge even with maximum relief thickness", () => {
  const s = { ...base, angle: 0, min: 0.6, max: 5 };
  const l = housingLayout(s),
    [body, bezel] = createHousingParts(s);
  const point = [l.halfWidth + l.clearance / 2 + 0.2, 0, s.min * 0.75];
  expect(materialAt(bezel, point)).toBe(true);
  expect(materialAt(body, point)).toBe(false);
});

test("invalid box settings and an impossible curved radius are rejected", () => {
  for (const patch of [
    { depth: 5 },
    { depth: NaN },
    { clearance: 1 },
    { clearance: NaN },
  ])
    expect(() =>
      validateSettings({ ...base, housing: { ...base.housing, ...patch } }),
    ).toThrow();
  expect(() => createHousingParts({ ...base, width: 30 })).toThrow(/curvatura/);
});

test.each([true, false])(
  "ZIP contains four STL and honors the removable stand preference: %s",
  (printStand) => {
    const s = { ...base, angle: 0, printStand };
    const panel = createMesh(
      new Uint8ClampedArray([255, 255, 255, 255]),
      1,
      1,
      s,
    );
    const parts = createHousingParts(s);
    const buffer = housingZIP(panel, parts, s, "Foto");
    const view = new DataView(buffer),
      decoder = new TextDecoder();
    const files: { name: string; data: Uint8Array }[] = [];
    let cursor = 0;
    while (view.getUint32(cursor, true) === 0x04034b50) {
      const size = view.getUint32(cursor + 18, true),
        nameLength = view.getUint16(cursor + 26, true);
      const name = decoder.decode(
        new Uint8Array(buffer, cursor + 30, nameLength),
      );
      const data = new Uint8Array(buffer, cursor + 30 + nameLength, size);
      files.push({ name, data });
      cursor += 30 + nameLength + size;
    }
    expect(files.map((f) => f.name)).toEqual([
      "Foto-01-panel-litofania.stl",
      "Foto-02-caja-trasera.stl",
      "Foto-03-marco-frontal.stl",
      "Foto-04-tapa-trasera.stl",
      "Guia-de-armado.txt",
    ]);
    for (const file of files.slice(0, 4)) {
      const stl = new DataView(
        file.data.buffer,
        file.data.byteOffset,
        file.data.byteLength,
      );
      expect(file.data.byteLength).toBe(84 + stl.getUint32(80, true) * 50);
    }
    expect(decoder.decode(files[4].data)).toContain(
      "se retira para acceder a la luz",
    );
    if (printStand) {
      const stl = new DataView(
        files[0].data.buffer,
        files[0].data.byteOffset,
        files[0].data.byteLength,
      );
      expect(stl.getUint32(80, true)).toBeGreaterThan(panel.indices.length / 3);
      let bottom = Infinity,
        top = -Infinity;
      for (let i = 84; i < stl.byteLength; i += 50)
        for (let v = 0; v < 3; v++) {
          const z = stl.getFloat32(i + 12 + v * 12 + 8, true);
          bottom = Math.min(bottom, z);
          top = Math.max(top, z);
        }
      expect(bottom).toBeCloseTo(0, 4);
      expect(top).toBeCloseTo(s.height + 3, 4);
      expect(decoder.decode(files[4].data)).toContain("cortá los contactos");
    } else {
      expect(files[0].data).toEqual(
        new Uint8Array(binarySTL(panel.positions, panel.indices)),
      );
      expect(decoder.decode(files[4].data)).toContain(
        "Soporte de impresión desactivado",
      );
    }
  },
);
