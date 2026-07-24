import { ASL_ALPHABET } from './aslAlphabet';

/**
 * ASL sign reference used by the deaf/hard-of-hearing dashboard.
 *
 * WHAT THIS IS, HONESTLY: written descriptions of how each sign is formed,
 * drawn from the standard, widely-published ASL manual alphabet and common
 * vocabulary. It is a text-based study aid.
 *
 * WHAT IT IS NOT: sign language video, photos, or an animated avatar. No
 * provider in this stack (Groq for text, Unsplash for photos) can generate an
 * accurate handshape, and a wrong or hallucinated image would teach a deaf
 * learner an incorrect sign - materially worse than showing none. Real sign
 * media needs a licensed dataset (e.g. an ASL-LEX / Signing Savvy licence) or
 * footage recorded with a Deaf consultant.
 *
 * `mediaUrl` is the seam for exactly that: every entry accepts one, the UI
 * renders it when present and falls back to the description when absent, so
 * dropping in a licensed media set later is a data change, not a rewrite.
 */

/**
 * Which sign language a set of signs belongs to.
 *
 * Sign languages are FULL, INDEPENDENT languages - not signed versions of the
 * spoken language around them, and not dialects of each other. Nepali Sign
 * Language is not "ASL in Nepali": it has its own grammar and its own manual
 * alphabet, which maps to Devanagari rather than the Latin alphabet. Treating
 * one as a translation of the other is a category error.
 *
 * So this is a first-class dimension rather than a label. Adding a language
 * means adding a catalogue, never machine-translating an existing one.
 */
export type SignSystemId = 'ASL' | 'NSL';

export interface SignSystem {
  id: SignSystemId;
  /** Name in English. */
  label: string;
  /** Name as its own community writes it, where that differs. */
  nativeLabel?: string;
  region: string;
  /** False when we have no verified catalogue yet - the UI says so plainly. */
  available: boolean;
  /** Shown when unavailable: what it would take to add it properly. */
  unavailableReason?: string;
}

export const SIGN_SYSTEMS: SignSystem[] = [
  {
    id: 'ASL',
    label: 'American Sign Language',
    region: 'United States & Canada',
    available: true,
  },
  {
    id: 'NSL',
    label: 'Nepali Sign Language',
    nativeLabel: 'नेपाली सांकेतिक भाषा',
    region: 'Nepal',
    available: false,
    // Deliberately empty rather than guessed. An LLM will happily produce
    // confident NSL handshape descriptions; they would be fabricated, and a
    // deaf child taught a fabricated sign is a real harm, not a cosmetic bug.
    // This needs a verified catalogue from the Nepal National Federation of
    // the Deaf or the published NSL dictionary, ideally reviewed by a Deaf
    // NSL signer before it ships.
    unavailableReason:
      'We have not added Nepali Sign Language yet. It is a distinct language with its own alphabet and grammar, so it needs a verified source and review by Deaf NSL signers — we will not machine-translate ASL and present it as NSL.',
  },
];

export type SignCategory = 'Alphabet' | 'Numbers' | 'Greetings' | 'Everyday' | 'School' | 'Feelings';

export interface Sign {
  /** Stable id, used for favourites in localStorage. */
  id: string;
  /** Which sign language this belongs to. */
  system: SignSystemId;
  /** The word or letter this sign means. */
  term: string;
  category: SignCategory;
  /** How to form the sign, in plain language. */
  description: string;
  /** Optional memory hook - why the sign looks the way it does. */
  tip?: string;
  /** Licensed photo/video/GIF of the sign, when a real dataset is available. */
  mediaUrl?: string;
}

const alphabetSigns: Sign[] = Object.entries(ASL_ALPHABET).map(([letter, description]) => ({
  id: `letter-${letter}`,
  term: letter,
  system: 'ASL' as const,
  category: 'Alphabet' as const,
  description,
}));

