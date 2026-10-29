import { expect, test } from "vitest";
import { closed, materialAt } from "./mesh-assertions";
import { defaultBox, type WallMask } from "../src/features/shadowbox/engine";
import {
  defaultFabrication,
  fabricationParts,
  fabricationMesh,
  assemblyMesh,
  type Fabrication,
} from "../src/features/shadowbox/fabrication";
import {
  defaultModular,
  modularLayout,
  modularLightPosition,
  modularParts,
  modularPoint,
  modularGuide,
  validateModular,
} from "../src/features/shadowbox/modular";
import { assemblyPosition } from "../src/features/shadowbox/assembly";
import { buildSTLExport } from "../src/features/shadowbox/stl-export";

const s = { ...defaultBox, lightPercent: 50, detail: 96 };
const f: Fabrication = {
  ...defaultFabrication,
  illumination: "modular",
  modular: { ...defaultModular },
};
const masks: WallMask[] = (["top", "bottom", "left", "right"] as const).map(
  (face) => ({
    face,
    span: face === "top" || face === "bottom" ? s.width : s.height,
    depth: s.depth,
    columns: 8,
    rows: 5,
    cells: new Uint8Array(40),
  }),
);

test("actual solids leave the socket, cable route and rear ventilation open", () => {
  const l = modularLayout(s, f),
    parts = fabricationParts(masks, s, f);
  const base = parts.find((p) => p.id === "front")!,
    post = parts.find((p) => p.id === "post")!,
    head = parts.find((p) => p.id === "head")!;
  expect(materialAt(base, [l.width / 2, l.height / 2, s.thickness / 2])).toBe(
    true,
  );
  expect(materialAt(base, [l.width / 2, l.height / 2, s.thickness + 1])).toBe(
    false,
  );
  expect(
    materialAt(base, [l.width / 2 + 6, l.height / 2, s.thickness + 1]),
  ).toBe(true);
  expect(
    materialAt(base, [
      l.width / 2,
      l.height / 2 - l.socketOuter / 2 + 0.5,
      s.thickness + 1,
    ]),
  ).toBe(false);
  expect(materialAt(post, [5, 0.5, 1])).toBe(false);
  expect(materialAt(post, [5, 5, 8])).toBe(false);
  expect(materialAt(post, [1, 5, 8])).toBe(true);
  const mid = l.headWidth / 2;
  expect(materialAt(head, [mid + 4, mid + 4, 5.8])).toBe(false);
  expect(materialAt(head, [mid, mid, 3])).toBe(false);
  expect(materialAt(head, [mid + 6, mid, 3])).toBe(true);
  expect(materialAt(head, [mid + 3, mid + 3, 7.6])).toBe(false);
  const usb = { ...f, modular: { ...defaultModular, power: "usb" as const } };
  const ul = modularLayout(s, usb),
    ub = fabricationParts(masks, s, usb).find((p) => p.id === "front")!;
  expect(
    materialAt(ub, [
      ul.width / 2,
      ul.margin + defaultModular.cableDiameter / 2,
      0.7,
    ]),
  ).toBe(false);
});

test("small and large star boards retain a single closed head and cable clearance", () => {
  for (const starDiameter of [15, 40])
    for (const cableDiameter of [2, 6]) {
      const config = {
        ...f,
        modular: {
          ...defaultModular,
          starDiameter,
          cableDiameter,
          power: "usb" as const,
        },
      };
      for (const part of modularParts(s, config)) closed(part);
    }
});

test("AAA and USB produce the actual modular piece set, with closed connected oriented solids", () => {
  for (const power of ["aaa", "usb"] as const)
    for (const joints of [true, false]) {
      const config = { ...f, joints, modular: { ...defaultModular, power } };
      const parts = fabricationParts(masks, s, config);
      expect(parts).toHaveLength(power === "aaa" ? 8 : 7);
      expect(parts.map((p) => p.id)).toEqual([
        "top",
        "bottom",
        "left",
        "right",
        "front",
        "post",
        "head",
        ...(power === "aaa" ? ["battery-cover"] : []),
      ]);
      for (const p of parts) {
        closed(p);
        closed(assemblyMesh(p, s, config));
      }
    }
});

