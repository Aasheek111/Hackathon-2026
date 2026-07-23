/**
 * Classroom matching (PLAN.md Part 5.4). Deliberately a plain, explainable
 * scoring function rather than a black box - the `reasons` array returned here
 * is rendered directly as the "why this classroom" explanation shown to the
 * student, so it can never say something the criteria didn't actually check.
 */

export interface StudentProfile {
  textEngagement: number;
  audioEngagement: number;
  visualEngagement: number;
  attentionSpanScore: number;
  scorePercent: number;
  preferredMode: string;
  arRecommended: boolean;
}

export interface AdmissionCriteriaLike {
  minTextEngagement?: number | null;
  maxTextEngagement?: number | null;
  minAudioEngagement?: number | null;
  maxAudioEngagement?: number | null;
  minVisualEngagement?: number | null;
  maxVisualEngagement?: number | null;
  preferredModes?: unknown;
  minAttentionSpanScore?: number | null;
  maxAttentionSpanScore?: number | null;
  minScorePercent?: number | null;
  maxScorePercent?: number | null;
  arRecommendedOnly?: boolean | null;
}

export interface MatchReason {
  label: string;
  applicable: boolean;
  passed: boolean;
  weight: number;
  detail: string;
}

export interface MatchResult {
  score: number; // 0-100
  reasons: MatchReason[];
}

function inRange(
  label: string,
  value: number,
  min: number | null | undefined,
  max: number | null | undefined,
  weight: number
): MatchReason {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  const applicable = hasMin || hasMax;

  if (!applicable) {
    return { label, applicable: false, passed: true, weight, detail: 'No constraint set' };
  }

  const passed = (!hasMin || value >= (min as number)) && (!hasMax || value <= (max as number));
  const range = `${hasMin ? min : '−∞'}–${hasMax ? max : '∞'}`;
  return {
    label,
    applicable: true,
    passed,
    weight,
    detail: passed
      ? `${label} is ${value.toFixed(1)}, within the classroom's target range (${range})`
      : `${label} is ${value.toFixed(1)}, outside the classroom's target range (${range})`
  };
}

function parseModes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function modeOverlap(preferredMode: string, rawModes: unknown, weight: number): MatchReason {
  const modes = parseModes(rawModes);
  if (modes.length === 0) {
    return { label: 'Preferred mode', applicable: false, passed: true, weight, detail: 'No constraint set' };
  }
  const passed = modes.includes(preferredMode);
  return {
    label: 'Preferred mode',
    applicable: true,
    passed,
    weight,
    detail: passed
      ? `Your preferred mode (${preferredMode}) is one this classroom is designed for`
      : `Your preferred mode (${preferredMode}) isn't one this classroom targets (${modes.join(', ')})`
  };
}

function arMatch(arRecommended: boolean, arRecommendedOnly: boolean | null | undefined, weight: number): MatchReason {
  if (arRecommendedOnly === null || arRecommendedOnly === undefined) {
    return { label: 'AR track', applicable: false, passed: true, weight, detail: 'No constraint set' };
  }
  const passed = !arRecommendedOnly || arRecommended;
  return {
    label: 'AR track',
    applicable: true,
    passed,
    weight,
    detail: passed
      ? 'This classroom fits your AR-track recommendation'
      : 'This classroom is reserved for learners recommended for the AR track'
  };
}

export function scoreClassroomMatch(profile: StudentProfile, criteria: AdmissionCriteriaLike): MatchResult {
  const checks: MatchReason[] = [
    inRange('Text engagement', profile.textEngagement, criteria.minTextEngagement, criteria.maxTextEngagement, 1),
    inRange('Audio engagement', profile.audioEngagement, criteria.minAudioEngagement, criteria.maxAudioEngagement, 1),
    inRange('Visual engagement', profile.visualEngagement, criteria.minVisualEngagement, criteria.maxVisualEngagement, 1),
    inRange(
      'Attention span',
      profile.attentionSpanScore,
      criteria.minAttentionSpanScore,
      criteria.maxAttentionSpanScore,
      1.5
    ),
    inRange('Assessment score', profile.scorePercent, criteria.minScorePercent, criteria.maxScorePercent, 1),
    modeOverlap(profile.preferredMode, criteria.preferredModes, 1),
    arMatch(profile.arRecommended, criteria.arRecommendedOnly, 1)
  ];

  const applicable = checks.filter((c) => c.applicable);

  if (applicable.length === 0) {
    // no criteria set at all - every student is a full match by default
    return { score: 100, reasons: checks };
  }

  const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);
  const passedWeight = applicable.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((passedWeight / totalWeight) * 100);

  return { score, reasons: checks };
}

export function profileFromAttempt(attempt: {
  textEngagement: number;
  audioEngagement: number;
  visualEngagement: number;
  attentionSpanScore: number;
  scorePercent: number;
  preferredMode: string;
  arRecommended: boolean;
}): StudentProfile {
  return {
    textEngagement: attempt.textEngagement,
    audioEngagement: attempt.audioEngagement,
    visualEngagement: attempt.visualEngagement,
    attentionSpanScore: attempt.attentionSpanScore,
    scorePercent: attempt.scorePercent,
    preferredMode: attempt.preferredMode,
    arRecommended: attempt.arRecommended
  };
}
