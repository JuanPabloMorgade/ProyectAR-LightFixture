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
import {
  wallMountLayout,
  wallMountParts,
  wallMountPoint,
} from "../src/features/shadowbox/wallmount";
import { HEAD_INSERTION } from "../src/features/shadowbox/head-mount";

const index = (x: number, y: number, radius: number) =>
  Math.floor((0.5 - y / (2 * radius)) * IMAGE_SIZE) * IMAGE_SIZE +
  Math.floor((x / (2 * radius) + 0.5) * IMAGE_SIZE);

test("the post-mounted head retains emitter distance and contributes its real shadow to the preview", () => {
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
      expect(Math.abs(p[0] * 10)).toBeLessThanOrEqual(l.headWidth / 2 + 0.001);
      positions.set(p, i);
    }
    // The tube seats against a physical shoulder, rather than floating below the head.
    expect(l.headOrigin + HEAD_INSERTION).toBeCloseTo(l.floor + l.postLength);
    const boardBack = l.headZ + l.headSeat;
    expect(
      boardBack - f.modular!.starThickness - f.modular!.emitterHeight,
    ).toBeCloseTo(l.source);
    const shadow = new Uint8Array(IMAGE_SIZE * IMAGE_SIZE);
    meshShadow({ positions, indices: head.indices }, s, shadow);
    expect(shadow.some(Boolean)).toBe(true);
    const fixture = fixtureShadow(s, f);
    for (let i = 0; i < shadow.length; i++)
      if (shadow[i] && !fixture[i])
        throw new Error("Head shadow missing from fixture preview");
    // Opposite diagonal arms leave the former central vertical stripe open.
    expect(fixture[index(0, 35, s.radius)]).toBe(0);
    expect(fixture[index(0, -35, s.radius)]).toBe(0);
    const image = new Uint8ClampedArray(IMAGE_SIZE * IMAGE_SIZE * 4).fill(255);
    const masks = masksFromImage(image, s);
    expect(fabricationParts(masks, s, f).some((p) => p.id === "front")).toBe(
      false,
    );
    const reachable = reachableMasks(masks, s, fixture).masks;
    const projected = occludeSimulation(
      simulatedImage(fabricationMasks(reachable, s, f), s),
      fixture,
    ).pixels;
    for (let i = 0; i < shadow.length; i++)
      if (shadow[i] && projected[i * 4] !== 26)
        throw new Error("Head shadow missing from simulation");
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
  expect(count(reachable.masks)).toBeLessThan(count(masks));
  expect(reachable.blockedApertureFraction).toBeGreaterThan(0);
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
