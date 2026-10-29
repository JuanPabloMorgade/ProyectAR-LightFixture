import { expect, test } from "vitest";
import {
  defaultBox,
  IMAGE_SIZE,
  masksFromImage,
  type WallMask,
} from "../src/features/shadowbox/engine";
import { currentFabrication } from "../src/features/shadowbox/editor-defaults";
import {
  assemblyMesh,
  fabricationParts,
  fabricationPoint,
  lightingLayout,
} from "../src/features/shadowbox/fabrication";
import {
  cablePassage,
  enclosureLayout,
  enclosureParts,
  defaultEnclosure,
} from "../src/features/shadowbox/enclosure";
import { defaultCob } from "../src/features/shadowbox/cob";
import { modularLayout, modularPoint } from "../src/features/shadowbox/modular";
import {
  assemblySequence,
  assemblyPlacement,
} from "../src/features/shadowbox/assembly";
import { buildSTLExport } from "../src/features/shadowbox/stl-export";
import { closed, materialAt } from "./mesh-assertions";

const s = { ...defaultBox, lightPercent: 50, detail: 96 };
const masks: WallMask[] = (["top", "bottom", "left", "right"] as const).map(
  (face) => ({
    face,
    span: 15,
    depth: 6,
    columns: 8,
    rows: 5,
    cells: new Uint8Array(40),
  }),
);
// Regression coverage for saved v2 front-attached enclosures. New wall-mounted models are tested in wallmount.test.ts.
const led = { ...currentFabrication(), enclosure: { depth: 24 } };
const usb = { ...led, modular: { ...led.modular!, power: "usb" as const } };
const cob = { ...led, illumination: "cob" as const, cob: { ...defaultCob } };

test("separate light plate, electronics and outer face are closed independent solids for both light modes", () => {
  for (const config of [led, usb, cob])
    for (const joints of [false, true]) {
      const f = { ...config, joints };
      const parts = fabricationParts(masks, s, f);
      expect(parts).toHaveLength(config.illumination === "cob" ? 7 : 9);
      expect(parts.map((p) => p.id)).toContain("electronics");
      expect(parts.map((p) => p.id)).toContain("face");
      expect(parts.map((p) => p.id)).not.toContain("battery-cover");
      expect(parts.find((p) => p.id === "front")!.filename).toBe(
        "05-placa-portaluces",
      );
      for (const part of parts) {
        closed(part);
        closed(assemblyMesh(part, s, f));
      }
    }
});

test("electronics and opaque face are toward the person; light and patterns remain toward the rear wall", () => {
  const parts = fabricationParts(masks, s, led),
    l = enclosureLayout(s, led),
    opticalFront = s.depth * 10 + s.thickness / 2;
  const bounds = (id: string) => {
    const p = parts.find((p) => p.id === id)!,
      m = assemblyMesh(p, s, led),
      zs = [];
    for (let i = 2; i < m.positions.length; i += 3)
      zs.push(m.positions[i] * 10 + s.depth * 10);
    return { min: Math.min(...zs), max: Math.max(...zs) };
  };
  expect(bounds("front").max).toBeCloseTo(opticalFront);
  expect(bounds("electronics").min).toBeCloseTo(opticalFront);
  expect(bounds("face").max).toBeCloseTo(l.outerFace);
  expect(bounds("face").min).toBeGreaterThan(bounds("electronics").min);
  const ml = modularLayout(s, led);
  const emitter = modularPoint(
    "head",
    ml.headWidth / 2,
    ml.headWidth / 2,
    7 + led.modular!.starThickness + led.modular!.emitterHeight,
    s,
    led,
  );
  expect(s.depth * 10 + s.thickness / 2 - emitter[2]).toBeCloseTo(
    (s.depth * 10 * s.lightPercent) / 100,
  );
  expect(bounds("post").max).toBeLessThan(opticalFront);
});

