/** Deterministic height fields in millimetres, bounded to [0, 1].
 * Positive values recess the exterior; never add material outside the envelope.
 */
const wrap = (v: number, period = 5) => v - period * Math.round(v / period);
const groove = (distance: number, halfWidth = 1.2) =>
  distance < halfWidth
    ? (1 + Math.cos((Math.PI * distance) / halfWidth)) / 2
    : 0;

// Integer hash: fixed seed, independent of render order and worker lifetime.
function random(x: number, y: number, seed = 731) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export const smoothProfile = () => 0;
export const linesProfile = (x: number, y: number) =>
  groove(Math.abs(wrap((x + y) / Math.SQRT2)));
export const wavesProfile = (x: number, y: number) =>
  groove(Math.abs(wrap(x + 1.4 * Math.sin(y / 4))));
export const dotsProfile = (x: number, y: number) =>
  groove(Math.hypot(wrap(x), wrap(y)));

export function hexagonalProfile(x: number, y: number) {
  // Triangular lattice of centres; perpendicular bisectors form regular hexagons.
  const spacing = 8,
    rowHeight = (spacing * Math.sqrt(3)) / 2;
  let nearest = Infinity,
    dx = 0,
    dy = 0;
  const row = Math.round(y / rowHeight);
  for (let j = row - 1; j <= row + 1; j++) {
    const i = Math.round(x / spacing - j / 2);
    const u = x - spacing * (i + j / 2),
      v = y - rowHeight * j;
    if (u * u + v * v < nearest) {
      nearest = u * u + v * v;
      dx = u;
      dy = v;
    }
  }
  const edge =
    spacing / 2 -
    Math.max(
      Math.abs(dx),
      Math.abs(dx / 2 + (dy * Math.sqrt(3)) / 2),
      Math.abs(dx / 2 - (dy * Math.sqrt(3)) / 2),
    );
  return groove(Math.max(0, edge), 0.9);
}

export function lowPolyProfile(x: number, y: number) {
  // Two planar triangles per 7 mm lattice cell. Shared vertex heights make
  // the field continuous, including negative coordinates and cell boundaries.
  const u = x / 7,
    v = y / 7,
    i = Math.floor(u),
    j = Math.floor(v);
  const a = u - i,
    b = v - j;
  const h00 = random(i, j),
    h11 = random(i + 1, j + 1);
  return a >= b
    ? h00 * (1 - a) + random(i + 1, j) * (a - b) + h11 * b
    : h00 * (1 - b) + random(i, j + 1) * (b - a) + h11 * a;
}

export function topographicProfile(x: number, y: number) {
  const terrain =
    10 * Math.sin(x / 16) + 8 * Math.cos(y / 14) + 4 * Math.sin((x + y) / 21);
  return groove(Math.abs(wrap(terrain, 4.5)));
}

export function diamondProfile(x: number, y: number) {
  return Math.max(linesProfile(x, y), linesProfile(x, -y));
}

// A bounded cache of neighbourhoods avoids hashing the same sites for every
// vertex and thumbnail pixel. Eviction only affects speed, never the pattern.
const neighbourhoods = new Map<string, Float64Array>();
function sites(i: number, j: number) {
  const key = `${i},${j}`;
  const cached = neighbourhoods.get(key);
  if (cached) return cached;
  const points = new Float64Array(25 * 3);
  let k = 0;
  for (let y = j - 2; y <= j + 2; y++)
    for (let x = i - 2; x <= i + 2; x++) {
      points[k++] = x + 0.5 + 0.44 * (random(x, y, 731) - 0.5);
      points[k++] = y + 0.5 + 0.44 * (random(x, y, 991) - 0.5);
      points[k++] = random(x, y, 337);
    }
  if (neighbourhoods.size >= 512)
    neighbourhoods.delete(neighbourhoods.keys().next().value!);
  neighbourhoods.set(key, points);
  return points;
}

export function voronoiProfile(x: number, y: number) {
  const spacing = 8,
    u = x / spacing,
    v = y / spacing;
  const points = sites(Math.floor(u), Math.floor(v));
  let nearest = Infinity,
    best = 0;
  for (let i = 0; i < points.length; i += 3) {
    const d = (u - points[i]) ** 2 + (v - points[i + 1]) ** 2;
    if (d < nearest) {
      nearest = d;
      best = i;
    }
  }
  let boundary = Infinity;
  for (let i = 0; i < points.length; i += 3) {
    if (i === best) continue;
    const d = (u - points[i]) ** 2 + (v - points[i + 1]) ** 2;
    // Distance to each bisector, not merely F2-F1: uniform physical groove width.
    boundary = Math.min(
      boundary,
      ((d - nearest) * spacing) /
        (2 *
          Math.hypot(
            points[i] - points[best],
            points[i + 1] - points[best + 1],
          )),
    );
  }
  return groove(Math.max(0, boundary), 0.9);
}

export function woodProfile(x: number, y: number) {
  // Long-grain, incommensurate waves: gentle drift without a short repeat tile.
  const grain =
    x +
    1.8 * Math.sin(y / 17 + 0.7 * Math.sin(x / 13)) +
    0.9 * Math.sin(y / 7 + x / 19) +
    0.7 * Math.sin(x / 9 + y / 31);
  return groove(Math.abs(wrap(grain, 4.8)), 1);
}

export function concentricProfile(x: number, y: number) {
  return groove(Math.abs(wrap(Math.hypot(x, y), 5)));
}

export function hammeredProfile(x: number, y: number) {
  const spacing = 5.5,
    u = x / spacing,
    v = y / spacing;
  const points = sites(Math.floor(u), Math.floor(v));
  let depth = 0;
  for (let i = 0; i < points.length; i += 3) {
    const radius = 1.5 + points[i + 2] * 0.8;
    const distance = Math.hypot(u - points[i], v - points[i + 1]) * spacing;
    depth = Math.max(
      depth,
      groove(distance, radius) * (0.65 + 0.35 * points[i + 2]),
    );
  }
  return depth;
}
