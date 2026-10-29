import { expect, test, vi } from "vitest";
import { defaultBox } from "../src/features/shadowbox/engine";
import {
  defaultFabrication,
  type FabricatedPart,
} from "../src/features/shadowbox/fabrication";
import {
  previewParts,
  previewMesh,
} from "../src/features/shadowbox/preview-model";
import type { WallMask } from "../src/features/shadowbox/engine";

vi.mock("../src/features/shadowbox/fabrication", async (original) => ({
  ...(await original<typeof import("../src/features/shadowbox/fabrication")>()),
  fabricationParts: vi.fn(() => [
    { id: "top", positions: new Float32Array(), indices: new Uint32Array() },
  ]),
  assemblyMesh: vi.fn(() => ({
    positions: new Float32Array(),
    indices: new Uint32Array(),
  })),
}));

test("viewers share geometry while dimensions, clearances, drawing snapshots and rear artwork invalidate it", () => {
  const masks: WallMask[] = [];
  const art = new Uint8ClampedArray(4);
  const first = previewParts(masks, defaultBox, defaultFabrication, art);
  expect(
    previewParts(masks, { ...defaultBox }, { ...defaultFabrication }, art),
  ).toBe(first);
  expect(
    previewParts(
      masks,
      { ...defaultBox, thickness: 3 },
      defaultFabrication,
      art,
    ),
  ).not.toBe(first);
  expect(
    previewParts(
      masks,
      defaultBox,
      { ...defaultFabrication, clearance: 0.5 },
      art,
    ),
  ).not.toBe(first);
  expect(
    previewParts([...masks], defaultBox, defaultFabrication, art),
  ).not.toBe(first);
  expect(
    previewParts(masks, defaultBox, defaultFabrication, art.slice()),
  ).not.toBe(first);
});

test("assembled coordinates are reused without mixing settings or separate parts", () => {
  const part = { id: "top" } as FabricatedPart;
  const first = previewMesh(part, defaultBox, defaultFabrication);
  expect(previewMesh(part, { ...defaultBox }, { ...defaultFabrication })).toBe(
    first,
  );
  expect(
    previewMesh(part, { ...defaultBox, width: 20 }, defaultFabrication),
  ).not.toBe(first);
  expect(previewMesh({ ...part }, defaultBox, defaultFabrication)).not.toBe(
    first,
  );
});
