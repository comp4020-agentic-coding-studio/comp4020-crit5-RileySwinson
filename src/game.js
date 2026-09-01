import { buildHorizon, clearHorizon, isInside, reaches, stoppedAt } from './occlusion.js';
import { LEVELS, TOTAL_LEVELS } from './levels.js';

const DEFAULT_CHANNELS = ['r', 'g', 'b'];
const INK = { r: '#b8302a', g: '#1c7a3f', b: '#2c47bd', k: '#14141a' };
const CHANNEL_NAME = { r: 'Red', g: 'Green', b: 'Blue', k: 'Black' };

const SPEED = 260;        // px per second
const DOT_SPACING = 18;   // arc length between dots on a wavefront (levels may override)
const DOT_RADIUS = 3.2;
const TRAIL = 10;         // rings behind the leading edge
const TRAIL_GAP = 24;     // px between them -- the band has to be deeper than
const MAX_RIPPLES = 3;    // the geometry, or nothing ever reads as a whole shape

// 0 = the wavefront is simply gone where geometry stopped it, which is the
// rule as specified. Anything above 0 leaves the stopped dots sitting on the
// contact point at that fraction of their alpha, dying with the ripple that
// carried them. It is the single knob that decides how legible a level is.
const TRACE = 0;

const PEN_WIDTH = 3.5;

const stage = document.getElementById('stage');
const canvas = document.getElementById('ink');
const ctx = canvas.getContext('2d');
const notes = document.getElementById('notes');
const nctx = notes.getContext('2d');
const penButton = document.getElementById('pen');
const eraseButton = document.getElementById('erase');
const counter = document.getElementById('counter');
const budget = document.getElementById('budget');
const clicksLeftEl = document.getElementById('clicks');
const restartButton = document.getElementById('restart');
const wipe = document.getElementById('wipe');
const slotRow = document.getElementById('slots');
const entry = document.getElementById('entry');
const swatchRow = document.getElementById('swatches');
const win = document.getElementById('win');

const canHover = window.matchMedia('(hover: hover)').matches;

let index = 0;
let level = LEVELS[0];
let channels = DEFAULT_CHANNELS;
let channel = 'r';
let geometry = { r: [], g: [], b: [] };
let ripples = [];
let strokes = [];   // notes the player has written over the level
let stroke = null;
let pen = false;
let clicksLeft = Infinity;   // levels with a budget set one; the rest don't
let failing = false;
let solved = false;
let w = 0;
let h = 0;
let maxR = 0;

// --- stage -----------------------------------------------------------------

function layout() {
  w = window.innerWidth;
  h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  for (const [el, c] of [[canvas, ctx], [notes, nctx]]) {
    el.width = Math.round(w * dpr);
    el.height = Math.round(h * dpr);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  drawNotes();
  maxR = Math.hypot(w, h) * 1.05;
  geometry = solved ? Object.fromEntries(channels.map((c) => [c, []])) : level.build(w, h);
  ripples = [];
}

// A level says which worlds it has. Most have three; level 4 has one, and the
// row shrinking to a single black square is the only notice you get.
function renderSwatches() {
  swatchRow.innerHTML = '';
  for (const c of channels) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'swatch';
    el.dataset.channel = c;
    el.setAttribute('aria-label', CHANNEL_NAME[c] ?? c);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setChannel(c);
      if (canHover && !solved) entry.focus({ preventScroll: true });
    });
    swatchRow.append(el);
  }
}

function setChannel(next) {
  channel = next;
  stage.dataset.channel = next;
  document.documentElement.dataset.channel = next;
  for (const el of swatchRow.children) {
    const on = el.dataset.channel === next;
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', String(on));
  }
  ripples = []; // a wavefront belongs to the world it was fired into
}

function bump() {
  stage.classList.remove('bump');
  void stage.offsetWidth; // restart the animation
  stage.classList.add('bump');
}

stage.addEventListener('animationend', (e) => {
  if (e.animationName === 'bump') stage.classList.remove('bump');
});

function ping(x, y) {
  if (failing || clicksLeft <= 0) return;
  if (!solved && isInside(x, y, geometry[channel])) {
    bump(); // a ping from inside solid geometry gets nothing out, and costs nothing
    return;
  }

  if (Number.isFinite(clicksLeft)) {
    clicksLeft -= 1;
    renderClicks();
  }

  ripples.push({
    x,
    y,
    t0: performance.now(),
    phase: Math.random() * Math.PI * 2,
    horizon: solved ? clearHorizon() : buildHorizon(x, y, geometry[channel]),
  });
  if (ripples.length > MAX_RIPPLES) ripples.splice(0, ripples.length - MAX_RIPPLES);
}

