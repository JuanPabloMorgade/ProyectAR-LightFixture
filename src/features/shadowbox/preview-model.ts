import type { BoxSettings, WallMask } from "./engine";
import {
  fabricationParts,
  assemblyMesh,
  type FabricatedPart,
  type Fabrication,
} from "./fabrication";
import type { Mesh } from "./solid-mesh";

type Entry = {
  key: string;
  artwork?: Uint8ClampedArray;
  parts: FabricatedPart[];
};
// Editor masks are immutable snapshots. Reuse one model across both viewers and
// guide steps, without retaining previous drawings after the editor releases them.
const previews = new WeakMap<WallMask[], Entry[]>();
const assembled = new WeakMap<FabricatedPart, { key: string; mesh: Mesh }>();

export function previewMesh(
  part: FabricatedPart,
  settings: BoxSettings,
  fabrication?: Fabrication,
) {
  const key = JSON.stringify([settings, fabrication]);
  const hit = assembled.get(part);
  if (hit?.key === key) return hit.mesh;
  const mesh = assemblyMesh(part, settings, fabrication);
  assembled.set(part, { key, mesh });
  return mesh;
}

export function previewParts(
  masks: WallMask[],
  settings: BoxSettings,
  fabrication?: Fabrication,
  artwork?: Uint8ClampedArray,
) {
  const key = JSON.stringify([settings, fabrication]);
  const entries = previews.get(masks) ?? [];
  const hit = entries.find(
    (entry) => entry.key === key && entry.artwork === artwork,
  );
  if (hit) return hit.parts;
  const parts = fabricationParts(masks, settings, fabrication, artwork);
  entries.unshift({ key, artwork, parts });
  if (entries.length > 2) entries.pop();
  previews.set(masks, entries);
  return parts;
}
