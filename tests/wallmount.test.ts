import { expect, test } from "vitest";
import {
  defaultBox,
  IMAGE_SIZE,
  wallToImage,
  imageToWall,
  sourceDistance,
  masksFromImage,
  type WallMask,
} from "../src/features/shadowbox/engine";
import { currentFabrication } from "../src/features/shadowbox/editor-defaults";
import {
  fabricationParts,
  assemblyMesh,
  fabricationPoint,
  lightingLayout,
} from "../src/features/shadowbox/fabrication";
import { projectionSettings } from "../src/features/shadowbox/projection-settings";
import {
  wallMountLayout,
  wallMountPoint,
  wallPartCount,
} from "../src/features/shadowbox/wallmount";
import {
  assemblyPosition,
  assemblySequence,
  assemblyPlacement,
} from "../src/features/shadowbox/assembly";
import { buildSTLExport } from "../src/features/shadowbox/stl-export";
import { cobLayout, defaultCob } from "../src/features/shadowbox/cob";
import { closed, materialAt } from "./mesh-assertions";
import {
  wallSeatTabs,
  wallSeatFit,
  BATTERY_DOOR_TOP,
} from "../src/features/shadowbox/wall-seat";

const raw = { ...defaultBox, lightPercent: 50, detail: 96 };
const led = currentFabrication();
const usb = { ...led, modular: { ...led.modular!, power: "usb" as const } };
const cob = { ...led, illumination: "cob" as const, cob: { ...defaultCob } };
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
const art = () => {
  const a = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4);
  for (let y = 0; y < IMAGE_SIZE; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const k = (y * IMAGE_SIZE + x) * 4,
        v = x > 70 && x < 200 && y > 60 && y < 340 ? 255 : 0;
      a[k] = a[k + 1] = a[k + 2] = v;
      a[k + 3] = 255;
    }
  return a;
};

test.each([
  { clearance: 0.1, thickness: 1.2, f: usb },
  { clearance: 0.8, thickness: 3, f: led },
])(
  "single base collar has eight slim ribs received by inner wall grooves ($clearance mm / $thickness mm)",
  ({ clearance, thickness, f: original }) => {
    const f = { ...original, clearance };
    const s = projectionSettings(
      { ...raw, thickness, width: 16, height: 14 },
      f,
    );
    const l = wallMountLayout(s, f),
      fit = wallSeatFit(thickness, clearance);
    const parts = fabricationParts(masksFromImage(art(), s), s, f);
    const base = parts.find((p) => p.id === "base")!;
    closed(base);
    // There is no second tall perimeter outside the collar.
    expect(materialAt(base, [0.5, l.height / 2, 10])).toBe(false);
    expect(materialAt(base, [l.enclosureInset + 1, l.height / 2, 10])).toBe(
      true,
    );
    for (const face of ["top", "bottom", "left", "right"] as const) {
      const panel = parts.find((p) => p.id === face)!;
      closed(panel);
      const horizontal = face === "top" || face === "bottom";

      const span = (horizontal ? s.width : s.height) * 10;
      const origin = assemblyPosition(face, s, false);
      for (const [a, b] of wallSeatTabs(span)) {
        expect(b - a).toBeCloseTo(1.2);
        const x = (a + b) / 2 + thickness / 2;
        const y = 10 - l.panelStart;
        const z = thickness - fit.engagement / 2;
        const point = fabricationPoint(face, x, y, z, s, f).map(
          (v, i) =>
            (v + origin[i]) * 10 +
            (i === 0 ? l.width / 2 : i === 1 ? l.height / 2 : 0),
        );
        expect(materialAt(base, point), `${face} has a raised rib`).toBe(true);
        expect(materialAt(panel, [x, y, z]), `${face} groove clears rib`).toBe(
          false,
        );
        expect(
          materialAt(panel, [x, y, 0.2]),
          "outer skin closes the groove",
        ).toBe(true);
        expect(
          materialAt(panel, [x + 2, y, z]),
          "material next to the narrow groove",
        ).toBe(true);
      }
    }
  },
  15000,
);

