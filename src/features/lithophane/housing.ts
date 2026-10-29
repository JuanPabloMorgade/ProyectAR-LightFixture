import { solidMesh, type Bounds, type Mesh } from "../shadowbox/solid-mesh";
import { validateSettings, type Settings } from "./mesh";
import { defaultHousing, hasHousing } from "./housing-config";

export type HousingPart = Mesh & {
  id: "body" | "bezel" | "lid";
  filename: string;
  label: string;
};
export const HOUSING_WALL = 2.4;
const SKIRT = 1.4,
  ENGAGEMENT = 3,
  OVERLAP = 2;

export function housingLayout(s: Settings) {
  validateSettings(s);
  const h = s.housing ?? defaultHousing;
  const radius = s.angle ? s.width / ((s.angle * Math.PI) / 180) : 0;
  const halfWidth = s.width / 2,
    halfHeight = s.height / 2;
  const innerX = halfWidth + SKIRT + h.clearance;
  const innerY = halfHeight + SKIRT + h.clearance;
  const outerX = innerX + HOUSING_WALL,
    outerY = innerY + HOUSING_WALL;
  if (
    radius &&
    (radius - h.depth - HOUSING_WALL < 6 ||
      outerX / radius >= Math.PI / 2 - 0.01)
  )
    throw new Error(
      "La caja no entra en esta curvatura. Reducí su profundidad, aumentá el ancho del arco o elegí Plano.",
    );
  return {
    ...h,
    radius,
    halfWidth,
    halfHeight,
    innerX,
    innerY,
    outerX,
    outerY,
    front: s.max + h.clearance / 2,
    // Reach below even the thinnest photo edge to center it without touching the seat.
    frontEngagement: s.max + h.clearance / 2 - Math.min(s.min / 2, 0.5),
    back: -h.depth,
    wall: HOUSING_WALL,
  };
}

/** Intrinsic arc coordinates → assembly mm. The radius stays positive throughout. */
export function housingPoint(
  u: number,
  y: number,
  depth: number,
  radius: number,
): [number, number, number] {
  return radius
    ? [
        (radius + depth) * Math.sin(u / radius),
        y,
        (radius + depth) * Math.cos(u / radius) - radius,
      ]
    : [u, y, depth];
}

export function createHousingParts(s: Settings): HousingPart[] {
  validateSettings(s);
  if (!hasHousing(s)) return [];
  const l = housingLayout(s),
    c = l.clearance,
    w = l.wall;
  const ring = (
    ox: number,
    oy: number,
    ix: number,
    iy: number,
    z0: number,
    z1: number,
  ): Bounds[] => [
    [-ox, -ix, -oy, oy, z0, z1],
    [ix, ox, -oy, oy, z0, z1],
    [-ix, ix, -oy, -iy, z0, z1],
    [-ix, ix, iy, oy, z0, z1],
  ];
  const curveAxes = l.radius
    ? Array.from({ length: 97 }, (_, i) => -l.outerX + (2 * l.outerX * i) / 96)
    : [];
  const mesh = (boxes: Bounds[], cuts: Bounds[] = []): Mesh => {
    const source = solidMesh(boxes, cuts, undefined, 0, {
      xs: curveAxes,
      ys: [],
      minimumGap: 0.05,
    });
    const positions = new Float32Array(source.positions.length);
    for (let i = 0; i < positions.length; i += 3)
      positions.set(
        housingPoint(
          source.positions[i],
          source.positions[i + 1],
          source.positions[i + 2],
          l.radius,
        ),
        i,
      );
    return { positions, indices: source.indices };
  };
  // Photo enters from the front and rests on this rear shoulder. Bezel is removable.
  const bodyBoxes = [
    ...ring(l.outerX, l.outerY, l.innerX, l.innerY, l.back, l.front),
    ...ring(
      l.innerX,
      l.innerY,
      l.halfWidth - OVERLAP,
      l.halfHeight - OVERLAP,
      -1.6 - c / 2,
      -c / 2,
    ),
  ];
  const wireHalf = l.radius
    ? l.radius * Math.asin(2 / (l.radius + l.back + 4))
    : 2;
  const body = mesh(bodyBoxes, [
    [-wireHalf, wireHalf, -l.outerY, -l.innerY, l.back + 4, l.back + 8],
  ]);
  const bezel = mesh([
    ...ring(
      l.outerX,
      l.outerY,
      l.halfWidth - OVERLAP,
      l.halfHeight - OVERLAP,
      l.front,
      l.front + w,
    ),
    ...ring(
      l.innerX - c / 2,
      l.innerY - c / 2,
      l.innerX - c / 2 - SKIRT,
      l.innerY - c / 2 - SKIRT,
      l.front - l.frontEngagement,
      l.front,
    ),
  ]);
  const lid = mesh([
    [-l.outerX, l.outerX, -l.outerY, l.outerY, l.back - w, l.back],
    ...ring(
      l.innerX - c / 2,
      l.innerY - c / 2,
      l.innerX - c / 2 - SKIRT,
      l.innerY - c / 2 - SKIRT,
      l.back,
      l.back + ENGAGEMENT,
    ),
  ]);
  return [
    {
      ...body,
      id: "body",
      filename: "02-caja-trasera",
      label: "Caja para iluminación",
    },
    {
      ...bezel,
      id: "bezel",
      filename: "03-marco-frontal",
      label: "Marco de sujeción de la foto",
    },
    {
      ...lid,
      id: "lid",
      filename: "04-tapa-trasera",
      label: "Tapa desmontable para la luz",
    },
  ];
}

