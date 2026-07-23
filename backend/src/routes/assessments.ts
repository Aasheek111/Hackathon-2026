import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { LearningMode } from '@prisma/client';
import { awardXp } from '../lib/progress';

const router = Router();

router.use(requireAuth);

type ModeTotals = Record<'TEXT' | 'AUDIO' | 'VISUAL', {
  totalScore: number;
  samples: number;
  focusedSamples: number;
}>;

const EMPTY_TOTALS: ModeTotals = {
  TEXT: { totalScore: 0, samples: 0, focusedSamples: 0 },
  AUDIO: { totalScore: 0, samples: 0, focusedSamples: 0 },
  VISUAL: { totalScore: 0, samples: 0, focusedSamples: 0 }
};

/**
 * Start (or resume) an assessment attempt.
 *
 * Mirrors the resume-if-incomplete pattern the old (dead) quiz.ts /start route
 * already had - kept, not reinvented, per PLAN.md 6.3.
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    let attempt = await prisma.assessmentAttempt.findFirst({
      where: { userId, completedAt: null },
      orderBy: { startedAt: 'desc' }
    });

    if (!attempt) {
      attempt = await prisma.assessmentAttempt.create({
        data: { userId }
      });
    }

    res.status(201).json({ attemptId: attempt.id, startedAt: attempt.startedAt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});

/**
 * Fire-and-forget per-answer log. Not on the critical path for scoring (that
 * happens at /complete from the authoritative client-side totals), but kept so
 * a full answer-by-answer transcript exists for teacher review later.
 */
router.post('/:id/answer', async (req: Request, res: Response) => {
  try {
    const { questionId, answer, correct, mode } = req.body;
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.id }
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const answerLog = Array.isArray(attempt.answerLog) ? (attempt.answerLog as any[]) : [];
    answerLog.push({ questionId, answer, correct, mode, timestamp: Date.now() });

    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { answerLog }
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log answer' });
  }
});

router.post('/:id/engagement', async (req: Request, res: Response) => {
  try {
    const { score, faceDetected, gaze, mode } = req.body;
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.id }
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const engagementLog = Array.isArray(attempt.engagementLog) ? (attempt.engagementLog as any[]) : [];
    engagementLog.push({ score, faceDetected, gaze, mode, timestamp: Date.now() });
    // keep this bounded - a full 15-minute session at a few samples/sec would
    // otherwise grow the JSON blob without limit
    const trimmed = engagementLog.length > 500 ? engagementLog.slice(-500) : engagementLog;

    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { engagementLog: trimmed }
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log engagement' });
  }
});

/**
 * Finalize the attempt. This is the endpoint that closes the persistence gap
 * documented in PLAN.md Part 0/6 - everything downstream (classroom matching,
 * teacher review, retake history) reads what gets written here.
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      modeEngagement,
      adaptationCount,
      scoreCorrect,
      scoreTotal,
      durationSeconds
    }: {
      modeEngagement?: Partial<ModeTotals>;
      adaptationCount?: number;
      scoreCorrect?: number;
      scoreTotal?: number;
      durationSeconds?: number;
    } = req.body;

    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: req.params['id'] as string, userId }
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const totals: ModeTotals = {
      TEXT: { ...EMPTY_TOTALS.TEXT, ...(modeEngagement?.TEXT || {}) },
      AUDIO: { ...EMPTY_TOTALS.AUDIO, ...(modeEngagement?.AUDIO || {}) },
      VISUAL: { ...EMPTY_TOTALS.VISUAL, ...(modeEngagement?.VISUAL || {}) }
    };

    const avg = (m: keyof ModeTotals) =>
      totals[m].samples > 0 ? totals[m].totalScore / totals[m].samples : 0;

    const textEngagement = avg('TEXT');
    const audioEngagement = avg('AUDIO');
    const visualEngagement = avg('VISUAL');

    const totalSamples = totals.TEXT.samples + totals.AUDIO.samples + totals.VISUAL.samples;
    const totalFocused =
      totals.TEXT.focusedSamples + totals.AUDIO.focusedSamples + totals.VISUAL.focusedSamples;
    const totalScoreSum = totals.TEXT.totalScore + totals.AUDIO.totalScore + totals.VISUAL.totalScore;

    const attentionSpanScore = totalSamples > 0 ? (totalFocused / totalSamples) * 100 : 0;
    const overallAverage = totalSamples > 0 ? totalScoreSum / totalSamples : 0;
    const arRecommended = overallAverage < 50;

    const scores: Record<'TEXT' | 'AUDIO' | 'VISUAL', number> = {
      TEXT: textEngagement,
      AUDIO: audioEngagement,
      VISUAL: visualEngagement
    };
    let preferredMode: LearningMode = 'TEXT';
    const maxScore = Math.max(textEngagement, audioEngagement, visualEngagement);
    (Object.keys(scores) as Array<keyof typeof scores>).forEach((mode) => {
      if (scores[mode] === maxScore && maxScore > 0) preferredMode = mode as LearningMode;
    });

    const total = Math.max(0, scoreTotal ?? 0);
    const correct = Math.max(0, Math.min(scoreCorrect ?? 0, total));
    const scorePercent = total > 0 ? (correct / total) * 100 : 0;

    const completedAt = new Date();
    const updated = await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        textEngagement,
        audioEngagement,
        visualEngagement,
        attentionSpanScore,
        adaptationCount: Math.max(0, adaptationCount ?? 0),
        preferredMode,
        arRecommended,
        scoreCorrect: correct,
        scoreTotal: total,
        scorePercent,
        completedAt,
        durationSeconds: durationSeconds ?? null
      }
    });

    // Keep the cheap "latest snapshot" cache in sync - some existing routes
    // (dashboard.ts) still read DemoResult directly.
    await prisma.demoResult.upsert({
      where: { userId },
      create: {
        userId,
        textEngagement,
        audioEngagement,
        visualEngagement,
        preferredMode,
        arRecommended
      },
      update: {
        textEngagement,
        audioEngagement,
        visualEngagement,
        preferredMode,
        arRecommended,
        completedAt
      }
    });

    const attemptCount = await prisma.assessmentAttempt.count({
      where: { userId, completedAt: { not: null } }
    });
    const { newlyEarned } = await awardXp(userId, 20, { attemptCount });

    res.json({ attempt: updated, newBadges: newlyEarned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete assessment' });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const attempts = await prisma.assessmentAttempt.findMany({
      where: { userId: req.user!.id, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' }
    });
    res.json({ attempts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.id }
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    res.json({ attempt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
});

export default router;
