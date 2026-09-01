import assert from 'node:assert/strict';
import { test } from 'vitest';
import { GROUP_CENTRES, GROUP_SPAN, LEVELS, TOTAL_LEVELS } from '../src/levels.js';

const stones = LEVELS.find((l) => l.id === 4);

const W = 1200;
const H = 800;

/** Which clutch a stone belongs to, by the band of the screen it sits in. */
function group(disc) {
  const t = disc.x / W;
  return GROUP_CENTRES.findIndex((c) => Math.abs(t - c) <= GROUP_SPAN / 2 + 0.001);
}

test('the counter counts every level there is', () => {
  assert.equal(LEVELS.length, TOTAL_LEVELS);
  for (const level of LEVELS) assert.equal(level.code.length, 3);
});

test('level 4 is the last one', () => {
  assert.equal(LEVELS[LEVELS.length - 1].id, 4);
});

test('level 4 has one world, and it is black', () => {
  assert.deepEqual(stones.channels, ['k']);
  assert.equal(stones.clicks, 3);
});

test('level 4 deals a code that is exactly what there is to count', () => {
  for (let i = 0; i < 200; i++) {
    stones.reset();
    const field = stones.build(W, H).k;

    assert.match(stones.code, /^[1-5]{3}$/, 'three digits, each one to five');

    const counted = [0, 0, 0];
    for (const disc of field) {
      const g = group(disc);
      assert.ok(g >= 0, 'every stone belongs to a clutch');
      counted[g] += 1;
    }
    assert.equal(counted.join(''), stones.code, 'the code is the count, left to right');
  }
});

test('level 4 never stacks two stones close enough to read as one', () => {
  for (const [w, h] of [[1200, 800], [390, 844], [1920, 1080]]) {
    for (let i = 0; i < 60; i++) {
      stones.reset();
      const field = stones.build(w, h).k;
      for (let a = 0; a < field.length; a++) {
        for (let b = a + 1; b < field.length; b++) {
          const gap = Math.hypot(field[a].x - field[b].x, field[a].y - field[b].y);
          assert.ok(gap > field[a].r * 2.5, `stones too close to count apart at ${w}x${h}`);
        }
      }
    }
  }
});

test('level 4 keeps its clutches further apart than the stones inside them', () => {
  // The grouping only reads if the gap between clutches beats the gap between
  // neighbouring stones, at the tightest a clutch can pack.
  const widest = GROUP_SPAN / 4; // five stones spread across the span
  const between = GROUP_CENTRES[1] - GROUP_CENTRES[0] - GROUP_SPAN;
  assert.ok(between > widest * 1.5, `clutch gap ${between} vs stone gap ${widest}`);
});

// --- level 3 -----------------------------------------------------------------

test('level 3 slots let a ping from outside reach the cavity, and nothing else does', async () => {
  const { CAVITY, cavityLayout, cavitySlots } = await import('../src/levels.js');
  const { buildHorizon, reaches } = await import('../src/occlusion.js');

  const cavern = LEVELS.find((l) => l.id === 3);
  const { height, width, x, rect } = cavityLayout(W, H);
  const geometry = cavern.build(W, H);

  for (const channel of Object.keys(CAVITY)) {
    const [left, right] = cavitySlots(channel, W, H);
    const discs = geometry[channel];
    const label = `${channel} (digit ${CAVITY[channel]})`;

    // Straight at the left slot from well outside the slab.
    const fromLeft = { x: rect.x - 120, y: left.points[0][1] };
    assert.equal(
      reaches(buildHorizon(fromLeft.x, fromLeft.y, discs), 0, x + height * 0.1 - fromLeft.x),
      true,
      `${label}: the left slot should let a ping through to the cavity`,
    );

    // And at the right slot from the other side.
    const fromRight = { x: rect.x + rect.w + 120, y: right.points[0][1] };
    assert.equal(
      reaches(buildHorizon(fromRight.x, fromRight.y, discs), Math.PI, fromRight.x - (x + height * 0.5)),
      true,
      `${label}: the right slot should let a ping through to the cavity`,
    );

    // The skin is still a skin everywhere else.
    const atTheSkin = { x: rect.x - 120, y: rect.y + 10 };
    assert.equal(
      reaches(buildHorizon(atTheSkin.x, atTheSkin.y, discs), 0, 160),
      false,
      `${label}: the slab should still stop a ping that misses the slots`,
    );
  }
});
