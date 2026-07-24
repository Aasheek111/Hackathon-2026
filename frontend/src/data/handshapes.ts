/**
 * Finger-position data for the ASL manual alphabet, so each sign can be drawn
 * as a schematic hand diagram instead of description text alone.
 *
 * WHY THIS SHAPE OF DATA, AND NOT IMAGES:
 * A photo or video of a sign has to be correct or it actively teaches the
 * wrong thing to a deaf learner. We have no licensed sign media and no
 * provider in this stack can generate an accurate handshape, so inventing one
 * would be worse than showing nothing.
 *
 * What we CAN do honestly is encode the one piece of information text
 * struggles to convey - which fingers are up, curled, or tucked, and where
 * the thumb sits - and render that deterministically. No model, no guessing:
 * the diagram is a direct drawing of the same standard, widely-published
 * descriptions in aslAlphabet.ts.
 *
 * It is a SCHEMATIC, and <HandshapeDiagram> labels it as one. It shows finger
 * configuration; it cannot show motion, orientation nuance, or facial
 * grammar - all of which are real parts of signing. It is a study aid to
 * check your hand against, not a substitute for a Deaf teacher.
 */

/** How far a digit is extended. */
export type FingerState =
  | 'extended' // straight out
  | 'curled' // bent into a hook / claw
  | 'folded' // closed down into the palm
  | 'tucked'; // folded and hidden under/behind another digit

export interface Handshape {
  /** thumb, index, middle, ring, pinky */
  fingers: [FingerState, FingerState, FingerState, FingerState, FingerState];
  /** Where the thumb sits relative to the fingers - changes the drawing. */
  thumb: 'side' | 'across' | 'front' | 'touchIndex' | 'touchMiddle' | 'touchRing' | 'touchPinky' | 'up';
  /** Motion that the static diagram cannot show; surfaced as a caption. */
  motion?: string;
  /** True when fingers are spread apart rather than held together. */
  spread?: boolean;
}

const F = {
  ext: 'extended' as const,
  curl: 'curled' as const,
  fold: 'folded' as const,
  tuck: 'tucked' as const,
};

/**
 * The 26 letters. Derived one-for-one from the descriptions in
 * aslAlphabet.ts - if you change one, change the other.
 */
export const ASL_HANDSHAPES: Record<string, Handshape> = {
  A: { fingers: [F.ext, F.fold, F.fold, F.fold, F.fold], thumb: 'side' },
  B: { fingers: [F.fold, F.ext, F.ext, F.ext, F.ext], thumb: 'across' },
  C: { fingers: [F.curl, F.curl, F.curl, F.curl, F.curl], thumb: 'side' },
  D: { fingers: [F.ext, F.ext, F.curl, F.curl, F.curl], thumb: 'touchMiddle' },
  E: { fingers: [F.fold, F.curl, F.curl, F.curl, F.curl], thumb: 'across' },
  F: { fingers: [F.ext, F.curl, F.ext, F.ext, F.ext], thumb: 'touchIndex' },
  G: { fingers: [F.ext, F.ext, F.fold, F.fold, F.fold], thumb: 'side', motion: 'Held sideways, pointing forward' },
  H: { fingers: [F.fold, F.ext, F.ext, F.fold, F.fold], thumb: 'across', motion: 'Held sideways, pointing forward' },
  I: { fingers: [F.fold, F.fold, F.fold, F.fold, F.ext], thumb: 'across' },
  J: { fingers: [F.fold, F.fold, F.fold, F.fold, F.ext], thumb: 'across', motion: 'Trace a J in the air with the pinky' },
  K: { fingers: [F.ext, F.ext, F.ext, F.fold, F.fold], thumb: 'front', spread: true },
  L: { fingers: [F.ext, F.ext, F.fold, F.fold, F.fold], thumb: 'side' },
  M: { fingers: [F.tuck, F.ext, F.ext, F.ext, F.fold], thumb: 'across', motion: 'Thumb tucked under three fingers' },
  N: { fingers: [F.tuck, F.ext, F.ext, F.fold, F.fold], thumb: 'across', motion: 'Thumb tucked under two fingers' },
  O: { fingers: [F.curl, F.curl, F.curl, F.curl, F.curl], thumb: 'touchIndex' },
  P: { fingers: [F.ext, F.ext, F.ext, F.fold, F.fold], thumb: 'front', spread: true, motion: 'Like K, but pointing downward' },
  Q: { fingers: [F.ext, F.ext, F.fold, F.fold, F.fold], thumb: 'side', motion: 'Like G, but pointing downward' },
  R: { fingers: [F.fold, F.ext, F.ext, F.fold, F.fold], thumb: 'across', motion: 'Index and middle fingers crossed' },
  S: { fingers: [F.fold, F.fold, F.fold, F.fold, F.fold], thumb: 'front' },
  T: { fingers: [F.tuck, F.ext, F.fold, F.fold, F.fold], thumb: 'across', motion: 'Thumb tucked between index and middle' },
  U: { fingers: [F.fold, F.ext, F.ext, F.fold, F.fold], thumb: 'across' },
  V: { fingers: [F.fold, F.ext, F.ext, F.fold, F.fold], thumb: 'across', spread: true },
  W: { fingers: [F.fold, F.ext, F.ext, F.ext, F.fold], thumb: 'across', spread: true },
  X: { fingers: [F.fold, F.curl, F.fold, F.fold, F.fold], thumb: 'across' },
  Y: { fingers: [F.ext, F.fold, F.fold, F.fold, F.ext], thumb: 'side' },
  Z: { fingers: [F.fold, F.ext, F.fold, F.fold, F.fold], thumb: 'across', motion: 'Trace a Z in the air with the index finger' },
};

/** Digits 1-10, same encoding. */
export const ASL_NUMBER_HANDSHAPES: Record<string, Handshape> = {
  '1': { fingers: [F.fold, F.ext, F.fold, F.fold, F.fold], thumb: 'across' },
  '2': { fingers: [F.fold, F.ext, F.ext, F.fold, F.fold], thumb: 'across', spread: true },
  '3': { fingers: [F.ext, F.ext, F.ext, F.fold, F.fold], thumb: 'side', spread: true },
  '4': { fingers: [F.fold, F.ext, F.ext, F.ext, F.ext], thumb: 'across', spread: true },
  '5': { fingers: [F.ext, F.ext, F.ext, F.ext, F.ext], thumb: 'side', spread: true },
  '6': { fingers: [F.ext, F.ext, F.ext, F.ext, F.curl], thumb: 'touchPinky' },
  '7': { fingers: [F.ext, F.ext, F.ext, F.curl, F.ext], thumb: 'touchRing' },
  '8': { fingers: [F.ext, F.ext, F.curl, F.ext, F.ext], thumb: 'touchMiddle' },
  '9': { fingers: [F.ext, F.curl, F.ext, F.ext, F.ext], thumb: 'touchIndex' },
  '10': { fingers: [F.ext, F.fold, F.fold, F.fold, F.fold], thumb: 'up', motion: 'Shake the hand slightly' },
};

/** Handshape for a letter or digit, or null when we have no verified data. */
export function handshapeFor(term: string): Handshape | null {
  const key = term.trim().toUpperCase();
  return ASL_HANDSHAPES[key] ?? ASL_NUMBER_HANDSHAPES[key] ?? null;
}
