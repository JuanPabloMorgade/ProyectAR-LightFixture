/** Original pixel lettering, embedded so workers and STL exports need no fonts. */
export const MODEL_MARK = "©Generado en ProyectAR";
export const MARK_DEPTH = 0.24;
const glyphs: Record<string, string[]> = {
  "©": [
    "0111110",
    "1000001",
    "1011101",
    "1010001",
    "1011101",
    "1000001",
    "0111110",
  ],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01111"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  c: ["00000", "00000", "01111", "10000", "10000", "10000", "01111"],
  t: ["00100", "00100", "11111", "00100", "00100", "00101", "00010"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  " ": Array(7).fill("000"),
};

export function modelMark(
  cx: number,
  cy: number,
  width: number,
  height: number,
  vertical = false,
  rear = true,
) {
  const bitmap = Array.from({ length: 9 }, () => [0]);
  for (const char of MODEL_MARK) {
    const glyph = glyphs[char];
    for (let y = 0; y < 9; y++)
      bitmap[y].push(
        ...(y > 0 && y < 8
          ? [...glyph[y - 1]].map(Number)
          : Array(glyph[0].length).fill(0)),
        0,
      );
  }
  const columns = bitmap[0].length,
    rows = bitmap.length;
  // Eliminate diagonal-only contacts: engraved cavities must have manifold walls.
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < rows - 1; y++)
      for (let x = 0; x < columns - 1; x++) {
        const a = bitmap[y][x],
          b = bitmap[y][x + 1],
          c = bitmap[y + 1][x],
          d = bitmap[y + 1][x + 1];
        if (a === d && b === c && a !== b) {
          if (!a) bitmap[y][x] = 1;
          else bitmap[y][x + 1] = 1;
          changed = true;
        }
      }
  }
  const cell = Math.min(
    0.48,
    (vertical ? height : width) / columns,
    (vertical ? width : height) / rows,
  );
  const point = (u: number, v: number) => {
    const a = (u - columns / 2) * cell * (rear ? -1 : 1),
      b = (rows / 2 - v) * cell;
    return vertical ? [cx - b, cy + a] : [cx + a, cy + b];
  };
  const cells: [number, number, number, number][] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++)
      if (bitmap[y][x]) {
        const start = x;
        while (x + 1 < columns && bitmap[y][x + 1]) x++;
        const a = point(start, y),
          b = point(x + 1, y + 1);
        cells.push([
          Math.min(a[0], b[0]),
          Math.max(a[0], b[0]),
          Math.min(a[1], b[1]),
          Math.max(a[1], b[1]),
        ]);
      }
  const sample = (x: number, y: number) => {
    const a = vertical ? y - cy : x - cx,
      b = vertical ? cx - x : y - cy;
    const u = (a / cell) * (rear ? -1 : 1) + columns / 2 - 0.5,
      v = rows / 2 - b / cell - 0.5;
    const ix = Math.floor(u),
      iy = Math.floor(v),
      fx = u - ix,
      fy = v - iy;
    const at = (i: number, j: number) => bitmap[j]?.[i] ?? 0;
    return (
      (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy) +
      (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy
    );
  };
  const centers = Array.from({ length: columns }, (_, i) =>
    point(i + 0.5, rows / 2),
  );
  const cross = Array.from({ length: rows }, (_, i) =>
    point(columns / 2, i + 0.5),
  );
  return {
    cell,
    cells,
    sample,
    xs: (vertical ? cross : centers).map((p) => p[0]),
    ys: (vertical ? centers : cross).map((p) => p[1]),
    contains: (x: number, y: number) => {
      const a = vertical ? y - cy : x - cx,
        b = vertical ? cx - x : y - cy;
      return Boolean(
        bitmap[Math.floor(rows / 2 - b / cell)]?.[
          Math.floor((a / cell) * (rear ? -1 : 1) + columns / 2)
        ],
      );
    },
    cuts: (
      z0: number,
      z1: number,
    ): [number, number, number, number, number, number][] =>
      cells.map((c) => [...c, z0, z1]),
  };
}

export function markAxis(base: number[], extra: number[]) {
  return [...new Set([...base, ...extra].map((x) => +x.toFixed(7)))].sort(
    (a, b) => a - b,
  );
}