test("physical hardware does not scale with box size; emitter and post follow the optical position", () => {
  const before = structuredClone(s);
  const a = modularLayout(s, f),
    b = modularLayout({ ...s, width: 30, height: 25 }, f);
  expect(a.headWidth).toBe(b.headWidth);
  expect(a.batteryWidth).toBe(b.batteryWidth);
  expect(a.postLength).toBeCloseTo(b.postLength);
  const headTop = modularPoint(
    "head",
    a.headWidth / 2,
    a.headWidth / 2,
    5 + 2 + defaultModular.starThickness + defaultModular.emitterHeight,
    s,
    f,
  );
  const worldZ = s.depth + s.thickness / 20 - headTop[2] / 10;
  expect(worldZ).toBeCloseTo((s.depth * s.lightPercent) / 100);
  expect(headTop.slice(0, 2)).toEqual([0, 0]);
  expect(
    modularLayout({ ...s, lightPercent: 40 }, f).postLength,
  ).toBeGreaterThan(a.postLength);
  expect(s).toEqual(before);
  for (const id of ["post", "head", "battery-cover"] as const)
    expect(assemblyPosition(id, s, false)).toEqual([0, 0, s.depth]);
});

test("cover plug has clearance and headroom over the purchased holder", () => {
  const l = modularLayout(s, f),
    cover = modularParts(s, f).find((p) => p.id === "battery-cover")!;
  const points = [];
  for (let i = 0; i < cover.positions.length; i += 3)
    points.push(
      modularPoint(
        "battery-cover",
        cover.positions[i],
        cover.positions[i + 1],
        cover.positions[i + 2],
        s,
        f,
      ),
    );
  expect(Math.min(...points.map((p) => p[2]))).toBeGreaterThan(
    s.thickness + defaultModular.holderHeight,
  );
  const skirtOuterWidth = l.batteryWidth - 4 - f.clearance;
  expect(l.batteryWidth - 4 - skirtOuterWidth).toBeCloseTo(f.clearance);
});

test("rejects invalid/imported hardware, box collisions and insufficient optical depth without silent repair", () => {
  for (const patch of [
    { power: "bad" },
    { starDiameter: NaN },
    { holderHeight: -2 },
    { emitterHeight: Infinity },
    { cableDiameter: 9 },
  ])
    expect(() =>
      validateModular({ ...defaultModular, ...patch } as typeof defaultModular),
    ).toThrow();
  expect(() => modularLayout({ ...s, width: 6, height: 6 }, f)).toThrow(
    /portapilas/,
  );
  expect(() => modularLayout({ ...s, lightPercent: 95 }, f)).toThrow(
    /posición de luz/,
  );
  expect(() => modularLayout({ ...s, thickness: 0.8 }, f)).toThrow(/1,2 mm/);
  const n = modularLightPosition(defaultBox, f);
  expect(() =>
    modularLayout({ ...defaultBox, lightPercent: n }, f),
  ).not.toThrow();
  expect(defaultBox.lightPercent).toBe(85);
});

test("combined STL and ZIP match selected supply and contain full assembly instructions", () => {
  for (const power of ["aaa", "usb"] as const) {
    const config = { ...f, modular: { ...defaultModular, power } },
      count = power === "aaa" ? 8 : 7;
    const combined = buildSTLExport({
      settings: s,
      masks,
      mode: "combined",
      name: "Prueba",
      fabrication: config,
    });
    expect(combined.filename).toBe(`Prueba-${count}-piezas.stl`);
    expect(new DataView(combined.buffer).getUint32(80, true)).toBe(
      combined.triangles,
    );
    const mesh = fabricationMesh(masks, s, config);
    expect(combined.triangles).toBe(mesh.indices.length / 3);
    const zip = buildSTLExport({
      settings: s,
      masks,
      mode: "separate",
      name: "Prueba",
      fabrication: config,
    });
    const text = new TextDecoder().decode(zip.buffer);
    expect(text).toContain("06-poste-hueco.stl");
    expect(text).toContain("07-cabezal-estrella.stl");
    expect(text.includes("08-tapa-3-AAA.stl")).toBe(power === "aaa");
    expect(text).toContain(
      power === "aaa" ? "3 pilas AAA alcalinas" : "USB regulado de 5 V",
    );
    expect(text).toContain("10 Ω / 5 W");
    expect(text).toContain("No conectes USB a las pilas");
    expect(modularGuide(s, config).join(" ")).toContain(
      "no incluye la oclusión",
    );
  }
});