test("cable holes align through both separating plates and avoid COB beds", () => {
  for (const f of [led, cob]) {
    const l = enclosureLayout(s, f),
      p = cablePassage(s, f),
      parts = fabricationParts(masks, s, f);
    const plate = parts.find((x) => x.id === "front")!,
      box = parts.find((x) => x.id === "electronics")!;
    const x = l.width / 2 + p.x,
      y = l.height / 2 + p.y;
    expect(materialAt(plate, [x, y, s.thickness / 2])).toBe(false);
    expect(materialAt(box, [x, y, 1])).toBe(false);
    const a = fabricationPoint("front", x, y, 0, s, f),
      b = fabricationPoint("electronics", x, y, 0, s, f);
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i]));
    expect(materialAt(box, [l.width / 2, 1, 4])).toBe(false); // external cable inlet
  }
});

test("changing electronics depth preserves masks, optical source and post length", () => {
  const deeper = { ...led, enclosure: { depth: 40 } };
  expect(modularLayout(s, deeper).postLength).toBeCloseTo(
    modularLayout(s, led).postLength,
  );
  expect(modularLayout(s, deeper).emitterLocal).toBeCloseTo(
    modularLayout(s, led).emitterLocal,
  );
  const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  image.fill(255, 0, image.length / 3);
  const before = masksFromImage(image, s);
  lightingLayout(s, deeper);
  expect(masksFromImage(image, s)).toEqual(before);
  expect(
    enclosureLayout(s, deeper).outerFace - enclosureLayout(s, led).outerFace,
  ).toBe(16);
});

test("outer cover skirt clears electronics walls and the configured holder", () => {
  const l = enclosureLayout(s, led),
    cover = enclosureParts(s, led).find((p) => p.id === "face")!;
  const p = fabricationPoint("face", l.width / 2, l.height / 2, 5, s, led);
  expect(p[2] * 10).toBeGreaterThan(
    s.thickness / 2 + 2 + led.modular!.holderHeight,
  );
  const body = enclosureParts(s, led).find((p) => p.id === "electronics")!;
  for (let i = 0; i < cover.positions.length; i += 3) {
    const z = cover.positions[i + 2];
    if (z <= 2) continue;
    const x = cover.positions[i],
      y = cover.positions[i + 1],
      localZ = l.depth + 2 - z;
    // Samples just inside the skirt volume must remain outside the box wall solid.
    const sx = x < l.width / 2 ? x + 0.01 : x - 0.01,
      sy = y < l.height / 2 ? y + 0.01 : y - 0.01;
    expect(materialAt(body, [sx, sy, localZ + 0.01])).toBe(false);
  }
});

test("rejects electronics that do not fit, exports separate pieces, and closes the face after installing light", () => {
  expect(() => lightingLayout(s, { ...led, enclosure: { depth: 12 } })).toThrow(
    /portapilas/,
  );
  expect(() =>
    lightingLayout(s, { ...led, enclosure: { depth: NaN } }),
  ).toThrow(/profundidad/);
  expect(() =>
    lightingLayout(s, {
      ...led,
      enclosure: { ...defaultEnclosure },
      modular: { ...led.modular!, holderWidth: 80 },
    }),
  ).toThrow();
  for (const f of [led, cob]) {
    const seq = assemblySequence(f);
    expect(seq.steps).toHaveLength(10);
    expect(assemblyPlacement("face", f)).toBeGreaterThan(seq.lightStep);
    expect(seq.steps[seq.resultStep].title).toContain("sombra detrás");
    const result = buildSTLExport({
      settings: s,
      masks,
      mode: "separate",
      name: "Nuevo",
      fabrication: f,
    });
    const text = new TextDecoder().decode(result.buffer);
    expect(text).toContain("05-placa-portaluces.stl");
    expect(text).toContain("caja-electronica.stl");
    expect(text).toContain("tapa-exterior.stl");
    expect(text).toContain("FRENTE HACIA LA PERSONA");
    expect(text).not.toContain("08-tapa-3-AAA.stl");
  }
});