test("disabling joints omits guide ribs while walls still sleeve over the single collar", () => {
  const f = { ...usb, joints: false };
  const s = projectionSettings(raw, f),
    l = wallMountLayout(s, f);
  const parts = fabricationParts(masksFromImage(art(), s), s, f);
  const base = parts.find((p) => p.id === "base")!;
  expect(materialAt(base, [0.5, l.height / 2, 10])).toBe(false);
  for (const panel of parts.filter((p) =>
    ["top", "bottom", "left", "right"].includes(p.id),
  )) {
    let min = Infinity;
    for (let i = 1; i < panel.positions.length; i += 3)
      min = Math.min(min, panel.positions[i]);
    expect(min).toBeCloseTo(l.floor + f.clearance / 2 - l.panelStart);
  }
});

test.each([
  { mode: "AAA", f: led },
  { mode: "USB", f: usb },
  { mode: "COB", f: cob },
])(
  "wall-mounted $mode exports closed connected printable parts in the correct stack",
  ({ f }) => {
    const s = projectionSettings(raw, f),
      parts = fabricationParts(masks, s, f);
    expect(parts).toHaveLength(wallPartCount(f));
    expect(parts.map((p) => p.id)).toEqual([
      "top",
      "bottom",
      "left",
      "right",
      "front",
      "base",
      "separator",
      ...(f.illumination === "modular"
        ? [
            "post",
            "head",
            ...(f.modular!.power === "aaa" ? ["battery-cover"] : []),
          ]
        : []),
    ]);
    for (const part of parts) {
      closed(part);
      closed(assemblyMesh(part, s, f));
    }
    expect(parts.find((p) => p.id === "front")!.filename).toBe(
      "05-embellecedor",
    );
    expect(parts.find((p) => p.id === "base")!.filename).toBe("06-base-pared");
  },
  15000,
); // Curved surfaces require more manifold-edge checks than rectilinear fixtures.

test("keyhole is open through the reinforced rear pad; battery cover and separator leave wiring access", () => {
  const s = projectionSettings(raw, led),
    l = wallMountLayout(s, led),
    parts = fabricationParts(masks, s, led);
  const base = parts.find((p) => p.id === "base")!,
    cover = parts.find((p) => p.id === "battery-cover")!,
    sep = parts.find((p) => p.id === "separator")!;
  expect(materialAt(base, [l.width / 2, l.hookY - 4, 1])).toBe(false);
  expect(materialAt(base, [l.width / 2, l.hookY + 7, 3])).toBe(false);
  expect(materialAt(base, [l.width / 2 + l.neck / 2 + 1, l.hookY + 7, 3])).toBe(
    true,
  );
  expect(materialAt(base, [l.width / 2, l.height / 2, 1])).toBe(true);
  expect(materialAt(base, [l.width / 2, l.height / 2, 4])).toBe(false);
  expect(
    materialAt(sep, [l.separatorWidth / 2, l.separatorHeight / 2, 1]),
  ).toBe(false);
  const front = parts.find((p) => p.id === "front")!;
  expect(materialAt(front, [l.width / 2, l.height / 2, 1])).toBe(false);
  let low = Infinity,
    high = -Infinity;
  for (let i = 0; i < cover.positions.length; i += 3) {
    const p = wallMountPoint(
      "battery-cover",
      cover.positions[i],
      cover.positions[i + 1],
      cover.positions[i + 2],
      s,
      led,
    );
    low = Math.min(low, p[2] * 10);
    high = Math.max(high, p[2] * 10);
  }
  expect(low).toBe(0);
  expect(high).toBeCloseTo(BATTERY_DOOR_TOP);
  expect(high + led.modular!.holderHeight + led.clearance).toBeLessThanOrEqual(
    l.depth - 2,
  );
  expect(
    materialAt(base, [
      l.batteryX + l.batteryWidth / 2,
      l.batteryY + l.batteryHeight / 2,
      1,
    ]),
  ).toBe(false);
  expect(high).toBeLessThan(l.depth - 2);
});