const numberSigns: Sign[] = [
  { id: 'num-1', term: '1', system: 'ASL', category: 'Numbers', description: 'Index finger pointing up, other fingers closed.' },
  { id: 'num-2', term: '2', system: 'ASL', category: 'Numbers', description: 'Index and middle fingers up, spread apart.' },
  { id: 'num-3', term: '3', system: 'ASL', category: 'Numbers', description: 'Thumb, index, and middle finger up.' },
  { id: 'num-4', term: '4', system: 'ASL', category: 'Numbers', description: 'Four fingers up and spread, thumb folded across the palm.' },
  { id: 'num-5', term: '5', system: 'ASL', category: 'Numbers', description: 'All five fingers spread wide, palm forward.' },
  { id: 'num-6', term: '6', system: 'ASL', category: 'Numbers', description: 'Pinky touches the thumb, the other three fingers stay up.' },
  { id: 'num-7', term: '7', system: 'ASL', category: 'Numbers', description: 'Ring finger touches the thumb, the other three fingers stay up.' },
  { id: 'num-8', term: '8', system: 'ASL', category: 'Numbers', description: 'Middle finger touches the thumb, the other three fingers stay up.' },
  { id: 'num-9', term: '9', system: 'ASL', category: 'Numbers', description: 'Index finger touches the thumb, the other three fingers stay up.' },
  { id: 'num-10', term: '10', system: 'ASL', category: 'Numbers', description: 'Fist with the thumb pointing up, then shake it slightly.' },
];

