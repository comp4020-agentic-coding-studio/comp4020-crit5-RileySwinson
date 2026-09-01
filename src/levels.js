import {
  DIGITS, DIGIT_WIDTH, glyphDiscs, glyphWidth, segmentDiscs, segmentPaths, wallDiscs,
} from './glyphs.js';

const CHANNELS = ['r', 'g', 'b'];

// --- 1: what you can see is the answer -------------------------------------

function centredLetter(letter, w, h) {
  const height = Math.min(w, h) * 0.44;
  const width = glyphWidth(letter, height);
  return glyphDiscs(letter, (w - width) / 2, (h - height) / 2, height, { pitch: 0.45 });
}

// --- 2: no one channel holds a whole digit ---------------------------------
//
// Three digits, in the same three places in every channel, with each digit's
// segments dealt out between the channels. Any single channel is fragments;
// the code only exists once you hold all three at once.

const SPLIT = [
  { r: 'fc', g: 'g', b: 'b' },    // 4
  { r: 'gd', g: 'ae', b: 'fc' },  // 6
  { r: 'b', g: 'gd', b: 'ae' },   // 2
];

function splitDigits(w, h) {
  const height = Math.min(w, h) * 0.34;
  const width = DIGIT_WIDTH * height;
  const gap = width * 0.75;
  const left = (w - (3 * width + 2 * gap)) / 2;
  const top = (h - height) / 2;

  const out = { r: [], g: [], b: [] };
  SPLIT.forEach((deal, i) => {
    const x = left + i * (width + gap);
    for (const channel of CHANNELS) {
      out[channel].push(...segmentDiscs(deal[channel], x, top, height));
    }
  });
  return out;
}

// --- 3: the answer is the hole ---------------------------------------------
//
// The level is solid, apart from one digit-shaped cavity per channel. A ping
// from the rock goes nowhere and a ping from inside the hollow can only ever
// draw the hollow, so what you are reading is the shape of the space you are
// standing in.
//
// Two slots breach the slab, one on each side, at different heights. They cut
// through the outer skin only and stop at the edge of the digit, so they never
// add a stroke that isn't there -- but where the digit has an outer stroke on
// that side, the slot opens onto it and a ping from outside gets dots in.

export const CAVITY = { r: '7', g: '0', b: '4' };

// A slot is only worth cutting if it opens onto something. Each side looks for
// a height where its digit actually has an outer stroke -- the left verticals,
// or failing that the top or bottom bar, which reach almost to the edge of the
// box as well. Left prefers high, right prefers low, so the two never line up
// into a tunnel straight through.
const LEFT_ANCHORS = [['f', 0.25], ['e', 0.75], ['a', 0.02], ['d', 0.98]];
const RIGHT_ANCHORS = [['c', 0.75], ['b', 0.25], ['d', 0.98], ['a', 0.02]];

function anchorHeight(digit, anchors) {
  for (const [segment, t] of anchors) if (DIGITS[digit].includes(segment)) return t;
  return 0.5;
}

export function cavityLayout(w, h) {
  const height = Math.min(w, h) * 0.55;
  const width = DIGIT_WIDTH * height;
  const x = (w - width) / 2;
  const y = (h - height) / 2;
  // The rock is a slab, not the whole level: ping from outside and you find a
  // block sitting there, with two slots in it.
  const pad = height * 0.13;
  const rect = { x: x - pad, y: y - pad, w: width + pad * 2, h: height + pad * 2 };
  return { height, width, x, y, rect, slotRadius: height * 0.045 };
}

/** Where each slot cuts through the skin, for one channel's digit. */
export function cavitySlots(channel, w, h) {
  const { height, width, x, y, rect, slotRadius } = cavityLayout(w, h);
  const digit = CAVITY[channel];
  const left = y + height * anchorHeight(digit, LEFT_ANCHORS);
  const right = y + height * anchorHeight(digit, RIGHT_ANCHORS);
  return [
    { points: [[rect.x - 6, left], [x, left]], radius: slotRadius },
    { points: [[x + width, right], [rect.x + rect.w + 6, right]], radius: slotRadius },
  ];
}

function digitCavity(w, h) {
  const { height, x, y, rect } = cavityLayout(w, h);
  const out = {};
  for (const channel of CHANNELS) {
    const cavity = segmentPaths(DIGITS[CAVITY[channel]], x, y, height)
      .map((points) => ({ points, radius: height * 0.085 }));
    out[channel] = wallDiscs(rect, 11, [...cavity, ...cavitySlots(channel, w, h)]);
  }
  return out;
}

// --- 4: three pings, one colour --------------------------------------------
//
// The channels are gone -- there is one world here and it is black. Three
// clutches of stones sit side by side, and the code is how many are in each,
// left to right. Three pings to count all three, and where you ping from
// decides whether the shadows separate or pile on top of one another. Run out
// and the level throws the numbers away and deals new ones.

// Shadows fan out from wherever you ping, so a clutch arrives at the wavefront
// wider than it really is. The gap between clutches has to beat that spread by
// a long way or the grouping stops reading: tight clutches, big spaces.
export const GROUP_CENTRES = [0.16, 0.5, 0.84];
export const GROUP_SPAN = 0.13;

const MIN_STONES = 1;
const MAX_STONES = 5;

const stones = {
  id: 4,
  code: '111',   // dealt fresh by reset() every time the level loads or resets
  clicks: 3,
  channels: ['k'],
  dotSpacing: 5, // counting is the whole task, so the gaps have to be crisp

  reset() {
    this.counts = GROUP_CENTRES.map(
      () => MIN_STONES + Math.floor(Math.random() * (MAX_STONES - MIN_STONES + 1)));
    this.field = [];
    this.counts.forEach((n, g) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        this.field.push([
          GROUP_CENTRES[g] - GROUP_SPAN / 2 + t * GROUP_SPAN,
          0.5 + (Math.random() - 0.5) * 0.05,
        ]);
      }
    });
    this.code = this.counts.join('');
  },

  build(w, h) {
    // Radius tracks the width, so however narrow the screen gets the stones
    // stay as far apart, relative to their size, as they are on a desktop.
    const r = Math.min(w * 0.009, h * 0.03);
    return { k: this.field.map(([x, y]) => ({ x: x * w, y: y * h, r })) };
  },
};

// ---------------------------------------------------------------------------

// What the game holds. The counter reads against this.
export const TOTAL_LEVELS = 4;

export const LEVELS = [
  {
    id: 1,
    code: 'RGB',
    build: (w, h) => ({
      r: centredLetter('R', w, h),
      g: centredLetter('G', w, h),
      b: centredLetter('B', w, h),
    }),
  },
  { id: 2, code: '462', build: splitDigits },
  // Everything but the cavity eats the wavefront, so this level can afford --
  // and needs -- a finer one than the open levels before it.
  { id: 3, code: '704', build: digitCavity, dotSpacing: 8 },
  stones,
];
