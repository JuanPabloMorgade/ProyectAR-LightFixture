import { IMAGE_SIZE } from "./engine";
import { gridSolidMesh, meshAxes } from "./solid-mesh";
import { roundOpening, roundOpeningAxes } from "./round-opening";

/** Rear electronics lid: optional artwork faces the open front; its skirt faces the wall. */
export function wallRearMesh(
  width: number,
  height: number,
  hole: number,
  design: boolean,
  relief: number,
  artwork?: Uint8ClampedArray,
) {
  if (design && (!artwork || artwork.length !== IMAGE_SIZE * IMAGE_SIZE * 4))
    throw new Error(
      "Falta la imagen del proyecto para generar la tapa trasera con diseño.",
    );
  const circle = roundOpeningAxes(width / 2, height / 2, [
    hole / 2,
    hole / 2 + 1,
    hole / 2 + 2,
  ]);
  const axis = (span: number, extra: number[]) =>
    meshAxes(
      [
        0,
        span,
        3.4,
        span - 3.4,
        4.9,
        span - 4.9,
        span / 2 - hole / 2,
        span / 2 + hole / 2,
      ],
      [
        ...extra,
        ...(design
          ? Array.from({ length: 97 }, (_, i) => (span * i) / 96)
          : []),
      ],
      0.12,
    ).map((v) => +v.toFixed(5));
  const xs = axis(width, circle.xs),
    ys = axis(height, circle.ys);
  const columns = xs.length - 1,
    rows = ys.length - 1;
  const heights = new Float64Array(columns * rows);
  const artSpan = Math.min(width, height) - 12;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const px = (xs[x] + xs[x + 1]) / 2,
        py = (ys[y] + ys[y + 1]) / 2;
      if (
        Math.abs(px - width / 2) < hole / 2 &&
        Math.abs(py - height / 2) < hole / 2
      )
        continue;
      let raised = false;
      if (
        design &&
        Math.abs(px - width / 2) < artSpan / 2 &&
        Math.abs(py - height / 2) < artSpan / 2
      ) {
        const ix = Math.min(
          IMAGE_SIZE - 1,
          Math.floor(((px - width / 2) / artSpan + 0.5) * IMAGE_SIZE),
        );
        const iy = Math.min(
          IMAGE_SIZE - 1,
          Math.floor((0.5 - (py - height / 2) / artSpan) * IMAGE_SIZE),
        );
        const k = (iy * IMAGE_SIZE + ix) * 4;
        raised =
          ((artwork![k] * 0.2126 +
            artwork![k + 1] * 0.7152 +
            artwork![k + 2] * 0.0722) *
            artwork![k + 3]) /
            255 >=
          128;
      }
      heights[y * columns + x] = 2 + (raised ? relief : 0);
    }
  // Merge diagonal relief contacts without filling the mandatory central opening.
  if (design) {
    const blocked = new Uint8Array(heights.length);
    let changed = true;
    while (changed) {
      changed = false;
      for (let y = 0; y < rows - 1; y++)
        for (let x = 0; x < columns - 1; x++) {
          const a = y * columns + x,
            ids = [a, a + 1, a + columns, a + columns + 1];
          const hi = ids.map((k) => heights[k] > 2);
          if (hi[0] === hi[3] && hi[1] === hi[2] && hi[0] !== hi[1]) {
            const fill = ids.find(
              (k, i) => !hi[i] && heights[k] > 0 && !blocked[k],
            );
            if (fill !== undefined) heights[fill] = 2 + relief;
            else {
              const k = ids.find((_, i) => hi[i])!;
              heights[k] = 2;
              blocked[k] = 1;
            }
            changed = true;
          }
        }
    }
  }
  const mx = new Map(xs.slice(0, -1).map((v, i) => [(v + xs[i + 1]) / 2, i]));
  const my = new Map(ys.slice(0, -1).map((v, i) => [(v + ys[i + 1]) / 2, i]));
  const mesh = gridSolidMesh(
    xs,
    ys,
    [-3, 0, 2, ...(design ? [2 + relief] : [])],
    (x, y, z) => {
      const top = heights[my.get(y)! * columns + mx.get(x)!];
      if (!top) return false;
      const skirt =
        x > 3.4 &&
        x < width - 3.4 &&
        y > 3.4 &&
        y < height - 3.4 &&
        !(x > 4.9 && x < width - 4.9 && y > 4.9 && y < height - 4.9);
      return z < top && (z > 0 || skirt);
    },
  );
  // Positive print Z, with the skirt upward. Assembly reflects this back into place.
  const top = 2 + (design ? relief : 0);
  for (let i = 2; i < mesh.positions.length; i += 3)
    mesh.positions[i] = top - mesh.positions[i];
  for (let i = 0; i < mesh.indices.length; i += 3)
    [mesh.indices[i + 1], mesh.indices[i + 2]] = [
      mesh.indices[i + 2],
      mesh.indices[i + 1],
    ];
  return roundOpening(mesh, width / 2, height / 2, hole / 2);
}
