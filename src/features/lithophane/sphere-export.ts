import { binarySTL, type Settings } from "./mesh";
import type { Mesh } from "../shadowbox/solid-mesh";
import { zipFiles } from "../shadowbox/zip";
import {
  createSphereCap,
  sphereCapForPrinting,
  sphereCapTube,
} from "./sphere-cap";
import {
  DEFAULT_OPENING_DIAMETER,
  SPHERE_NECK_HEIGHT,
  sphereForPrinting,
  spherePhotoLatitude,
} from "./sphere";

export const SPHERE_LED_GUIDANCE =
  "Usá únicamente una guirnalda LED de baja potencia y baja temperatura de funcionamiento. Si querés luz blanca, podés elegir blanco frío; el color frío no garantiza que el LED no caliente. No uses lamparitas incandescentes. Comprobá la temperatura del conjunto antes de dejarlo encendido y seguí las indicaciones de la guirnalda para adornos o cubiertas.";
export function sphereImageSize(s: Settings) {
  return `1500 × ${Math.round((1500 * spherePhotoLatitude(s)) / Math.PI)} px`;
}
export function sphereImageGuidance(s: Settings) {
  if (s.spherePhotoFit === "contain" && (s.spherePhotoStretch ?? 0) > 0)
    return `Foto centrada con estiramiento horizontal de +${s.spherePhotoStretch} %, limitado a los 360° disponibles. La imagen completa se ensancha sin recortarse, repetirse ni cambiar de altura. El resto de la esfera queda liso. Los bordes de la foto se suavizan, los polos y el cuello permanecen lisos. La curvatura sigue afectando cómo se ve la imagen desde distintos ángulos.`;
  if (s.spherePhotoFit === "contain")
    return "Foto centrada con proporción conservada: la imagen completa se ajusta a un sector frontal de la franja central, sin recorte ni estiramiento para completar los 360°. Admite fotos cuadradas, verticales y horizontales. La superficie restante queda lisa, con una transición suave en los bordes de la foto. El tamaño se ajusta a la esfera; los píxeles no se interpretan como una medida física en milímetros. La curvatura sigue afectando cómo se ve la imagen desde distintos ángulos. Los polos y el cuello permanecen lisos.";
  return `Imagen recomendada: panorámica horizontal de ${sphereImageSize(s)} (ancho × alto). La foto completa envuelve los 360° de la franja central; los polos quedan lisos, sin imagen, con una transición suave. La franja se limita a ±50° de latitud para alejar la foto de las zonas más curvas. En esferas muy pequeñas se adapta para dejar libre el cuello. Dejá margen a los lados: los bordes izquierdo y derecho se unen atrás. Una foto común se adapta a la franja y puede deformarse; usá una panorámica para reducirlo.`;
}

export function sphereGuide(s: Settings) {
  return [
    "ProyectAR · Esfera navideña con abertura para varios LED",
    "Relieve de la foto en el exterior y cara interior lisa. El diámetro elegido es el máximo exterior del cuerpo: los tonos oscuros forman las zonas más gruesas y los claros quedan más bajos. Los polos y el cuello permanecen lisos.",
    `Esfera Ø${s.width} mm. Abertura superior libre de Ø${s.sphereOpeningDiameter ?? DEFAULT_OPENING_DIAMETER} mm y cuello integrado de ${SPHERE_NECK_HEIGHT} mm de alto, con pared de 2 mm, hombro liso inclinado y reborde exterior de 1 mm. La entrada tiene un chaflán de 0,5 mm; el diámetro elegido es el paso interior mínimo.`,
    "Dos piezas: esfera hueca y tapa desmontable. Introducí los LED por el cuello, pasá el cable por la ranura lateral de 4 mm de la tapa y presioná suavemente sobre el reborde. El paso central mide 5 mm. La tapa tiene 0,3 mm de holgura radial y un faldón abierto que abraza el reborde. Probá primero el encastre con tu material; no fuerces la tapa ni pellizques el cable. La esfera se exporta sobre su base plana y la tapa con su cara exterior plana en la cama, con el faldón hacia arriba. Prepará brim y soportes para la esfera en el laminador.",
    `La tapa incorpora un tubo guía hueco de ${sphereCapTube(s).length.toFixed(1)} mm desde su cara inferior, con pared de 1,2 mm y extremo achaflanado. Diámetro exterior del tubo: ${(sphereCapTube(s).outer * 2).toFixed(1)} mm; diámetro interior: ${(sphereCapTube(s).inner * 2).toFixed(1)} mm. La longitud objetivo es 36 mm y se acorta en esferas pequeñas para dejar libre el fondo. La ranura lateral continúa a lo largo del tubo. Acomodá los LED dentro de la esfera antes de cerrar: el tubo guía el conjunto, no debe usarse para forzar luces o cables. Se imprime con el tubo hacia arriba.`,
    "Medí el conjunto de LED y cables y dejá holgura. La abertura se ajusta de 8 a 30 mm y no retiene los LED automáticamente. No fuerces los LED, no pellizques cables y no modifiques el cableado de la guirnalda.",
    "Usá una sujeción independiente y probá su retención en el cuello antes de colgar. La tapa no es un enganche de suspensión. Colgá del soporte, nunca del cable eléctrico.",
    SPHERE_LED_GUIDANCE,
    sphereImageGuidance(s),
  ].join("\n\n");
}

export function sphereZIP(sphere: Mesh, s: Settings, name: string) {
  const mesh = sphereForPrinting(sphere);
  const cap = sphereCapForPrinting(createSphereCap(s));
  return zipFiles([
    {
      name: `${name}-01-esfera.stl`,
      data: new Uint8Array(binarySTL(mesh.positions, mesh.indices)),
    },
    {
      name: `${name}-02-tapa.stl`,
      data: new Uint8Array(binarySTL(cap.positions, cap.indices)),
    },
    {
      name: "Guia-de-armado.txt",
      data: new TextEncoder().encode(sphereGuide(s)),
    },
  ]);
}
