import { createProjectStorage } from "@/lib/project-storage";
import { validateBox, type BoxSettings } from "./engine";
import { validateFabrication, type Fabrication } from "./fabrication";
import { defaultEditorBox } from "./editor-defaults";

export type Project = {
  version: 2;
  name: string;
  settings: BoxSettings;
  image: string;
  fabrication?: Fabrication;
};
const prefix = "proyectar:shadow:v2:",
  legacyPrefix = "shadowbox.design.";
export function checkProject(data: unknown): Project {
  const p = data as Project;
  if (
    !p ||
    p.version !== 2 ||
    typeof p.name !== "string" ||
    p.name.length > 100 ||
    typeof p.image !== "string" ||
    p.image.length > 5_000_000 ||
    !/^data:image\/png;base64,/.test(p.image)
  )
    throw new Error("El archivo no es un proyecto válido de ProyectAR.");
  validateBox(p.settings);
  if (p.fabrication !== undefined) {
    // Projects from the first prototype start at the new six-LED minimum.
    if ([1, 2, 3].includes(p.fabrication.ledCount))
      p.fabrication = { ...p.fabrication, ledCount: 6 };
    validateFabrication(p.fabrication);
  }
  return p;
}
export function readOld(raw: string, name: string): Project {
  const old = JSON.parse(raw) as {
    sliders?: Record<string, number>;
    targetImage?: string;
  };
  if (
    !old.sliders ||
    typeof old.targetImage !== "string" ||
    !old.targetImage.startsWith("data:image/png")
  )
    throw new Error("El diseño anterior no tiene un formato válido.");
  const val = (key: string, fallback: number) => {
    const n = Number(old.sliders![key]);
    return Number.isFinite(n) ? n : fallback;
  };
  const settings: BoxSettings = {
    width: val("s-W", 15),
    height: val("s-H", 15),
    depth: val("s-d", 6),
    radius: val("d-R", 55),
    lightPercent: val("s-lightz", defaultEditorBox.lightPercent),
    thickness: 2,
    margin: val("d-margin", 3),
    detail: 160,
  };
  validateBox(settings);
  return {
    version: 2,
    name: name.replace(/\.json$/i, ""),
    settings,
    image: old.targetImage,
  };
}

export const shadowProjectStorage = createProjectStorage<Project>({
  prefix,
  parse: (raw) => checkProject(JSON.parse(raw)),
  legacy: {
    matches: (id) => id.startsWith(legacyPrefix) && !id.endsWith(".meta"),
    label: (id) =>
      id.slice(legacyPrefix.length).replace(/\.json$/i, "") +
      " · versión anterior",
    parse: (raw, item) =>
      readOld(raw, item.label.replace(" · versión anterior", "")),
    extraKeys: (id) => [id + ".meta"],
  },
});
