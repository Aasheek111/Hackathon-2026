import { Router, Request, Response } from 'express';
import axios from 'axios';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { awardXp } from '../lib/progress';
import { LearningMode } from '@prisma/client';

const router = Router();
router.use(requireAuth);

const RAG_SERVICE_URL = process.env['RAG_SERVICE_URL'] || 'http://localhost:8100';

/** PLAN.md 8.1 - level derived from the student's own latest assessment score, not invented. */
function levelFromScore(scorePercent: number): number {
  if (scorePercent < 40) return 1;
  if (scorePercent < 60) return 2;
  if (scorePercent < 80) return 3;
  return 4;
}

/**
 * Not awaited by the route that creates the tutorial - the student already
 * has their text/steps/quiz to read while this fills in the picture.
 */
async function queueTutorialImage(tutorialId: string, ragUnitId: number, prompt: string): Promise<void> {
  try {
    const response = await axios.post(
      `${RAG_SERVICE_URL}/generate-visual`,
      { unit_id: ragUnitId, prompt },
      { timeout: 60000 }
    );
    const imageUrl = response.data?.image_url;
    if (imageUrl) {
      await prisma.tutorial.update({ where: { id: tutorialId }, data: { imageUrl } });
    }
  } catch {
    // no key / safety block / quota - the unit preview image or text stands in for it
  }
}

router.get('/:id/tutorial', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const unit = await prisma.unit.findUnique({
      where: { id: req.params['id'] as string },
      include: { subject: { include: { classroom: true } }, preview: true }
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const enrolled = await prisma.enrolment.findUnique({
      where: {
        classroomId_studentId: { classroomId: unit.subject.classroomId, studentId }
      }
    });
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this classroom' });

    if (unit.indexStatus !== 'READY') {
      return res.status(404).json({
        error: 'No content available for this unit yet',
        indexStatus: unit.indexStatus
      });
    }

    const latestAttempt = await prisma.assessmentAttempt.findFirst({
      where: { userId: studentId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' }
    });

    const requestedMode = (req.query['mode'] as string | undefined)?.toUpperCase();
    let learningMode: LearningMode = (['TEXT', 'AUDIO', 'VISUAL', 'AR'].includes(requestedMode || '')
      ? requestedMode
      : latestAttempt?.preferredMode) as LearningMode || 'TEXT';
    // AR isn't a reliable, fully-built tutorial experience yet - fall back to
    // its closest working equivalent rather than generating for a dead end.
    if (learningMode === 'AR') learningMode = 'VISUAL';
    const level = levelFromScore(latestAttempt?.scorePercent ?? 0);

    // Cached lookup first (PLAN.md 8.1) - stable experience, no re-roll, no
    // repeat API cost on every view.
    const cached = await prisma.tutorial.findUnique({
      where: {
        studentId_unitId_learningMode_level: { studentId, unitId: unit.id, learningMode, level }
      }
    });
    if (cached) {
      return res.json({ tutorial: cached, cached: true, unitPreviewImageUrl: unit.preview?.imageUrl ?? null });
    }

    const diagnosis = latestAttempt
      ? `Preferred mode: ${latestAttempt.preferredMode}. Assessment score: ${latestAttempt.scorePercent.toFixed(
          0
        )}%. Attention span score: ${latestAttempt.attentionSpanScore.toFixed(0)}%.`
      : undefined;

    const ragResponse = await axios.post(
      `${RAG_SERVICE_URL}/generate-tutorial`,
      {
        unit_id: unit.ragUnitId,
        student_diagnosis: diagnosis,
        learning_mode: learningMode
      },
      { timeout: 60000 }
    );

    const data = ragResponse.data;

    // PLAN.md 8.3 - refuse rather than let an ungrounded call slip through.
    if (!data.source_chunks || data.source_chunks === 0) {
      return res.status(404).json({ error: 'No content available for this unit yet' });
    }

    const tutorial = await prisma.tutorial.create({
      data: {
        unitId: unit.id,
        studentId,
        learningMode,
        level,
        tutorialText: data.tutorial_text || '',
        audioScript: data.audio_script || '',
        visualSuggestion: data.visual_suggestion || '',
        steps: data.steps || [],
        quiz: data.quiz || [],
        teacherNote: data.teacher_note || '',
        sourceChunks: data.source_chunks || 0,
        offline: Boolean(data.offline)
      }
    });

    const tutorialCount = await prisma.tutorial.count({ where: { studentId } });
    const { newlyEarned: newBadges } = await awardXp(studentId, 10, { tutorialCount });

    res.status(201).json({ tutorial, cached: false, newBadges, unitPreviewImageUrl: unit.preview?.imageUrl ?? null });

    // Not awaited - the student already has text/steps/quiz to read; the
    // picture fills in a few seconds later via polling on the frontend.
    if (learningMode === 'VISUAL' && !tutorial.offline && tutorial.visualSuggestion && unit.ragUnitId) {
      queueTutorialImage(tutorial.id, unit.ragUnitId, tutorial.visualSuggestion).catch(() => {});
    }
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail || error.message;
      return res.status(502).json({ error: `Tutorial generation failed: ${detail}` });
    }
    res.status(500).json({ error: 'Failed to generate tutorial' });
  }
});

/**
 * Chat-driven customization: the student describes what they want the
 * picture to look like, blended with the tutorial's own visual_suggestion.
 * Called synchronously (the student is watching the chat) rather than
 * fire-and-forget like tutorial creation's default image.
 */
router.post('/:id/tutorial/:tutorialId/visual', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const instruction = (req.body?.instruction as string | undefined)?.trim();
    if (!instruction) {
      return res.status(400).json({ error: 'Tell me what you would like the picture to look like' });
    }

    const tutorial = await prisma.tutorial.findFirst({
      where: {
        id: req.params['tutorialId'] as string,
        unitId: req.params['id'] as string,
        studentId: req.user!.id
      }
    });
    if (!tutorial) return res.status(404).json({ error: 'Tutorial not found' });

    const unit = await prisma.unit.findUnique({ where: { id: tutorial.unitId } });
    if (!unit?.ragUnitId) return res.status(404).json({ error: 'This unit has no content indexed yet' });

    const prompt = `${tutorial.visualSuggestion}. Additional request from the student: ${instruction}`;
    const ragResponse = await axios.post(
      `${RAG_SERVICE_URL}/generate-visual`,
      { unit_id: unit.ragUnitId, prompt },
      { timeout: 60000 }
    );

    const imageUrl = ragResponse.data?.image_url;
    if (!imageUrl) return res.status(502).json({ error: 'Could not generate that picture right now' });

    const updated = await prisma.tutorial.update({ where: { id: tutorial.id }, data: { imageUrl } });
    res.json({ tutorial: updated });
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail || error.message;
      return res.status(502).json({ error: `Could not generate that picture: ${detail}` });
    }
    res.status(500).json({ error: 'Failed to customize the picture' });
  }
});

/** Record a mini-quiz completion inside a tutorial (PLAN.md demo step 18-19). */
router.post('/:id/tutorial/:tutorialId/quiz-complete', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const tutorial = await prisma.tutorial.findFirst({
      where: { id: req.params['tutorialId'] as string, studentId: req.user!.id }
    });
    if (!tutorial) return res.status(404).json({ error: 'Tutorial not found' });

    const { newlyEarned } = await awardXp(req.user!.id, 15);
    res.json({ ok: true, newBadges: newlyEarned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record completion' });
  }
});

export default router;