const vocabularySigns: Sign[] = [
  // Greetings
  { id: 'w-hello', term: 'Hello', system: 'ASL', category: 'Greetings', description: 'Flat hand at your forehead, then move it outward - like a friendly salute.', tip: 'It looks like waving someone over from a distance.' },
  { id: 'w-goodbye', term: 'Goodbye', system: 'ASL', category: 'Greetings', description: 'Open hand up, then fold your fingers down and up again.', tip: 'Exactly like a normal wave.' },
  { id: 'w-please', term: 'Please', system: 'ASL', category: 'Greetings', description: 'Flat hand on your chest, moving in a circle.', tip: 'Rubbing your chest, as if asking kindly.' },
  { id: 'w-thankyou', term: 'Thank you', system: 'ASL', category: 'Greetings', description: 'Flat hand starts at your chin, then moves forward and down toward the person.', tip: 'Like blowing a kiss of thanks outward.' },
  { id: 'w-sorry', term: 'Sorry', system: 'ASL', category: 'Greetings', description: 'Make a fist with the thumb out and circle it on your chest.', tip: 'A circling motion over the heart.' },
  { id: 'w-yes', term: 'Yes', system: 'ASL', category: 'Greetings', description: 'Make a fist and nod it up and down at the wrist.', tip: 'Your hand nods like a head saying yes.' },
  { id: 'w-no', term: 'No', system: 'ASL', category: 'Greetings', description: 'Tap your index and middle fingers down onto your thumb.', tip: 'Like a mouth snapping shut.' },
  { id: 'w-name', term: 'Name', system: 'ASL', category: 'Greetings', description: 'Both hands in U shapes, tap the fingers of one across the other twice.' },

  // Everyday
  { id: 'w-eat', term: 'Eat', system: 'ASL', category: 'Everyday', description: 'Pinch your fingers and thumb together and tap them to your mouth.', tip: 'Like putting food in your mouth.' },
  { id: 'w-drink', term: 'Drink', system: 'ASL', category: 'Everyday', description: 'Curve your hand into a C shape and tilt it toward your mouth.', tip: 'Like holding and tipping a cup.' },
  { id: 'w-water', term: 'Water', system: 'ASL', category: 'Everyday', description: 'Make a W shape with three fingers and tap it against your chin.' },
  { id: 'w-more', term: 'More', system: 'ASL', category: 'Everyday', description: 'Both hands with fingers and thumb pinched together, tap the fingertips against each other.' },
  { id: 'w-finished', term: 'Finished', system: 'ASL', category: 'Everyday', description: 'Both open hands facing up, then quickly flip them over.', tip: 'Like tipping something out - all done.' },
  { id: 'w-help', term: 'Help', system: 'ASL', category: 'Everyday', description: 'Rest a thumbs-up fist on your other flat palm, then lift both hands together.', tip: 'One hand lifting the other up.' },
  { id: 'w-stop', term: 'Stop', system: 'ASL', category: 'Everyday', description: 'Chop the edge of your flat hand down onto your other open palm.' },
  { id: 'w-home', term: 'Home', system: 'ASL', category: 'Everyday', description: 'Pinch your fingers together and touch your cheek, first near the mouth then higher up.' },

  // School
  { id: 'w-learn', term: 'Learn', system: 'ASL', category: 'School', description: 'Gather your fingers up off your flat palm and bring them to your forehead.', tip: 'Taking knowledge from the page into your head.' },
  { id: 'w-book', term: 'Book', system: 'ASL', category: 'School', description: 'Press your palms together, then open them like opening a book.' },
  { id: 'w-read', term: 'Read', system: 'ASL', category: 'School', description: 'Make a V with two fingers and move it down over your other flat palm.', tip: 'The V is your eyes scanning the page.' },
  { id: 'w-write', term: 'Write', system: 'ASL', category: 'School', description: 'Pinch your dominant hand as if holding a pen and move it across your other flat palm.' },
  { id: 'w-school', term: 'School', system: 'ASL', category: 'School', description: 'Clap your hands together twice, dominant hand on top.', tip: 'Like a teacher clapping for attention.' },
  { id: 'w-teacher', term: 'Teacher', system: 'ASL', category: 'School', description: 'Both pinched hands move forward from your temples, then flat hands sweep down your sides.', tip: 'Giving out ideas, then the sign for "person".' },
  { id: 'w-question', term: 'Question', system: 'ASL', category: 'School', description: 'Draw a question mark in the air with your index finger.' },

  // Feelings
  { id: 'w-happy', term: 'Happy', system: 'ASL', category: 'Feelings', description: 'Brush your flat hands upward on your chest in circles.', tip: 'Feelings bubbling up.' },
  { id: 'w-sad', term: 'Sad', system: 'ASL', category: 'Feelings', description: 'Open hands in front of your face, then move them slowly downward.', tip: 'Your face falling.' },
  { id: 'w-tired', term: 'Tired', system: 'ASL', category: 'Feelings', description: 'Bent hands on your chest, then let them drop downward.' },
  { id: 'w-love', term: 'Love', system: 'ASL', category: 'Feelings', description: 'Cross both fists over your chest, like giving yourself a hug.' },
  { id: 'w-angry', term: 'Angry', system: 'ASL', category: 'Feelings', description: 'Claw your hand in front of your face and pull it away sharply.' },
  { id: 'w-scared', term: 'Scared', system: 'ASL', category: 'Feelings', description: 'Both hands open sharply in front of your chest, as if startled.' },
];

export const SIGNS: Sign[] = [...alphabetSigns, ...numberSigns, ...vocabularySigns];

export const SIGN_CATEGORIES: SignCategory[] = [
  'Alphabet',
  'Numbers',
  'Greetings',
  'Everyday',
  'School',
  'Feelings',
];

export function signsInCategory(category: SignCategory, system: SignSystemId = 'ASL'): Sign[] {
  return SIGNS.filter((s) => s.category === category && s.system === system);
}

/** Case-insensitive search over the term and its description. */
export function searchSigns(query: string, system: SignSystemId = 'ASL'): Sign[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SIGNS.filter(
    (s) =>
      s.system === system &&
      (s.term.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)),
  );
}

const FAVOURITES_KEY = 'pragya_sign_favourites';

/** Favourites live in localStorage - no server round-trip for a personal bookmark list. */
export function loadFavourites(): string[] {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveFavourites(ids: string[]): void {
  try {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(ids));
  } catch {
    /* private mode / quota - favourites just won't persist */
  }
}
