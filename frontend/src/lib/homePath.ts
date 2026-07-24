import type { DisabilityType } from '../contexts/AuthContext';

/**
 * Where a signed-in user's "home" is.
 *
 * Single choke point for every redirect that used to hardcode "/dashboard"
 * (App.tsx's ProtectedRoute fallbacks and `/` redirect, LoginPage's
 * post-login navigate, the Navbar links). Adding a disability-specific
 * dashboard means changing this function, not hunting fifteen call sites.
 *
 * Role wins over disability: an ADMIN or TEACHER always lands on their own
 * console regardless of any accessibility profile on the account, since
 * disabilityType is a student-only field.
 *
 * The disability split selects a PRESENTATION, not a permission. Every
 * dashboard stays reachable by typing its URL - see `isDashboardPath`.
 */
export interface HomePathUser {
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  disabilityType?: DisabilityType | null;
}

export const STUDENT_DASHBOARDS = {
  /** Original adaptive dashboard - autism, ADHD, and anyone who skipped the question. */
  DEFAULT: '/dashboard',
  /** Audio-first, voice-navigable. */
  BLIND: '/dashboard/blind',
  /** Caption-first, visual, sign-language learning. */
  DEAF: '/dashboard/deaf',
} as const;

export function homePathFor(user: HomePathUser | null | undefined): string {
  if (!user) return '/';
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'TEACHER') return '/teacher';

  switch (user.disabilityType) {
    case 'BLINDNESS':
      return STUDENT_DASHBOARDS.BLIND;
    case 'DEAFNESS':
      return STUDENT_DASHBOARDS.DEAF;
    // AUTISM, ADHD, NONE, null - the original dashboard, unchanged.
    default:
      return STUDENT_DASHBOARDS.DEFAULT;
  }
}

/** True for any of the three student dashboard roots (used to keep "Dashboard" nav links self-aware). */
export function isDashboardPath(pathname: string): boolean {
  return (Object.values(STUDENT_DASHBOARDS) as string[]).includes(pathname);
}
