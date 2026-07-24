/**
 * The single source of truth for how a student's performance becomes a mark.
 * Deliberately a plain, explainable weighting (not a black box) so the same
 * formula drives the student's report card and the teacher's roster, and the
 * breakdown can be shown alongside the number.
 *
 * A unit's mark blends what we actually measured:
 *   - final assessment score   (did they pass the exam)      50%
 *   - knowledge-check accuracy (did they follow each lesson) 30%
 *   - concentration/focus      (were they engaged)           10%
 *   - completion               (did they finish)             10%
 * Components with no data are dropped and the remaining weights renormalised,
 * so a unit with no exam yet is still marked fairly on what exists.
 */

export interface MarkInputs {
  finalPercent?: number | null; // 0..100, from FinalAssessmentAttempt
  kcAccuracy?: number | null; // 0..100, correct knowledge-checks / answered
  focus?: number | null; // 0..100, avg concentration
  completed?: boolean;
}

export interface Mark {
  percent: number | null; // null when there's no data at all
  grade: string; // A/B/C/D/F, or '—' when percent is null
  components: Array<{ label: string; value: number; weight: number }>;
}

const WEIGHTS = { final: 50, kc: 30, focus: 10, completion: 10 };

export function letterGrade(percent: number): string {
  if (percent >= 85) return 'A';
  if (percent >= 70) return 'B';
  if (percent >= 55) return 'C';
  if (percent >= 40) return 'D';
  return 'F';
}

export function computeMark(inputs: MarkInputs): Mark {
  const parts: Array<{ label: string; value: number; weight: number }> = [];
  if (typeof inputs.finalPercent === 'number') {
    parts.push({ label: 'Final exam', value: clamp(inputs.finalPercent), weight: WEIGHTS.final });
  }
  if (typeof inputs.kcAccuracy === 'number') {
    parts.push({ label: 'Lesson checks', value: clamp(inputs.kcAccuracy), weight: WEIGHTS.kc });
  }
  if (typeof inputs.focus === 'number') {
    parts.push({ label: 'Focus', value: clamp(inputs.focus), weight: WEIGHTS.focus });
  }
  // Completion only contributes once there's some other signal - a bare
  // "opened it" shouldn't produce a 100% mark on its own.
  if (parts.length > 0) {
    parts.push({ label: 'Completion', value: inputs.completed ? 100 : 0, weight: WEIGHTS.completion });
  }

  if (parts.length === 0) return { percent: null, grade: '—', components: [] };

  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  const percent = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0) / totalWeight);
  return { percent, grade: letterGrade(percent), components: parts };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