test.each([
  { entry: 6, neck: 2 },
  { entry: 12, neck: 6 },
])(
  "finished rear keeps the round $entry mm entry and $neck mm neck functional",
  ({ entry, neck }) => {
    const f = {
      ...usb,
      enclosure: { ...usb.enclosure!, hangerEntry: entry, hangerNeck: neck },
    };
    const s = projectionSettings(raw, f),
      l = wallMountLayout(s, f),
      base = fabricationParts(masks, s, f).find((p) => p.id === "base")!;
    closed(base);
    const cy = l.hookY - 4,
      cx = l.width / 2,
      r = entry / 2;
    for (let i = 0; i < 16; i++) {
      const a = ((i + 0.23) * 2 * Math.PI) / 16;
      expect(
        materialAt(base, [
          cx + (r - 0.2) * Math.cos(a),
          cy + (r - 0.2) * Math.sin(a),
          1,
        ]),
      ).toBe(false);
    }
    expect(materialAt(base, [cx + 0.8 * r, cy - 0.8 * r, 1])).toBe(true);
    expect(materialAt(base, [cx + neck / 2 - 0.1, cy + 10, 1])).toBe(false);
    expect(materialAt(base, [cx + neck / 2 + 0.1, cy + 10, 1])).toBe(true);
    expect(materialAt(base, [cx + (0.9 * neck) / 2, l.hookTop - 0.1, 1])).toBe(
      true,
    );
    expect(materialAt(base, [cx, l.hookTop - 0.15, 1])).toBe(false);
    expect(materialAt(base, [0.1, 0.1, 1])).toBe(false);
    expect(materialAt(base, [1, 1, 1])).toBe(true);
    expect(
      materialAt(base, [l.enclosureInset + 0.1, l.enclosureInset + 0.1, 10]),
    ).toBe(false);
    expect(
      materialAt(base, [l.enclosureInset + 1, l.enclosureInset + 1, 10]),
    ).toBe(true);
    const inner = l.socket / 2,
      outer = l.socketOuter / 2;
    expect(materialAt(base, [cx + outer - 0.1, l.height / 2, 7.9])).toBe(false);
    expect(materialAt(base, [cx + outer - 0.1, l.height / 2, 7.5])).toBe(true);
    expect(materialAt(base, [cx + inner + 0.1, l.height / 2, 7.9])).toBe(false);
    expect(materialAt(base, [cx + inner + 0.1, l.height / 2, 7.5])).toBe(true);
  },
  15000,
);

test.each(
  [0.1, 0.25, 0.8].flatMap((clearance) =>
    (["plain", "design"] as const).map((front) => ({ clearance, front })),
  ),
)(
  "round tube fit with $clearance mm clearance and $front lid",
  ({ clearance, front }) => {
    const f = {
      ...led,
      clearance,
      modular: { ...led.modular!, cableDiameter: 6 },
      enclosure: { ...led.enclosure!, front, depth: 26 },
    };
    const s = projectionSettings(raw, f),
      l = wallMountLayout(s, f);
    const parts = fabricationParts(
      masks,
      s,
      f,
      front === "design" ? art() : undefined,
    );
    const base = parts.find((p) => p.id === "base")!,
      lid = parts.find((p) => p.id === "separator")!;
    closed(base);
    closed(lid);
    const r = l.socket / 2,
      outer = l.socketOuter / 2,
      z = (front === "design" ? f.enclosure.relief! : 0) + 1;
    for (let i = 0; i < 24; i++) {
      const angle = ((i + 0.37) * 2 * Math.PI) / 24,
        dx = Math.cos(angle),
        dy = Math.sin(angle);
      expect(
        materialAt(base, [l.width / 2 + 5 * dx, l.height / 2 + 5 * dy, 7]),
      ).toBe(false);
      expect(
        materialAt(lid, [
          l.separatorWidth / 2 + 5 * dx,
          l.separatorHeight / 2 + 5 * dy,
          z,
        ]),
      ).toBe(false);
      expect(
        materialAt(base, [
          l.width / 2 + (r + 0.08) * dx,
          l.height / 2 + (r + 0.08) * dy,
          7,
        ]),
      ).toBe(true);
      expect(
        materialAt(base, [
          l.width / 2 + (outer + 0.08) * dx,
          l.height / 2 + (outer + 0.08) * dy,
          7,
        ]),
      ).toBe(false);
    }
    // Corners of the former square hole now contain material around the round bore.
    expect(
      materialAt(base, [l.width / 2 + 0.8 * r, l.height / 2 + 0.8 * r, 7]),
    ).toBe(true);
    expect(
      materialAt(lid, [
        l.separatorWidth / 2 + 0.8 * r,
        l.separatorHeight / 2 + 0.8 * r,
        z,
      ]),
    ).toBe(true);
    expect(materialAt(base, [l.width / 2, l.height / 2, 1])).toBe(true);
  },
  10000,
);

