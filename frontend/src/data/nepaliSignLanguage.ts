import type { Sign, SignCategory } from './signLanguage';

/**
 * Nepali Sign Language (नेपाली सांकेतिक भाषा) — the manual alphabet.
 *
 * WHAT IS SOURCED, AND WHAT IS NOT
 * --------------------------------
 * The character inventory below is real and verifiable: it is the Devanagari
 * vowel and consonant set that the Nepali manual alphabet fingerspells, and it
 * matches the 13 vowel / 36 consonant class split used by the peer-reviewed
 * NSL23 dataset (Sunuwar, Borah & Kharga, 2024).
 *
 * The HANDSHAPES are a different matter. The Nepali manual alphabet was
 * devised by the Kathmandu Association of the Deaf with UNICEF support, and
 * the authoritative reference is the Nepali Sign Language Dictionary (Acharya
 * & Sharma, 2003, Nepal National Federation of the Deaf and Hard of Hearing).
 * That dictionary is not freely available as text, and Wikipedia's article is
 * a stub with no per-letter descriptions.
 *
 * Critically, Wikipedia states that only अ, ब, म and र derive from their
 * Latin-alphabet equivalents in the international manual alphabet - "all other
 * letter finger-shapes are indigenous". So NSL handshapes cannot be inferred
 * from ASL. Any description generated for the remaining letters would be
 * invention, and a fabricated sign taught to a deaf Nepali child is a real
 * harm, not a cosmetic gap.
 *
 * Therefore: every character is listed (so a learner sees the true scope of
 * the alphabet and can look it up), the four letters with a documented
 * derivation carry their sourced description, and the rest are explicitly
 * marked as not yet documented here, with a pointer to the real dictionary.
 * `description` is deliberately honest rather than plausible.
 *
 * To complete this properly, someone needs the NFDH dictionary (or the CC-BY
 * NSL23 video dataset) and review by a Deaf NSL signer. The data shape is
 * ready for exactly that: fill in `description`, and optionally `mediaUrl`.
 */

export const NSL_SOURCES = [
  {
    label: 'Nepali Sign Language Dictionary (Acharya & Sharma, 2003)',
    detail: 'Nepal National Federation of the Deaf and Hard of Hearing — the authoritative reference.',
    url: 'https://www.nfdn.org.np/',
  },
  {
    label: 'NSL23 dataset (Sunuwar, Borah & Kharga, 2024)',
    detail: 'Peer-reviewed CC-BY video dataset of 13 vowel and 36 consonant NSL signs.',
    url: 'https://doi.org/10.1016/j.dib.2024.110080',
  },
  {
    label: 'Nepali manual alphabet — Wikipedia',
    detail: 'Background on how the alphabet was devised by the Kathmandu Association of the Deaf.',
    url: 'https://en.wikipedia.org/wiki/Nepali_manual_alphabet',
  },
];

/** Shown for any character whose handshape we have not sourced. */
export const NSL_UNDOCUMENTED =
  'Handshape not documented here yet — see the Nepali Sign Language Dictionary (NFDH). We will not guess it.';

/**
 * The four characters Wikipedia explicitly records as deriving from their
 * Latin-alphabet counterparts in the international manual alphabet. These are
 * the only ones we can describe without inventing anything.
 */
const DERIVED_FROM_LATIN: Record<string, { from: string; description: string }> = {
  अ: { from: 'A', description: 'Formed like the international manual alphabet letter A: a fist with the thumb resting alongside the fingers.' },
  ब: { from: 'B', description: 'Formed like the international manual alphabet letter B: flat hand, fingers together and up, thumb across the palm.' },
  म: { from: 'M', description: 'Formed like the international manual alphabet letter M: thumb tucked under three fingers.' },
  र: { from: 'R', description: 'Formed like the international manual alphabet letter R: index and middle fingers crossed.' },
};

// 13 vowels, matching the NSL23 dataset's vowel class count.
const VOWELS = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'];

// 36 consonants, matching the NSL23 dataset's consonant class count
// (the 33 core Devanagari consonants plus the conjuncts क्ष, त्र, ज्ञ).
const CONSONANTS = [
  'क', 'ख', 'ग', 'घ', 'ङ',
  'च', 'छ', 'ज', 'झ', 'ञ',
  'ट', 'ठ', 'ड', 'ढ', 'ण',
  'त', 'थ', 'द', 'ध', 'न',
  'प', 'फ', 'ब', 'भ', 'म',
  'य', 'र', 'ल', 'व',
  'श', 'ष', 'स', 'ह',
  'क्ष', 'त्र', 'ज्ञ',
];

// Devanagari numerals ० - ९.
const NUMERALS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/** Romanised reading, so a non-Devanagari reader can still follow along. */
const ROMAN: Record<string, string> = {
  अ: 'a', आ: 'aa', इ: 'i', ई: 'ii', उ: 'u', ऊ: 'uu', ऋ: 'ri',
  ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', 'अं': 'am', 'अः': 'ah',
  क: 'ka', ख: 'kha', ग: 'ga', घ: 'gha', ङ: 'nga',
  च: 'cha', छ: 'chha', ज: 'ja', झ: 'jha', ञ: 'nya',
  ट: 'ta', ठ: 'tha', ड: 'da', ढ: 'dha', ण: 'na',
  त: 'ta', थ: 'tha', द: 'da', ध: 'dha', न: 'na',
  प: 'pa', फ: 'pha', ब: 'ba', भ: 'bha', म: 'ma',
  य: 'ya', र: 'ra', ल: 'la', व: 'wa',
  श: 'sha', ष: 'shha', स: 'sa', ह: 'ha',
  'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gya',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

function toSign(char: string, category: SignCategory, index: number): Sign {
  const derived = DERIVED_FROM_LATIN[char];
  return {
    id: `nsl-${category.toLowerCase()}-${index}`,
    system: 'NSL',
    term: char,
    category,
    description: derived ? derived.description : NSL_UNDOCUMENTED,
    tip: ROMAN[char] ? `Romanised: ${ROMAN[char]}` : undefined,
  };
}

export const NSL_SIGNS: Sign[] = [
  ...VOWELS.map((c, i) => toSign(c, 'Alphabet', i)),
  ...CONSONANTS.map((c, i) => toSign(c, 'Alphabet', VOWELS.length + i)),
  ...NUMERALS.map((c, i) => toSign(c, 'Numbers', i)),
];

/** True when we have a real, sourced description for this character. */
export function nslIsDocumented(sign: Sign): boolean {
  return sign.description !== NSL_UNDOCUMENTED;
}

export const NSL_DOCUMENTED_COUNT = NSL_SIGNS.filter(nslIsDocumented).length;
