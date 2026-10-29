import { expect, test } from "vitest";
import { defaultBox } from "../src/features/shadowbox/engine";
import { currentFabrication } from "../src/features/shadowbox/editor-defaults";
import {
  fitWallLight,
  rawWallSettings,
  wallLightRange,
} from "../src/features/shadowbox/light-position";
import { projectionSettings } from "../src/features/shadowbox/projection-settings";
import { wallMountLayout } from "../src/features/shadowbox/wallmount";

test("old 85% projects open at the nearest fitting LED position instead of resetting to 50%", () => {
  const f = currentFabrication(),
    s = { ...defaultBox, lightPercent: 85 };
  expect(wallLightRange(s, f)).toEqual({ min: 24, max: 83 });
  const adjusted = fitWallLight(s, f);
  expect(adjusted.lightPercent).toBe(83);
  expect(adjusted.width).toBe(s.width);
  expect(adjusted.height).toBe(s.height);
  expect(adjusted.depth).toBe(s.depth);
  expect(() => wallMountLayout(adjusted, f)).not.toThrow();
  expect(fitWallLight({ ...s, lightPercent: 10 }, f).lightPercent).toBe(24);
  const valid = { ...s, lightPercent: 70 };
  expect(fitWallLight(valid, f)).toBe(valid);
  const cob = { ...f, illumination: "cob" as const };
  expect(fitWallLight(s, cob)).toBe(s);
});

test("derived geometry can recover raw settings without accumulating offsets", () => {
  const f = currentFabrication(),
    s = { ...defaultBox, lightPercent: 50 };
  const raw = rawWallSettings(projectionSettings(s, f));
  expect(raw.depth).toBeCloseTo(s.depth);
  expect(raw.lightPercent).toBeCloseTo(50);
  expect(raw.wallOffset).toBeUndefined();
  expect(raw.frontTrim).toBeUndefined();
  const impossible = { ...s, depth: 3 };
  const hardware = { ...f, modular: { ...f.modular!, emitterHeight: 15 } };
  expect(fitWallLight(impossible, hardware)).toBe(impossible);
});