// --- notes -----------------------------------------------------------------
//
// A layer of the player's own, over the top of everything. Nothing the level
// does touches it, and the pen writes in whichever channel is showing -- so
// tracing red and then green leaves both on the glass at once.

function penStyle(ink) {
  nctx.strokeStyle = ink;
  nctx.fillStyle = ink;
  nctx.lineWidth = PEN_WIDTH;
  nctx.lineCap = 'round';
  nctx.lineJoin = 'round';
}

function drawNotes() {
  nctx.clearRect(0, 0, w, h);
  for (const s of strokes) {
    penStyle(s.ink);
    if (s.points.length === 1) {
      const [x, y] = s.points[0];
      nctx.beginPath();
      nctx.arc(x, y, PEN_WIDTH / 2, 0, Math.PI * 2);
      nctx.fill();
      continue;
    }
    nctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? nctx.lineTo(x, y) : nctx.moveTo(x, y)));
    nctx.stroke();
  }
}

function startStroke(x, y) {
  stroke = { ink: INK[channel], points: [[x, y]] };
  strokes.push(stroke);
  penStyle(stroke.ink);
  nctx.beginPath();
  nctx.arc(x, y, PEN_WIDTH / 2, 0, Math.PI * 2);
  nctx.fill();
}

function extendStroke(x, y) {
  if (!stroke) return;
  const [px, py] = stroke.points[stroke.points.length - 1];
  if (Math.hypot(x - px, y - py) < 1) return;
  stroke.points.push([x, y]);
  penStyle(stroke.ink);
  nctx.beginPath();
  nctx.moveTo(px, py);
  nctx.lineTo(x, y);
  nctx.stroke();
}

function eraseNotes() {
  strokes = [];
  stroke = null;
  nctx.clearRect(0, 0, w, h);
}

function setPen(on) {
  pen = on;
  penButton.classList.toggle('on', on);
  penButton.setAttribute('aria-pressed', String(on));
  stage.style.cursor = on ? 'crosshair' : '';
}

// --- drawing ---------------------------------------------------------------

function frame(now) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = INK[channel];

  for (let i = ripples.length - 1; i >= 0; i--) {
    const rip = ripples[i];
    const front = ((now - rip.t0) / 1000) * SPEED;
    if (front - TRAIL * TRAIL_GAP > maxR) {
      ripples.splice(i, 1);
      continue;
    }

    // The wavefront is a band, not a hairline. Rings that have not yet reached
    // the geometry are whole and rings that have are bitten, so the boundary
    // running through the band is the near edge of whatever is out there --
    // which is the only thing that ever draws the level.
    for (let t = 0; t < TRAIL; t++) {
      const radius = front - t * TRAIL_GAP;
      if (radius < 6 || radius > maxR) continue;

      const life = radius / maxR;
      const alpha = Math.max(0, (1 - life) ** 1.2) * 0.95 * (1 - t / TRAIL) ** 1.1;
      if (alpha <= 0.015) continue;
      const dot = DOT_RADIUS * (1 - 0.35 * life) * (1 - 0.2 * (t / TRAIL));

      const spacing = level.dotSpacing || DOT_SPACING;
      const count = Math.min(2600, Math.max(8, Math.round((Math.PI * 2 * radius) / spacing)));
      const step = (Math.PI * 2) / count;

      // Free dots first, then -- only if TRACE is on -- the ones that were
      // stopped, drawn dimmer and sitting where they made contact.
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      const stopped = TRACE ? [] : null;
      for (let k = 0; k < count; k++) {
        const theta = rip.phase + k * step;
        if (!reaches(rip.horizon, theta, radius)) {
          if (stopped) stopped.push(theta);
          continue;
        }
        const px = rip.x + radius * Math.cos(theta);
        const py = rip.y + radius * Math.sin(theta);
        if (px < -dot || py < -dot || px > w + dot || py > h + dot) continue;
        ctx.moveTo(px + dot, py);
        ctx.arc(px, py, dot, 0, Math.PI * 2);
      }
      ctx.fill();

      if (stopped && stopped.length) {
        ctx.globalAlpha = alpha * TRACE;
        ctx.beginPath();
        for (const theta of stopped) {
          const at = stoppedAt(rip.horizon, theta);
          if (!Number.isFinite(at) || at <= 0) continue;
          const px = rip.x + at * Math.cos(theta);
          const py = rip.y + at * Math.sin(theta);
          if (px < -dot || py < -dot || px > w + dot || py > h + dot) continue;
          ctx.moveTo(px + dot, py);
          ctx.arc(px, py, dot, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}

// --- the answer ------------------------------------------------------------

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'} left`;
}

function renderCounter() {
  counter.hidden = false;
  counter.textContent = plural(TOTAL_LEVELS - index, 'level');
}

function renderClicks() {
  budget.hidden = !Number.isFinite(clicksLeft);
  if (budget.hidden) return;
  clicksLeftEl.textContent = plural(clicksLeft, 'click');
  clicksLeftEl.classList.toggle('low', clicksLeft <= 1);
  // Out of pings is not the end of the attempt -- the answer box still works,
  // and it is the player who decides when to throw the deal away.
  restartButton.hidden = clicksLeft > 0;
}

function loadLevel(next) {
  level = next;
  level.reset?.();
  channels = level.channels ?? DEFAULT_CHANNELS;
  clicksLeft = level.clicks ?? Infinity;
  failing = false;
  ripples = [];
  buildSlots();
  renderCounter();
  renderClicks();
  renderSwatches();
  setChannel(channels[0]);
  eraseNotes();
  geometry = level.build(w, h);
  entry.disabled = false;
  if (canHover) entry.focus({ preventScroll: true });
}

// Wipe the level away and deal it again. The numbers you were counting do not
// come back.
function restart() {
  failing = true;
  bump();
  wipe.classList.add('on');
  setTimeout(() => {
    level.reset?.();
    clicksLeft = level.clicks ?? Infinity;
    renderClicks();
    entry.value = '';
    renderSlots();
    setChannel(channels[0]);
    eraseNotes();
    ripples = [];
    geometry = level.build(w, h);
  }, 300);
}

wipe.addEventListener('animationend', () => {
  wipe.classList.remove('on');
  failing = false;
});

restartButton.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!failing) restart();
  if (canHover && !solved) entry.focus({ preventScroll: true });
});

