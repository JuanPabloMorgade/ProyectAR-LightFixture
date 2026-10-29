import type { BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import { isWallMount } from "./enclosure-config";
import { defaultModular } from "./modular-config";

export function rawWallSettings(s: BoxSettings): BoxSettings {
  if (s.panelExtension === undefined && s.frontTrim === undefined) return s;
  const {
    wallOffset: _offset,
    panelExtension: extension = 0,
    frontTrim: trim = 0,
    ...raw
  } = s;
  const depth = s.depth - extension + trim;
  return {
    ...raw,
    depth,
    lightPercent:
      (100 * ((s.depth * s.lightPercent) / 100 - extension)) / depth,
  };
}

/** Raw editor limits: preserve the head clearance within the maximum configured depth. */
export function wallLightRange(s: BoxSettings, f: Fabrication) {
  const m = f.modular ?? defaultModular;
  const depth = (s.depth - (s.panelExtension ?? 0) + (s.frontTrim ?? 0)) * 10;
  return {
    min: Math.max(10, Math.ceil((14 / depth) * 100)),
    max: Math.min(
      95,
      Math.floor(
        ((depth - s.thickness / 2 - m.emitterHeight - m.starThickness - 3) /
          depth) *
          100,
      ),
    ),
  };
}

/** Called on opening a project or entering 3D; manual in-editor edits remain explicit. */
export function fitWallLight(s: BoxSettings, f: Fabrication): BoxSettings {
  if (!isWallMount(f) || f.illumination !== "modular") return s;
  s = rawWallSettings(s);
  const { min, max } = wallLightRange(s, f);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return s;
  const lightPercent = Math.max(min, Math.min(max, s.lightPercent));
  return lightPercent === s.lightPercent ? s : { ...s, lightPercent };
}
