import { expect, test } from "vitest";
import { defaultBox, IMAGE_SIZE } from "../src/features/shadowbox/engine";
import { currentFabrication } from "../src/features/shadowbox/editor-defaults";
import { projectionSettings } from "../src/features/shadowbox/projection-settings";
import { meshShadow } from "../src/features/shadowbox/projection-occlusion";
import {
  wallMountLayout,
  wallMountParts,
  wallMountPoint,
} from "../src/features/shadowbox/wallmount";

test.each([
  { width: 8, height: 13, lightPercent: 70, broadArmPixels: 36028 },
  { width: 15, height: 15, lightPercent: 50, broadArmPixels: 41330 },
  { width: 18, height: 14, lightPercent: 70, broadArmPixels: 39590 },
])(
  "head shadow outside the existing base shadow stays narrow ($width x $height, $lightPercent%)",
  (settings) => {
    const f = currentFabrication();
    const { broadArmPixels, ...box } = settings;
    const s = projectionSettings({ ...defaultBox, ...box }, f);
    const layout = wallMountLayout(s, f);
    const headShadow = new Uint8Array(IMAGE_SIZE * IMAGE_SIZE);
    const restShadow = new Uint8Array(headShadow.length);
    for (const part of wallMountParts(s, f)) {
      const positions = new Float32Array(part.positions.length);
      for (let i = 0; i < positions.length; i += 3)
        positions.set(
          wallMountPoint(
            part.id,
            part.positions[i],
            part.positions[i + 1],
            part.positions[i + 2],
            s,
            f,
            layout,
          ),
          i,
        );
      meshShadow(
        { positions, indices: part.indices },
        s,
        part.id === "head" ? headShadow : restShadow,
      );
    }
    const extraPixels = headShadow.reduce(
      (sum, value, i) => sum + +(!!value && !restShadow[i]),
      0,
    );
    expect(extraPixels).toBeGreaterThan(0);
    // Measured with the former 22.5-degree arms, using these same settings and raster.
    // Each case must remove at least half of the head's additional projected shadow.
    expect(extraPixels).toBeLessThan(broadArmPixels / 2);
  },
);
