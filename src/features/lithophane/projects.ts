import { createProjectStorage } from "@/lib/project-storage";
import { validateSettings, type Settings } from "./mesh";
import { hasHousing } from "./housing-config";
import { housingLayout } from "./housing";

export type Project = {
  version: 1;
  name: string;
  photo: string;
  settings: Settings;
};
export const LAMP_PROJECT_PREFIX = "proyectar:lamp:v1:";
export const LAMP_LEGACY_KEY = "proyectar:lamp:v1";
export const LAMP_LAST_KEY = "proyectar:lamp:last";

export function validateProject(p: Project) {
  if (
    p?.version !== 1 ||
    typeof p.name !== "string" ||
    p.name.length > 100 ||
    typeof p.photo !== "string" ||
    !/^data:image\/(png|jpeg|webp);base64,/.test(p.photo)
  )
    throw new Error("Este archivo no es un proyecto de lámpara de ProyectAR.");
  validateSettings(p.settings);
  if (hasHousing(p.settings)) housingLayout(p.settings);
}

function parseProject(raw: string): Project {
  const project = JSON.parse(raw) as Project;
  validateProject(project);
  return project;
}

export const lampProjectStorage = createProjectStorage<Project>({
  prefix: LAMP_PROJECT_PREFIX,
  parse: parseProject,
  lastKey: LAMP_LAST_KEY,
  legacy: {
    matches: (id) => id === LAMP_LEGACY_KEY,
    label: (_id, raw) =>
      `${parseProject(raw).name || "Mi lámpara"} · guardado anterior`,
    parse: parseProject,
    replaceOnSave: (raw, project) =>
      (parseProject(raw).name.trim() || "Mi lámpara") === project.name,
  },
});