test("panels seat in the continuous base above the lid and retain LED and front heights", () => {
  const s = projectionSettings(raw, led),
    l = wallMountLayout(s, led),
    parts = fabricationParts(masks, s, led);
  const bounds = (id: string) => {
    const part = parts.find((p) => p.id === id)!,
      mesh = assemblyMesh(part, s, led),
      o = assemblyPosition(part.id, s, false),
      zs = [];
    for (let i = 2; i < mesh.positions.length; i += 3)
      zs.push((mesh.positions[i] + o[2]) * 10);
    return zs.reduce(
      (bounds, z) => ({
        min: Math.min(bounds.min, z),
        max: Math.max(bounds.max, z),
      }),
      { min: Infinity, max: -Infinity },
    );
  };
  expect(bounds("base").min).toBe(0);
  expect(bounds("base").max).toBeCloseTo(l.depth);
  expect(bounds("post").min).toBeCloseTo(2);
  expect(bounds("top").min).toBeCloseTo(l.floor + led.clearance / 2);
  expect(l.panelStart).toBe(20);
  expect(l.panelDepth).toBeCloseTo(41.45);
  expect(l.frontTrim).toBeCloseTo(18.55);
  const cradleBack = l.headZ + l.headSeat + 2;
  expect(bounds("front").min).toBeGreaterThan(cradleBack + 2);
  expect(bounds("head").min).toBeGreaterThan(l.source);
  expect(bounds("head").max).toBeGreaterThan(bounds("front").min);
  const boardBack = l.headZ + l.headSeat;
  expect(
    boardBack - led.modular!.starThickness - led.modular!.emitterHeight,
  ).toBeCloseTo(l.source);
  expect(l.source).toBeLessThan(boardBack);
  const base = parts.find((p) => p.id === "base")!;
  expect(materialAt(base, [1, l.height / 2, 3])).toBe(false);
  expect(materialAt(base, [1, l.height / 2, 10])).toBe(false);
  expect(materialAt(base, [1, 1, l.panelStart - 1])).toBe(false);
  expect(materialAt(base, [l.enclosureInset + 1, l.height / 2, 10])).toBe(true);
  expect(
    fabricationPoint(
      "separator",
      l.separatorWidth / 2,
      l.separatorHeight / 2,
      0,
      s,
      led,
    )[2] * 10,
  ).toBeCloseTo(l.depth);
});

test("assembled projection walls stay within the frame outline and its front face", () => {
  for (const f of [led, cob]) {
    const s = projectionSettings(raw, f),
      l = wallMountLayout(s, f);
    const generated = masksFromImage(art(), s);
    const parts = fabricationParts(generated, s, f);
    for (const part of parts.filter((p) =>
      ["top", "bottom", "left", "right"].includes(p.id),
    )) {
      const mesh = assemblyMesh(part, s, f),
        origin = assemblyPosition(part.id, s, false);
      for (let i = 0; i < mesh.positions.length; i += 3) {
        expect(
          Math.abs((mesh.positions[i] + origin[0]) * 10),
        ).toBeLessThanOrEqual(l.width / 2 + 0.001);
        expect(
          Math.abs((mesh.positions[i + 1] + origin[1]) * 10),
        ).toBeLessThanOrEqual(l.height / 2 + 0.001);
        expect((mesh.positions[i + 2] + origin[2]) * 10).toBeLessThanOrEqual(
          l.outerFace + 0.001,
        );
      }
    }
  }
});

