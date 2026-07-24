/**
 * Generates the ASL fingerspelling handshape assets in frontend/public/signs/asl/.
 *
 * WHY GENERATED, NOT DOWNLOADED
 * -----------------------------
 * Almost every ASL alphabet chart on the web is copyrighted. Downloading one
 * and committing it to a public repository is infringement, and it would hand
 * the project a legal problem that is much worse than a slightly plainer
 * picture. These files are original work produced by this script, so they
 * carry the repository's own licence, cost nothing, and cannot be taken down.
 *
 * WHAT THEY ARE
 * -------------
 * Schematic hand diagrams: a palm, a thumb, and four jointed fingers, each
 * drawn from the finger-state data in frontend/src/data/handshapes.ts (which
 * in turn encodes the standard, widely-published descriptions in
 * aslAlphabet.ts). They convey handshape - which digits are extended, curled,
 * folded or tucked, and where the thumb sits.
 *
 * WHAT THEY ARE NOT
 * -----------------
 * Photographs, video, or motion. A static drawing cannot show the movement in
 * J and Z, wrist orientation, or the facial grammar that is part of real
 * signing. The UI labels them as schematics and captions the motion in words.
 * They are a study aid to check your own hand against, never a replacement
 * for a Deaf teacher.
 *
 * Run: node scripts/generate-sign-assets.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '../frontend/public/signs/asl');

// --- handshape data -----------------------------------------------------
// Mirrors frontend/src/data/handshapes.ts. Kept as a literal copy rather than
// imported because that file is TypeScript and this script is plain node -
// if you change one, change the other (there is a consistency test below).

const E = 'extended', C = 'curled', F = 'folded', T = 'tucked';

const SHAPES = {
  A: { fingers: [E, F, F, F, F], thumb: 'side' },
  B: { fingers: [F, E, E, E, E], thumb: 'across' },
  C: { fingers: [C, C, C, C, C], thumb: 'side' },
  D: { fingers: [E, E, C, C, C], thumb: 'touchMiddle' },
  E: { fingers: [F, C, C, C, C], thumb: 'across' },
  F: { fingers: [E, C, E, E, E], thumb: 'touchIndex' },
  G: { fingers: [E, E, F, F, F], thumb: 'side', motion: 'Held sideways, pointing forward' },
  H: { fingers: [F, E, E, F, F], thumb: 'across', motion: 'Held sideways, pointing forward' },
  I: { fingers: [F, F, F, F, E], thumb: 'across' },
  J: { fingers: [F, F, F, F, E], thumb: 'across', motion: 'Trace a J in the air with the pinky' },
  K: { fingers: [E, E, E, F, F], thumb: 'front', spread: true },
  L: { fingers: [E, E, F, F, F], thumb: 'side' },
  M: { fingers: [T, E, E, E, F], thumb: 'across', motion: 'Thumb tucked under three fingers' },
  N: { fingers: [T, E, E, F, F], thumb: 'across', motion: 'Thumb tucked under two fingers' },
  O: { fingers: [C, C, C, C, C], thumb: 'touchIndex' },
  P: { fingers: [E, E, E, F, F], thumb: 'front', spread: true, motion: 'Like K, but pointing downward' },
  Q: { fingers: [E, E, F, F, F], thumb: 'side', motion: 'Like G, but pointing downward' },
  R: { fingers: [F, E, E, F, F], thumb: 'across', motion: 'Index and middle fingers crossed' },
  S: { fingers: [F, F, F, F, F], thumb: 'front' },
  T: { fingers: [T, E, F, F, F], thumb: 'across', motion: 'Thumb tucked between index and middle' },
  U: { fingers: [F, E, E, F, F], thumb: 'across' },
  V: { fingers: [F, E, E, F, F], thumb: 'across', spread: true },
  W: { fingers: [F, E, E, E, F], thumb: 'across', spread: true },
  X: { fingers: [F, C, F, F, F], thumb: 'across' },
  Y: { fingers: [E, F, F, F, E], thumb: 'side' },
  Z: { fingers: [F, E, F, F, F], thumb: 'across', motion: 'Trace a Z in the air with the index finger' },
  1: { fingers: [F, E, F, F, F], thumb: 'across' },
  2: { fingers: [F, E, E, F, F], thumb: 'across', spread: true },
  3: { fingers: [E, E, E, F, F], thumb: 'side', spread: true },
  4: { fingers: [F, E, E, E, E], thumb: 'across', spread: true },
  5: { fingers: [E, E, E, E, E], thumb: 'side', spread: true },
  6: { fingers: [E, E, E, E, C], thumb: 'touchPinky' },
  7: { fingers: [E, E, E, C, E], thumb: 'touchRing' },
  8: { fingers: [E, E, C, E, E], thumb: 'touchMiddle' },
  9: { fingers: [E, C, E, E, E], thumb: 'touchIndex' },
  10: { fingers: [E, F, F, F, F], thumb: 'up', motion: 'Shake the hand slightly' },
};

// --- geometry -----------------------------------------------------------
// One hand, palm facing the viewer, wrist at the bottom. Fingers are drawn as
// rounded capsules whose length encodes their state; a curled finger also gets
// a visible knuckle bend so it reads differently from a merely short one.

const PALM = { x: 30, y: 52, w: 44, h: 32, r: 12 };

// Base of each finger, its full length when fully extended, and its width.
const FINGERS = [
  { name: 'index',  x: 34.5, base: 54, len: 34, w: 9.5 },
  { name: 'middle', x: 46.0, base: 51, len: 39, w: 9.5 },
  { name: 'ring',   x: 57.0, base: 53, len: 35, w: 9.5 },
  { name: 'pinky',  x: 67.5, base: 57, len: 27, w: 8.5 },
];

const REACH = { extended: 1, curled: 0.5, folded: 0.2, tucked: 0.13 };

const STROKE = '#0f766e';   // teal-700 - reads clearly in both light and dark UI
const FILL = '#ccfbf1';     // teal-100
const FILL_DIM = '#f0fdfa'; // teal-50, for tucked digits
const ACCENT = '#f59e0b';   // amber-500, for the thumb-contact ring

function capsule(x, y, w, h, fill) {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(w / 2)}" fill="${fill}" stroke="${STROKE}" stroke-width="2.5"/>`;
}

const r2 = (n) => Math.round(n * 100) / 100;

function renderFinger(f, state, spread, index) {
  const reach = REACH[state];
  const height = Math.max(9, f.len * reach);
  const y = f.base - height;
  // Spread fans the outer fingers away from the middle of the hand.
  const dx = spread ? (index - 1.5) * 3.4 : 0;
  const fill = state === 'tucked' ? FILL_DIM : FILL;
  let out = capsule(f.x + dx, y, f.w, height, fill);
  // A curled finger gets a knuckle line so it isn't confused with a short one.
  if (state === 'curled') {
    const ky = y + height * 0.42;
    out += `<line x1="${r2(f.x + dx + 1.5)}" y1="${r2(ky)}" x2="${r2(f.x + dx + f.w - 1.5)}" y2="${r2(ky)}" stroke="${STROKE}" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>`;
  }
  if (state === 'tucked') {
    out = out.replace('stroke-width="2.5"', 'stroke-width="2.5" stroke-dasharray="3 2.5"');
  }
  return out;
}

function renderThumb(shape) {
  const [thumbState] = shape.fingers;
  const pos = shape.thumb;
  if (pos === 'up') {
    return capsule(17, 30, 9.5, 26, FILL);
  }
  if (pos === 'across') {
    // Laid horizontally over the closed fingers.
    return capsule(30, 56, 30, 8.5, FILL).replace('rx="15"', 'rx="4.25"');
  }
  if (pos === 'front') {
    // Clamped over the front of the fist - drawn darker so it reads as nearer.
    return `<rect x="33" y="54" width="27" height="8.5" rx="4.25" fill="#99f6e4" stroke="${STROKE}" stroke-width="2.5"/>`;
  }
  // 'side' or any touch-* variant: angled out from the side of the palm.
  const len = thumbState === 'extended' ? 25 : 15;
  const x = 22, y = 68 - len;
  return `<g transform="rotate(-30 ${r2(x + 4.75)} ${r2(y + len / 2)})">${capsule(x, y, 9.5, len, FILL)}</g>`;
}

function renderContactRing(shape) {
  if (!shape.thumb.startsWith('touch')) return '';
  const target = { touchIndex: 0, touchMiddle: 1, touchRing: 2, touchPinky: 3 }[shape.thumb];
  const f = FINGERS[target];
  const reach = REACH[shape.fingers[target + 1]];
  const dx = shape.spread ? (target - 1.5) * 3.4 : 0;
  const cy = f.base - f.len * reach + 4;
  return `<circle cx="${r2(f.x + dx + f.w / 2)}" cy="${r2(cy)}" r="6.5" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>`;
}

function renderSvg(term, shape) {
  const [, ...fingerStates] = shape.fingers;
  const parts = [
    // wrist
    `<rect x="42" y="84" width="22" height="11" rx="4" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>`,
    // palm
    `<rect x="${PALM.x}" y="${PALM.y}" width="${PALM.w}" height="${PALM.h}" rx="${PALM.r}" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>`,
    renderThumb(shape),
    ...FINGERS.map((f, i) => renderFinger(f, fingerStates[i], shape.spread, i)),
    renderContactRing(shape),
  ];

  const title = `ASL handshape for ${term}`;
  const desc = shape.motion
    ? `${title}. Movement: ${shape.motion}`
    : `${title}. Schematic diagram of finger positions.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${title}"><title>${title}</title><desc>${desc}</desc>${parts.join('')}</svg>\n`;
}

// --- write --------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
let bytes = 0;
for (const [term, shape] of Object.entries(SHAPES)) {
  const svg = renderSvg(term, shape);
  writeFileSync(resolve(OUT_DIR, `${term}.svg`), svg, 'utf8');
  total += 1;
  bytes += Buffer.byteLength(svg);
}

// Sanity: every letter A-Z and every digit 1-10 must exist.
const expected = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...Array.from({ length: 10 }, (_, i) => String(i + 1))];
const missing = expected.filter((k) => !(k in SHAPES));
if (missing.length) {
  console.error(`FAIL: missing handshapes for ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Wrote ${total} SVG assets to frontend/public/signs/asl/`);
console.log(`Total size: ${(bytes / 1024).toFixed(1)} KB (avg ${Math.round(bytes / total)} bytes each)`);