function buildSlots() {
  slotRow.innerHTML = '';
  for (let i = 0; i < level.code.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slotRow.append(slot);
  }
  entry.maxLength = level.code.length;
  entry.value = '';
  renderSlots();
}

function renderSlots() {
  const value = entry.value;
  [...slotRow.children].forEach((slot, i) => {
    slot.textContent = value[i] || '';
    slot.classList.toggle('cue', i === value.length && !solved);
  });
}

function submit() {
  if (entry.value === level.code) solve();
  else reject();
}

function solve() {
  clicksLeft = Infinity; // the level is over; its budget stops applying
  renderClicks();
  entry.disabled = true;
  entry.blur();
  slotRow.classList.add('right');
  ripples = [];
  renderSlots();

  const next = LEVELS[index + 1];
  if (!next) {
    solved = true;
    stage.classList.add('solved');
    geometry = Object.fromEntries(channels.map((c) => [c, []]));
    ping(w / 2, h / 2);
    counter.hidden = true; // nothing left to count down
    win.hidden = false;
    requestAnimationFrame(() => win.classList.add('on'));
    return;
  }

  setTimeout(() => {
    index += 1;
    slotRow.classList.remove('right');
    loadLevel(next);
  }, 1000);
}

function reject() {
  slotRow.classList.remove('wrong');
  void slotRow.offsetWidth; // restart the shake
  slotRow.classList.add('wrong');
  const box = slotRow.getBoundingClientRect();
  ping(box.left + box.width / 2, box.top + box.height / 2);
  setTimeout(() => {
    entry.value = '';
    renderSlots();
  }, 420);
}

// --- input -----------------------------------------------------------------

entry.addEventListener('input', () => {
  entry.value = entry.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, level.code.length);
  renderSlots();
  if (entry.value.length === level.code.length) submit();
});

stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.swatch, .tool, .answer')) return;
  e.preventDefault();
  if (pen) startStroke(e.clientX, e.clientY);
  else ping(e.clientX, e.clientY);
  if (canHover && !solved) entry.focus({ preventScroll: true });
});

window.addEventListener('pointermove', (e) => {
  if (stroke) extendStroke(e.clientX, e.clientY);
});

for (const done of ['pointerup', 'pointercancel']) {
  window.addEventListener(done, () => { stroke = null; });
}

penButton.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  setPen(!pen);
  if (canHover && !solved) entry.focus({ preventScroll: true });
});

eraseButton.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  eraseNotes();
  if (canHover && !solved) entry.focus({ preventScroll: true });
});

slotRow.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!solved) entry.focus({ preventScroll: true });
});

window.addEventListener('keydown', (e) => {
  if (solved || e.metaKey || e.ctrlKey || e.altKey) return;
  if (document.activeElement !== entry && /^[a-zA-Z0-9]$/.test(e.key)) entry.focus({ preventScroll: true });
});

window.addEventListener('resize', layout);

// --- go --------------------------------------------------------------------

setPen(false);
renderSwatches();
layout();
loadLevel(LEVELS[0]);
requestAnimationFrame(frame);