test("raised panel start round-trips rays, preserves source position and normalizes once", () => {
  const s = projectionSettings(raw, led);
  const p = wallToImage("right", 2, 1, s)!;
  const back = imageToWall(p[0], p[1], s)!;
  expect(back.face).toBe("right");
  expect(back.u).toBeCloseTo(2);
  expect(back.depth).toBeCloseTo(1);
  expect(p[0]).not.toBeCloseTo(wallToImage("right", 2, 1, raw)![0]);
  expect(sourceDistance(s)).toBeCloseTo(5);
  expect(s.wallOffset).toBeCloseTo(2);
  expect(s.depth).toBeCloseTo(4.145);
  expect(s.panelExtension).toBeCloseTo(0);
  expect(s.frontTrim).toBeCloseTo(1.855);
  const again = projectionSettings(s, led);
  expect(again.depth).toBeCloseTo(s.depth);
  expect(sourceDistance(again)).toBeCloseTo(sourceDistance(s));
  const c = projectionSettings(raw, cob);
  expect(sourceDistance(c) * 10).toBeCloseTo(20 + 60 - 1 + 0.4 - 1);
  const image = art();
  expect(masksFromImage(image, s)).not.toEqual(masksFromImage(image, raw));
});

test("panel starts follow the top of the lid and relief without moving the light or frame", () => {
  for (const depth of [18, 30, 40]) {
    const f = {
      ...usb,
      enclosure: {
        ...usb.enclosure!,
        depth,
        front: "design" as const,
        relief: 0.6,
      },
    };
    const d = projectionSettings(raw, f);
    expect(d.wallOffset).toBeCloseTo((depth + 0.6) / 10);
    expect(d.depth + d.frontTrim!).toBeCloseTo(raw.depth - 0.06);
    const layout = wallMountLayout(d, f);
    const panels = fabricationParts(masks, d, f, art()).filter((p) =>
      ["top", "bottom", "left", "right"].includes(p.id),
    );
    for (const panel of panels) {
      const mesh = assemblyMesh(panel, d, f),
        origin = assemblyPosition(panel.id, d, false);
      for (let i = 2; i < mesh.positions.length; i += 3)
        expect((mesh.positions[i] + origin[2]) * 10).toBeGreaterThanOrEqual(
          2 + f.clearance / 2 - 0.001,
        );
    }
    expect(layout.outerFace).toBeCloseTo(
      depth + ((raw.depth * raw.lightPercent) / 100) * 10 + 11.45 + 2,
    );
    expect(sourceDistance(d)).toBeCloseTo(
      depth / 10 + (raw.depth * raw.lightPercent) / 100,
    );
  }
});

test("artwork belongs to the rear lid and never fills the open front; ZIP includes the rear relief", () => {
  const f = {
      ...led,
      enclosure: { ...led.enclosure!, front: "design" as const },
    },
    s = projectionSettings(raw, f),
    image = art();
  const parts = fabricationParts(masks, s, f, image);
  const rear = parts.find((p) => p.id === "separator")!;
  const front = parts.find((p) => p.id === "front")!;
  closed(rear);
  closed(front);
  const l = wallMountLayout(s, f);
  const span = Math.min(l.separatorWidth, l.separatorHeight) - 12;
  const x = l.separatorWidth / 2 - span * 0.2,
    y = l.separatorHeight / 2 + span * 0.1;
  expect(materialAt(rear, [x, y, 0.3])).toBe(true);
  expect(
    materialAt(rear, [l.separatorWidth / 2 + 25, l.separatorHeight / 2, 0.3]),
  ).toBe(false);
  expect(
    materialAt(rear, [l.separatorWidth / 2, l.separatorHeight / 2, 1]),
  ).toBe(false);
  expect(fabricationPoint("separator", x, y, 0, s, f)[2] * 10).toBeCloseTo(
    l.depth + f.enclosure.relief!,
  );
  const plainFront = fabricationParts(masks, s, led).find(
    (p) => p.id === "front",
  )!;
  expect(front.positions).toEqual(plainFront.positions);
  expect(front.indices).toEqual(plainFront.indices);
  expect(() => fabricationParts(masks, s, f)).toThrow(/Falta la imagen/);
  const zip = buildSTLExport({
    settings: s,
    fabrication: f,
    masks,
    artwork: image,
    mode: "separate",
    name: "Pared",
  });
  const text = new TextDecoder().decode(zip.buffer);
  expect(text).toContain("10-tapa-pilas.stl");
  expect(text).toContain("mismo diseño en relieve");
  expect(text).toContain("BASE CONTRA LA PARED");
});

