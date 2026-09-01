import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildHorizon, rayDiscHit, reaches } from '../src/occlusion.js';

// The one rule the game rests on: a ripple stops at geometry, it does not
// continue past it, and it is only stopped inside the shadow that geometry
// actually casts from where the click happened.

const ORIGIN = { x: 0, y: 0 };
const BLOCKER = { x: 100, y: 0, r: 20 };

test('a ray meets a disc at its near edge', () => {
  assert.equal(rayDiscHit(ORIGIN.x, ORIGIN.y, 0, BLOCKER), 80);
});

test('a ray to one side of a disc misses it entirely', () => {
  // The disc subtends asin(20/100) ~= 11.5 degrees; 30 degrees is clear of it.
  assert.equal(rayDiscHit(ORIGIN.x, ORIGIN.y, Math.PI / 6, BLOCKER), Infinity);
});

test('a disc behind the origin does not block the ray in front', () => {
  assert.equal(rayDiscHit(ORIGIN.x, ORIGIN.y, 0, { x: -100, y: 0, r: 20 }), Infinity);
});

test('the wavefront reaches geometry but never passes it', () => {
  const horizon = buildHorizon(ORIGIN.x, ORIGIN.y, [BLOCKER]);
  assert.equal(reaches(horizon, 0, 50), true, 'short of the blocker');
  assert.equal(reaches(horizon, 0, 79), true, 'just short of the blocker');
  assert.equal(reaches(horizon, 0, 81), false, 'stopped at the blocker');
  assert.equal(reaches(horizon, 0, 4000), false, 'still stopped, far beyond it');
});

test('the shadow is no wider than the blocker', () => {
  const horizon = buildHorizon(ORIGIN.x, ORIGIN.y, [BLOCKER]);
  const half = Math.asin(BLOCKER.r / 100);
  assert.equal(reaches(horizon, half * 0.5, 500), false, 'inside the shadow');
  assert.equal(reaches(horizon, half * 2, 500), true, 'outside the shadow');
  assert.equal(reaches(horizon, Math.PI, 500), true, 'the far side is untouched');
});

test('the nearest of two stacked blockers is the one that stops the ripple', () => {
  const horizon = buildHorizon(ORIGIN.x, ORIGIN.y, [
    { x: 300, y: 0, r: 20 },
    BLOCKER,
  ]);
  assert.equal(reaches(horizon, 0, 90), false);
});

test('a click inside geometry gets nothing out', () => {
  const horizon = buildHorizon(BLOCKER.x, BLOCKER.y, [BLOCKER]);
  for (const theta of [0, 1, 2, 3, 4, 5]) {
    assert.equal(reaches(horizon, theta, 1), false);
  }
});

test('empty geometry stops nothing', () => {
  const horizon = buildHorizon(ORIGIN.x, ORIGIN.y, []);
  assert.equal(reaches(horizon, 0, 1e6), true);
});

// Level 3 rests on the other half of the same rule: a wall stops everything
// except what lines up with a hole, and what lines up with a hole carries on.

test('a wall stops the wavefront, and its aperture lets it through', async () => {
  const { wallDiscs } = await import('../src/glyphs.js');
  const rect = { x: -400, y: 200, w: 800, h: 60 };
  const slot = { points: [[0, 200], [0, 260]], radius: 22 };
  const wall = wallDiscs(rect, 8, [slot]);

  assert.ok(wall.length > 100, 'the wall is solid enough to test');
  assert.ok(
    wall.every((d) => Math.abs(d.x) > 20 || d.y < 200 || d.y > 260),
    'no wall disc sits inside the aperture',
  );

  const horizon = buildHorizon(0, 0, wall);
  const straightUp = Math.PI / 2; // toward the wall, through the slot
  assert.equal(reaches(horizon, straightUp, 600), true, 'the aperture passes it');
  assert.equal(reaches(horizon, Math.atan2(230, 200), 600), false, 'the wall stops it');
});

test('a point inside geometry is recognised as unpingable', async () => {
  const { isInside } = await import('../src/occlusion.js');
  assert.equal(isInside(100, 0, [BLOCKER]), true, 'dead centre');
  assert.equal(isInside(119, 0, [BLOCKER]), true, 'just inside the edge');
  assert.equal(isInside(121, 0, [BLOCKER]), false, 'just outside it');
  assert.equal(isInside(0, 0, []), false, 'nothing to be inside of');
});
