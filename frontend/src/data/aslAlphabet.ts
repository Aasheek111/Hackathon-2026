/**
 * Standard ASL manual (fingerspelling) alphabet, described in plain text -
 * a widely-published, public reference (not something an AI model
 * generates). This is deliberately a fingerspelling STUDY AID, not sign
 * language video/avatar translation - no provider in this stack (Groq,
 * Gemini, Unsplash) can produce accurate sign-language video, and a
 * hand-drawn guess at a handshape risks teaching a deaf learner something
 * wrong, which is worse than not showing one. Text descriptions of the
 * standard handshape are accurate and safe to show as-is.
 */
export interface AslLetter {
  letter: string;
  handshape: string;
}

export const ASL_ALPHABET: Record<string, string> = {
  A: "Fist, thumb resting alongside the fingers",
  B: "Flat hand, fingers together and up, thumb across the palm",
  C: "Hand curved into a C shape",
  D: "Index finger up, thumb touches the other fingertips",
  E: "Fingertips curled down to touch the thumb",
  F: "Thumb and index finger touch, other three fingers up",
  G: "Index finger and thumb held sideways, pointing out",
  H: "Index and middle fingers extended together, sideways",
  I: "Pinky finger up, rest of the hand in a fist",
  J: "Pinky up, trace a J shape in the air",
  K: "Index and middle fingers up in a V, thumb between them",
  L: "Index finger up, thumb out to the side - an L shape",
  M: "Thumb tucked under three fingers",
  N: "Thumb tucked under two fingers",
  O: "Fingers and thumb curved together into an O shape",
  P: "Like K, but pointing downward",
  Q: "Like G, but pointing downward",
  R: "Index and middle fingers crossed",
  S: "Fist, thumb across the front of the fingers",
  T: "Thumb tucked between the index and middle finger",
  U: "Index and middle fingers up together, side by side",
  V: "Index and middle fingers up, spread into a V",
  W: "Index, middle, and ring fingers up, spread apart",
  X: "Index finger bent into a hook",
  Y: "Thumb and pinky stretched out, other fingers folded down",
  Z: "Index finger traces a Z shape in the air",
};

/**
 * Picks one key word from a sentence to fingerspell - the longest
 * alphabetic word, since that's usually the sentence's most substantive
 * (least like "the"/"and") vocabulary. Returns null if nothing usable.
 */
export function pickKeyWord(text: string | null | undefined): string | null {
  if (!text) return null;
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length >= 4);
  if (words.length === 0) return null;
  return words.reduce((longest, w) => (w.length > longest.length ? w : longest), words[0]).toUpperCase();
}