test("rejects intersecting batteries, bad hanging hardware and an emitter that cannot fit", () => {
  expect(() =>
    wallMountLayout(raw, {
      ...usb,
      enclosure: { ...usb.enclosure!, depth: 12 },
    }),
  ).toThrow(/cableado/);
  expect(() =>
    lightingLayout(raw, {
      ...led,
      enclosure: { ...led.enclosure!, depth: 15 },
    }),
  ).toThrow(/portapilas/);
  expect(() => wallMountLayout({ ...raw, height: 6 }, led)).toThrow(/anclaje/);
  expect(() => lightingLayout({ ...raw, lightPercent: 95 }, led)).toThrow(
    /posición de luz/,
  );
  expect(() =>
    lightingLayout(raw, {
      ...led,
      enclosure: { ...led.enclosure!, hangerNeck: 8 },
    }),
  ).toThrow(/anclaje/);
  const seq = assemblySequence(led);
  expect(seq.steps).toHaveLength(12);
  expect(assemblyPlacement("base", led)).toBe(1);
  expect(assemblyPlacement("post", led)).toBeLessThan(
    assemblyPlacement("head", led),
  );
  expect(assemblyPlacement("battery-cover", led)).toBeLessThan(
    assemblyPlacement("separator", led),
  );
});

test("diagonal relief cells beside the central hole remain manifold in both light modes", () => {
  const image = art();
  for (let y = 0; y < IMAGE_SIZE; y++)
    for (let x = 0; x < IMAGE_SIZE; x++) {
      const k = (y * IMAGE_SIZE + x) * 4,
        v = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 255 : 0;
      image[k] = image[k + 1] = image[k + 2] = v;
    }
  for (const base of [led, cob]) {
    const f = {
      ...base,
      enclosure: { ...base.enclosure!, front: "design" as const },
    };
    const s = projectionSettings(raw, f),
      rear = fabricationParts(masks, s, f, image).find(
        (p) => p.id === "separator",
      )!;
    closed(rear);
    expect(
      materialAt(rear, [
        wallMountLayout(s, f).separatorWidth / 2,
        wallMountLayout(s, f).separatorHeight / 2,
        1,
      ]),
    ).toBe(false);
  }
}, 10000);

test("the front is a continuous frame with a large through opening in both lighting modes", () => {
  for (const f of [led, usb, cob]) {
    const s = projectionSettings(raw, f),
      l = wallMountLayout(s, f);
    const front = fabricationParts(masks, s, f).find((p) => p.id === "front")!;
    closed(front);
    for (const x of [0.25, 0.4, 0.5, 0.6, 0.75])
      for (const y of [0.25, 0.4, 0.5, 0.6, 0.75])
        for (const z of [0.3, 1.3, 2.5])
          expect(materialAt(front, [l.width * x, l.height * y, z])).toBe(false);
    for (const p of [
      [3, l.height / 2, 1],
      [l.width - 3, l.height / 2, 1],
      [l.width / 2, 3, 1],
      [l.width / 2, l.height - 3, 1],
    ])
      expect(materialAt(front, p as [number, number, number])).toBe(true);
    if (f.illumination === "cob") {
      for (const { pocket } of cobLayout(s, f).footprints) {
        const x = l.width / 2 + pocket.x,
          y = l.height / 2 + pocket.y;
        expect(materialAt(front, [x, y, 0.2])).toBe(false);
        expect(materialAt(front, [x, y, 1.3])).toBe(true);
      }
      expect(() =>
        lightingLayout(s, {
          ...f,
          cob: {
            ...defaultCob,
            mode: "manual",
            segments: [{ x: 0, y: 0, length: 30, rotation: 0 }],
          },
        }),
      ).toThrow(/abertura frontal/);
    }
  }
});
