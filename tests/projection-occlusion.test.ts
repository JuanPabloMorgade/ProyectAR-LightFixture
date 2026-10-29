import { expect, test } from "vitest";
import {
  defaultBox,
  IMAGE_SIZE,
  masksFromImage,
  simulatedImage,
} from "../src/features/shadowbox/engine";
import { currentFabrication } from "../src/features/shadowbox/editor-defaults";
import { projectionSettings } from "../src/features/shadowbox/projection-settings";
import {
  fixtureShadow,
  meshShadow,
  reachableMasks,
  occludeSimulation,
} from "../src/features/shadowbox/projection-occlusion";
import { solidMesh } from "../src/features/shadowbox/solid-mesh";
import {
  fabricationParts,
  fabricationMasks,
} from "../src/features/shadowbox/fabrication";
import { closed } from "./mesh-assertions";
import { materialAt } from "./mesh-assertions";
import {
  wallMountLayout,
  wallMountParts,
  wallMountPoint,
} from "../src/features/shadowbox/wallmount";
import {
  headDockSlots,
  HEAD_DOCK_DEPTH,
} from "../src/features/shadowbox/head-mount";

const index = (x: number, y: number, radius: number) =>
  Math.floor((0.5 - y / (2 * radius)) * IMAGE_SIZE) * IMAGE_SIZE +
  Math.floor((x / (2 * radius) + 0.5) * IMAGE_SIZE);

test("the 8 x 13 cm head at 70% stays behind the light and docks into real frame slots", () => {
  for (const settings of [
    { ...defaultBox, width: 8, height: 13, lightPercent: 70 },
    { ...defaultBox, lightPercent: 50 },
    { ...defaultBox, width: 18, height: 14, lightPercent: 70 },
  ]) {
    const f = currentFabrication(),
      s = projectionSettings(settings, f),
      l = wallMountLayout(s, f);
    const head = wallMountParts(s, f).find((p) => p.id === "head")!;
    closed(head);
    const positions = new Float32Array(head.positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const p = wallMountPoint(
        "head",
        head.positions[i],
        head.positions[i + 1],
        head.positions[i + 2],
        s,
        f,
        l,
      );
      expect(p[2] * 10).toBeGreaterThan(l.source);
      positions.set(p, i);
    }
    const shadow = new Uint8Array(IMAGE_SIZE * IMAGE_SIZE);
    meshShadow({ positions, indices: head.indices }, s, shadow);
    expect(shadow.some(Boolean)).toBe(false);
    const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4).fill(255);
    const masks = masksFromImage(image, s),
      parts = fabricationParts(masks, s, f);
    const frame = parts.find((p) => p.id === "front")!;
    closed(frame);
    for (const slot of headDockSlots(l.width, s.height * 10, f.clearance)) {
      const x = l.width / 2 + slot.x,
        y = l.height / 2 + slot.y;
      expect(materialAt(frame, [x, y, 0.5])).toBe(false);
      expect(materialAt(frame, [x, y, HEAD_DOCK_DEPTH + 0.25])).toBe(true);
      const headX = slot.x < 0 ? l.dockInset : l.width - l.dockInset;
      expect(
        materialAt(head, [headX, l.headCenterY + l.dockY, l.headPinTop - 0.1]),
      ).toBe(true);
      const p = wallMountPoint(
        "head",
        headX,
        l.headCenterY + l.dockY,
        l.headPinTop,
        s,
        f,
        l,
      );
      const frameZ =
        p[2] * 10 - ((s.wallOffset ?? 0) * 10 + s.depth * 10) + s.thickness / 2;
      expect(frameZ).toBeGreaterThan(0);
      expect(frameZ).toBeLessThan(HEAD_DOCK_DEPTH);
    }
    const fixture = fixtureShadow(s, f);
    expect(fixture[index(0, 35, s.radius)]).toBe(0);
    expect(fixture[index(0, -35, s.radius)]).toBe(0);
    const reachable = reachableMasks(masks, s, fixture).masks;
    const projected = occludeSimulation(
      simulatedImage(fabricationMasks(reachable, s, f), s),
      fixture,
    ).pixels;
    expect(projected[index(0, 35, s.radius) * 4]).toBe(249);
    expect(projected[index(0, -35, s.radius) * 4]).toBe(249);
    for (const face of ["top", "bottom"]) {
      const mask = reachable.find((m) => m.face === face)!;
      // A white background must remain open along the former central stripe.
      const col = Math.floor(mask.columns / 2);
      expect(
        Array.from(
          { length: mask.rows },
          (_, row) => mask.cells[row * mask.columns + col],
        ).some(Boolean),
      ).toBe(true);
    }
  }
});

