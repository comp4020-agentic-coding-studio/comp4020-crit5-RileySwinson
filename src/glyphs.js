// Letters live as polyline strokes in a unit box: x and y both run 0..1, y
// down. Strokes get walked into overlapping discs at build time, which is the
// only shape the occlusion pass knows about.

const ELLIPSE = (cx, cy, rx, ry, fromDeg, toDeg, steps = 40) => {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / steps) * Math.PI) / 180;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
};

export const GLYPHS = {
  R: [
    [[0, 0], [0, 1]],
    [[0, 0], [0.34, 0], [0.48, 0.1], [0.48, 0.3], [0.34, 0.42], [0, 0.42]],
    [[0.2, 0.42], [0.52, 1]],
  ],
  G: [
    ELLIPSE(0.29, 0.5, 0.29, 0.5, 18, 342),
    [[0.565, 0.345], [0.565, 0.5], [0.3, 0.5]],
  ],
  B: [
    [[0, 0], [0, 1]],
    [[0, 0], [0.32, 0], [0.46, 0.11], [0.46, 0.36], [0.32, 0.47], [0, 0.47]],
    [[0, 0.47], [0.37, 0.47], [0.53, 0.6], [0.53, 0.87], [0.37, 1], [0, 1]],
  ],
};

function walkStroke(points, radius, step, into) {
  // Walk the whole polyline by arc length, not segment by segment: a glyph
  // built from short segments would otherwise pile a disc on every vertex and
  // fuse back into a solid stroke.
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len <= 0) continue;
    segs.push({ ax, ay, bx, by, len, start: total });
    total += len;
  }
  if (!segs.length) return into;

  const n = Math.max(1, Math.round(total / step));
  for (let k = 0; k <= n; k++) {
    const d = (total * k) / n;
    let seg = segs[segs.length - 1];
    for (const candidate of segs) {
      if (d <= candidate.start + candidate.len) { seg = candidate; break; }
    }
    const t = Math.min(1, (d - seg.start) / seg.len);
    into.push({ x: seg.ax + (seg.bx - seg.ax) * t, y: seg.ay + (seg.by - seg.ay) * t, r: radius });
  }
  return into;
}

/**
 * Discs for one glyph, `height` tall, with its top-left at (x, y).
 *
 * The discs are spaced apart rather than fused into a solid stroke, and that
 * gap is the whole game. A solid letter only ever shows you the edge nearest
 * the click -- a row of separate pillars lets the wavefront through between
 * them, so every pillar takes its own bite out of the band and the bites,
 * together, are the letter.
 */
export function glyphDiscs(letter, x, y, height, { weight = 0.028, pitch = 3.6 } = {}) {
  const strokes = GLYPHS[letter];
  if (!strokes) throw new Error(`no glyph for ${letter}`);
  const r = height * weight;
  const discs = [];
  for (const stroke of strokes) {
    walkStroke(stroke.map(([px, py]) => [x + px * height, y + py * height]), r, r * pitch, discs);
  }
  return discs;
}

/** Width of a glyph's unit box, so callers can centre one. */
export function glyphWidth(letter, height) {
  let max = 0;
  for (const stroke of GLYPHS[letter]) {
    for (const [px] of stroke) max = Math.max(max, px);
  }
  return max * height;
}

// --- seven segment ---------------------------------------------------------
// Bars, in the same unit box as the letters. Each one is its own path, which
// is what lets a level hand different segments of the same digit to different
// channels.

export const SEGMENTS = {
  a: [[0.08, 0.02], [0.52, 0.02]],
  b: [[0.56, 0.06], [0.56, 0.44]],
  c: [[0.56, 0.56], [0.56, 0.94]],
  d: [[0.08, 0.98], [0.52, 0.98]],
  e: [[0.04, 0.56], [0.04, 0.94]],
  f: [[0.04, 0.06], [0.04, 0.44]],
  g: [[0.08, 0.5], [0.52, 0.5]],
};

export const DIGITS = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
  5: 'afgcd', 6: 'afgecd', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
};

export const DIGIT_WIDTH = 0.6;

/** Where the named segments of a digit sit on screen, as polylines. */
export function segmentPaths(segments, x, y, height) {
  return [...segments].map((key) =>
    SEGMENTS[key].map(([px, py]) => [x + px * height, y + py * height]));
}

/** Solid discs for the named segments of a digit. */
export function segmentDiscs(segments, x, y, height, weight = 0.055) {
  const r = height * weight;
  const discs = [];
  for (const path of segmentPaths(segments, x, y, height)) walkStroke(path, r, r * 0.45, discs);
  return discs;
}

// --- walls -----------------------------------------------------------------

function distToPath(px, py, points) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const vx = bx - ax, vy = by - ay;
    const len2 = vx * vx + vy * vy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2)) : 0;
    best = Math.min(best, Math.hypot(px - (ax + vx * t), py - (ay + vy * t)));
  }
  return best;
}

/**
 * `rect` filled solid, with the aperture paths cut out of it. Used one way
 * round it is a wall with slots in it; used the other -- fill the whole level
 * and carve a glyph -- the carving is the only place a ripple can go, and the
 * shape of the hole is the only thing there is to see.
 */
export function wallDiscs(rect, radius, apertures = []) {
  const step = radius * 1.3;
  const cols = Math.max(1, Math.ceil(rect.w / step));
  const rows = Math.max(1, Math.ceil(rect.h / step));
  const out = [];
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      const x = rect.x + (rect.w * i) / cols;
      const y = rect.y + (rect.h * j) / rows;
      if (apertures.some((ap) => distToPath(x, y, ap.points) <= ap.radius)) continue;
      out.push({ x, y, r: radius });
    }
  }
  return out;
}