/** Orient the separate housing STL parts on their planar support faces. */
export function housingPrintMesh(part: HousingPart, s: Settings): Mesh {
  const l = housingLayout(s),
    positions = new Float32Array(part.positions.length),
    indices = part.indices.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const x = part.positions[i],
      y = part.positions[i + 1],
      z = part.positions[i + 2];
    positions.set(
      l.radius
        ? [x, -z, y + l.outerY]
        : part.id === "bezel"
          ? [x, -y, l.front + l.wall - z]
          : [x, y, z - l.back + (part.id === "lid" ? l.wall : 0)],
      i,
    );
  }
  return { positions, indices };
}

export function housingGuide(s: Settings) {
  const l = housingLayout(s);
  return [
    "ProyectAR · Litofanía con caja trasera",
    `Panel ${s.width} × ${s.height} mm; arco ${s.angle}°. Profundidad radial de caja ${l.depth} mm; pared ${l.wall} mm; holgura total ${l.clearance} mm.`,
    "01: panel de la foto. 02: caja. 03: marco frontal. 04: tapa trasera.",
    "Colocá la foto desde el frente de la caja, con el relieve hacia la habitación y el dorso hacia la luz. Apoya en el asiento interior. El marco frontal sujeta 2 mm del perímetro y entra con reborde de guiado.",
    "Instalá la iluminación en la cara interior de la tapa posterior y pasá el cable por la abertura inferior de 4 mm. La tapa tiene un reborde guiado y se retira para acceder a la luz. No se incluyen LED, fuente, conector ni tornillos.",
    "Son ajustes guiados sin pestillo. Probá la holgura con tu impresora y usá una fijación removible si hace falta. El marco y la tapa se imprimen separados; no deben fusionarse con el panel.",
    l.radius
      ? "Caja y tapas curvas se entregan orientadas de pie sobre su borde inferior. Revisá apoyos y soportes para los tramos superiores en el laminador."
      : "Caja plana con abertura posterior sobre la cama; marco con cara exterior sobre la cama y reborde hacia arriba; tapa posterior con cara lisa sobre la cama. Revisá los pequeños voladizos del asiento.",
    "Usá iluminación LED y comprobá el espacio de sus componentes, la distribución de luz y la temperatura antes de cerrar. La vista iluminada es una aproximación visual del relieve, no una simulación de la lámpara instalada.",
  ].join("\n");
}
