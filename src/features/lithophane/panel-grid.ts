import { markAxis, modelMark } from "@/lib/model-mark";
import type { Settings } from "./mesh";

/** Keep paired front/back vertices and include lettering even at low detail. */
export function panelGrid(s: Settings) {
  const cols = Math.max(
    2,
    Math.round((s.resolution * s.width) / Math.max(s.width, s.height)),
  );
  const rows = Math.max(
    2,
    Math.round((s.resolution * s.height) / Math.max(s.width, s.height)),
  );
  const vertical = s.angle > 0;
  const markWidth = vertical ? 4 : s.width - 10;
  const markHeight = vertical ? s.height - 10 : 4;
  const centered = modelMark(0, 0, markWidth, markHeight, vertical);
  // Rear-right is negative assembly X when looking directly at the back.
  // Align the ink bounds, keeping 5 mm clear of the bottom and side edges.
  const mark = modelMark(
    vertical
      ? -s.width / 2 + 6
      : -s.width / 2 + 5 - Math.min(...centered.cells.map((c) => c[0])),
    vertical
      ? 0
      : -s.height / 2 + 5 - Math.min(...centered.cells.map((c) => c[2])),
    markWidth,
    markHeight,
    vertical,
  );
  const xs = markAxis(
    Array.from({ length: cols + 1 }, (_, i) => (i / cols - 0.5) * s.width),
    mark.xs,
  );
  const ys = markAxis(
    Array.from({ length: rows + 1 }, (_, i) => (i / rows - 0.5) * s.height),
    mark.ys,
  );
  return { xs, ys, cols: xs.length - 1, rows: ys.length - 1, mark };
}
