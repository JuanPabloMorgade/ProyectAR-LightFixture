import type { BoxSettings } from "./engine";
import type { Fabrication } from "./fabrication";
import { isWallMount, wallPanelStart } from "./enclosure-config";
import { defaultCob } from "./cob";
import { defaultModular } from "./modular-config";

/** Derive reachable panel length while keeping saved settings and emitter height. */
export function projectionSettings(
  s: BoxSettings,
  f?: Fabrication,
): BoxSettings {
  if (!isWallMount(f)) return s;
  const c = f!.cob ?? defaultCob;
  // Recover the editor depth if this function receives already-derived settings.
  const previousExtension = s.panelExtension ?? 0;
  const editorDepth = s.depth - previousExtension + (s.frontTrim ?? 0);
  const panelStart = wallPanelStart(f!);
  const panelExtension = (f!.enclosure!.depth - panelStart) / 10;
  const relativeSource = (s.depth * s.lightPercent) / 100 - previousExtension;
  const nominalDepth = editorDepth + panelExtension;
  const m = f!.modular ?? defaultModular;
  // Retain clearance behind the board/head. This tail supports the open front frame.
  const headAllowance =
    (m.emitterHeight + m.starThickness + 4 + s.thickness / 2 + f!.clearance) /
    10;
  const depth =
    f!.illumination === "modular"
      ? Math.min(nominalDepth, relativeSource + panelExtension + headAllowance)
      : nominalDepth;
  const frontTrim = nominalDepth - depth;
  return {
    ...s,
    depth,
    wallOffset: panelStart / 10,
    panelExtension,
    frontTrim,
    lightPercent:
      (100 *
        (f!.illumination === "cob"
          ? depth - s.thickness / 20 + (c.recessDepth - c.thickness) / 10
          : relativeSource + panelExtension)) /
      depth,
  };
}
