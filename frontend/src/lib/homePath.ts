import type { DisabilityType } from '../contexts/AuthContext';

/**
 * Where a signed-in user's "home" is.
 *
 * Single choke point for every redirect that used to hardcode "/dashboard"
 * (App.tsx's ProtectedRoute fallbacks and `/` redirect, LoginPage's
 * post-login navigate, the Navbar links). Adding a dashboard variant means
 * changing this function, not hunting fifteen call sites.
 *
 * Role wins over profile: an ADMIN or TEACHER always lands on their own
 * console regardless of any accessibility profile on the account, since
 * disabilityType is a student-only field.
 *
 * The profile selects a PRESENTATION, not a permission. Every dashboard
 * stays reachable by typing its URL - see `isDashboardPath`.
 *
 * ROUTES ARE NAMED FOR THE MODE, NEVER THE PERSON. `/dashboard/audio`, not
 * `/dashboard/blind`. Two reasons, both load-bearing:
 *
 *   1. Privacy. A URL is the least private string in the stack - it lands in
 *      browser history, server access logs, analytics, and Referer headers on
 *      every outbound link. Disability status is special-category personal
 *      data (GDPR Art. 9 / equivalent), so putting it in a path silently
 *      broadcasts a protected characteristic to systems that have no business
 *      holding it and no consent to.
 *   2. It's simply what the thing IS. These are an audio-first and a
 *      visual-first presentation. Sighted users with dyslexia use the audio
 *      one; hearing users in a noisy room use the visual one. Naming them
 *      after a diagnosis would be both stigmatising and inaccurate.
 *
 * The same rule holds for CSS classes, analytics events and log lines added
 * later. `disabilityType` stays on the server-side record (it is legitimate,
 * consented accommodation data) - it just never becomes a URL.
 */
export interface HomePathUser {
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  disabilityType?: DisabilityType | null;
}

export const STUDENT_DASHBOARDS = {
  /** Original adaptive dashboard - autism, ADHD, and anyone who skipped the question. */
  DEFAULT: '/dashboard',
  /** Audio-first and voice-navigable. */
  AUDIO: '/dashboard/audio',
  /** Visual and caption-first, with sign-language learning. */
  VISUAL: '/dashboard/visual',
} as const;

export function homePathFor(user: HomePathUser | null | undefined): string {
  if (!user) return '/';
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'TEACHER') return '/teacher';

  switch (user.disabilityType) {
    case 'BLINDNESS':
      return STUDENT_DASHBOARDS.AUDIO;
    case 'DEAFNESS':
      return STUDENT_DASHBOARDS.VISUAL;
    // AUTISM, ADHD, NONE, null - the original dashboard, unchanged.
    default:
      return STUDENT_DASHBOARDS.DEFAULT;
  }
}

/** True for any of the three student dashboard roots (used to keep "Dashboard" nav links self-aware). */
export function isDashboardPath(pathname: string): boolean {
  return (Object.values(STUDENT_DASHBOARDS) as string[]).includes(pathname);
}