test("opaque triangles cast scaled shadows, retain openings and ignore material behind the emitter", () => {
  const s = { ...defaultBox, depth: 4, lightPercent: 50, radius: 15 }; // source z=2 cm
  const ring = solidMesh(
    [[-2, 2, -2, 2, 0.9, 1]],
    [[-0.5, 0.5, -0.5, 0.5, 0.8, 1.1]],
  );
  const shadow = new Uint8Array(IMAGE_SIZE * IMAGE_SIZE);
  meshShadow(ring, s, shadow);
  expect(shadow[index(0, 0, s.radius)]).toBe(0);
  expect(shadow[index(3, 0, s.radius)]).toBe(1);
  expect(shadow[index(5, 0, s.radius)]).toBe(0);
  const behind = new Uint8Array(shadow.length);
  meshShadow(solidMesh([[-2, 2, -2, 2, 2.1, 2.3]]), s, behind);
  expect(behind.some(Boolean)).toBe(false);
});

test("rays blocked by the rear lid are excluded below the raised panels", () => {
  const f = currentFabrication(),
    s = projectionSettings({ ...defaultBox, detail: 96, lightPercent: 50 }, f);
  const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4).fill(255);
  const masks = masksFromImage(image, s),
    blocked = fixtureShadow(s, f);
  const p = index(11, 0, s.radius),
    outside = index(20, 0, s.radius);
  expect(blocked[p]).toBe(1);
  expect(blocked[outside]).toBe(0);
  const ideal = simulatedImage(masks, s);
  expect(ideal[p * 4]).toBe(26);
  const visible = occludeSimulation(
    new Uint8ClampedArray(ideal.length).fill(249),
    blocked,
  );
  expect(visible.pixels[p * 4]).toBe(26);
  expect(visible.hiddenFraction).toBeGreaterThan(0);
  const reachable = reachableMasks(masks, s, blocked);
  const count = (items: typeof masks) =>
    items.reduce((n, m) => n + m.cells.reduce((a, b) => a + b, 0), 0);
  expect(count(reachable.masks)).toBe(count(masks));
  expect(reachable.blockedApertureFraction).toBe(0);
  expect(count(reachableMasks(reachable.masks, s, blocked).masks)).toBe(
    count(reachable.masks),
  );
  const supported = fabricationMasks(reachable.masks, s, f);
  for (const part of fabricationParts(supported, s, f)) closed(part);
}, 15000);

test("the 20 mm collar blocks rays through the base while rays above its edge stay lit", () => {
  const f = currentFabrication(),
    s = projectionSettings({ ...defaultBox, lightPercent: 50, detail: 96 }, f);
  const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4).fill(255);
  const masks = masksFromImage(image, s),
    blocked = fixtureShadow(s, f);
  const direct = index(20, 0, s.radius),
    formerGap = index(12, 0, s.radius),
    covered = index(11, 0, s.radius);
  expect(blocked[direct]).toBe(0);
  expect(blocked[formerGap]).toBe(1);
  expect(blocked[covered]).toBe(1);
  const preview = occludeSimulation(
    simulatedImage(masks, s, true),
    blocked,
  ).pixels;
  expect(preview[direct * 4]).toBe(249);
  expect(preview[formerGap * 4]).toBe(26);
  expect(preview[covered * 4]).toBe(26);
});
