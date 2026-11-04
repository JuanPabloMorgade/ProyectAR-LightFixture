import type { Settings } from "./mesh";
import { spherePhotoLatitude } from "./sphere";

// UX tolerance, not a printability limit. The target comes from the actual
// photo band used by the mesh; panels deliberately have no invented thresholds.
export const SPHERE_PHOTO_RATIO_TOLERANCE = 0.12;
export function photoAdvice(s: Settings, width: number, height: number) {
  if (width <= 0 || height <= 0) return null;
  if (s.shape !== "sphere")
    return {
      tone: "neutral",
      title: "Revisá la vista previa",
      text: `La imagen completa se adapta al ${s.angle ? "arco" : "ancho"} y al alto elegidos. Si se ve estirada, ajustá esas medidas o prepará el encuadre antes de cargarla.`,
    };
  if (s.spherePhotoFit === "contain")
    return {
      tone: "good",
      title:
        (s.spherePhotoStretch ?? 0) > 0
          ? "Estiramiento suave aplicado"
          : "Proporción conservada",
      text:
        (s.spherePhotoStretch ?? 0) > 0
          ? "La foto completa ocupa más ancho sin cambiar su altura. El ajuste se aplica tanto a la vista previa como al STL."
          : "La foto completa queda centrada en un sector de la esfera, sin estirarse para cubrirla. El resto queda liso. La curvatura puede cambiar cómo se ve desde distintos ángulos.",
    };
  const target = Math.PI / spherePhotoLatitude(s);
  if (!Number.isFinite(target)) return null;
  const ratio = width / height;
  if (Math.abs(ratio / target - 1) <= SPHERE_PHOTO_RATIO_TOLERANCE)
    return {
      tone: "good",
      title: "Imagen recomendada",
      text: "La proporción se aproxima a la franja de la esfera. Revisá que los detalles importantes queden lejos de la unión.",
    };
  if (ratio > 1)
    return {
      tone: "neutral",
      title: "Imagen adaptable",
      text: "Al cubrir 360°, tu foto se adapta a una franja panorámica y puede verse estirada. Elegí Conservar proporción para centrarla sin estirarla.",
    };
  return {
    tone: "review",
    title: "Revisá el encuadre",
    text: "Al cubrir 360°, una foto vertical o cuadrada se ensancha. Elegí Conservar proporción para mostrarla centrada; también podés continuar con el modo panorámico.",
  };
}
