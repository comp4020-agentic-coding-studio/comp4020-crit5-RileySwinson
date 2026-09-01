// A ripple expands from a fixed origin, so the distance it can travel in any
// given direction is fixed too. Precompute that once per ripple as one
// distance per angular bin -- the "horizon" -- and drawing a frame becomes a
// lookup instead of a raycast.
//
// Geometry is a list of discs. Overlapping discs make strokes, strokes make
// letters, and a ray-vs-disc test is five lines of algebra.

export const BINS = 2048;

const TAU = Math.PI * 2;

function wrap(i, n) {
  return ((i % n) + n) % n;
}

/**
 * Nearest distance along the ray leaving (ox, oy) at `theta` that meets
 * `disc`, or Infinity if the ray misses it or the disc sits behind the origin.
 */
export function rayDiscHit(ox, oy, theta, disc) {
  const dx = disc.x - ox;
  const dy = disc.y - oy;
  const d = Math.hypot(dx, dy);
  if (d <= disc.r) return 0; // the origin is inside the disc

  const delta = theta - Math.atan2(dy, dx);
  const across = d * Math.sin(delta);
  const inside = disc.r * disc.r - across * across;
  if (inside <= 0) return Infinity; // the ray passes to one side

  const along = d * Math.cos(delta);
  if (along <= 0) return Infinity; // the disc is behind us

  return along - Math.sqrt(inside);
}

/**
 * How far a ripple from (ox, oy) reaches in each direction. Only the bins
 * inside a disc's angular wedge are touched, so cost tracks how much of the
 * view the geometry actually covers rather than how much geometry there is.
 */
export function buildHorizon(ox, oy, discs, bins = BINS) {
  const horizon = new Float64Array(bins).fill(Infinity);
  const arc = TAU / bins;

  for (const disc of discs) {
    const dx = disc.x - ox;
    const dy = disc.y - oy;
    const d = Math.hypot(dx, dy);

    if (d <= disc.r) {
      horizon.fill(0); // standing inside geometry: nothing gets out
      return horizon;
    }

    const centre = Math.atan2(dy, dx);
    const half = Math.asin(disc.r / d);
    const from = Math.floor((centre - half) / arc);
    const to = Math.ceil((centre + half) / arc);

    for (let i = from; i <= to; i++) {
      const t = rayDiscHit(ox, oy, i * arc, disc);
      const bin = wrap(i, bins);
      if (t < horizon[bin]) horizon[bin] = t;
    }
  }

  return horizon;
}

/** Has the wavefront at `radius` been stopped before it got here? */
export function reaches(horizon, theta, radius) {
  const bins = horizon.length;
  const bin = wrap(Math.round(theta / (TAU / bins)), bins);
  return radius < horizon[bin];
}

/** Is this point inside the geometry -- somewhere a ripple can't start? */
export function isInside(x, y, discs) {
  for (const disc of discs) {
    if (Math.hypot(disc.x - x, disc.y - y) <= disc.r) return true;
  }
  return false;
}

/** Where the wavefront was stopped in this direction, if it was. */
export function stoppedAt(horizon, theta) {
  const bins = horizon.length;
  return horizon[wrap(Math.round(theta / (TAU / bins)), bins)];
}

export function clearHorizon(bins = BINS) {
  return new Float64Array(bins).fill(Infinity);
}
