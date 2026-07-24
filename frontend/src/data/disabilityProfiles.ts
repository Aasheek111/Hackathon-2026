import type { DisabilityType } from '../contexts/AuthContext';

/**
 * The accessibility profiles a student can pick at registration and change
 * later from Settings. Single source of truth so the two pickers can't drift
 * apart, and so adding a profile is a one-line change here plus a case in
 * homePathFor().
 *
 * `dashboard` is documentation of where this profile lands - the actual
 * routing lives in lib/homePath.ts and stays the one authority.
 */
export interface DisabilityProfile {
  value: DisabilityType | null;
  label: string;
  /** Plain-language description of what changes if you pick this. */
  blurb: string;
  /** Which dashboard this profile opens, for display in Settings. */
  dashboard: string;
}

export const DISABILITY_PROFILES: DisabilityProfile[] = [
  {
    value: null,
    label: 'Prefer not to say',
    blurb: 'The standard adaptive dashboard. You can still turn on any accessibility setting yourself.',
    dashboard: 'Adaptive dashboard',
  },
  {
    value: 'AUTISM',
    label: 'Autism',
    blurb: 'Adaptive lessons that adjust to your attention and preferred learning mode.',
    dashboard: 'Adaptive dashboard',
  },
  {
    value: 'ADHD',
    label: 'ADHD',
    blurb: 'Same adaptive lessons, with distracting animations turned off by default.',
    dashboard: 'Adaptive dashboard',
  },
  {
    value: 'BLINDNESS',
    label: 'Blind / low vision',
    blurb: 'An audio-first dashboard you can drive entirely by voice, with everything read aloud.',
    dashboard: 'Audio dashboard',
  },
  {
    value: 'DEAFNESS',
    label: 'Deaf / hard of hearing',
    blurb: 'A visual, caption-first dashboard with a sign language learning section.',
    dashboard: 'Visual dashboard',
  },
];

/** Human-readable label for a stored value (handles null / NONE / unknown). */
export function disabilityLabel(value: DisabilityType | null | undefined): string {
  if (!value || value === 'NONE') return 'Not set';
  return DISABILITY_PROFILES.find((p) => p.value === value)?.label ?? value;
}
