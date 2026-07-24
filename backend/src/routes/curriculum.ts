import { Router, Request, Response } from 'express';
import axios from 'axios';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, requireApprovedTeacher } from '../middleware/auth';
import { awardXp } from '../lib/progress';

const router = Router();
router.use(requireAuth);

const RAG_SERVICE_URL = process.env['RAG_SERVICE_URL'] || 'http://localhost:8100';

async function unitAccess(userId: string, unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { subject: { include: { classroom: true } } }
  });
  if (!unit) return { unit: null, allowed: false };

  const isOwner = unit.subject.classroom.teacherId === userId;
  if (isOwner) return { unit, allowed: true };

  const enrolled = await prisma.enrolment.findUnique({
    where: { classroomId_studentId: { classroomId: unit.subject.classroomId, studentId: userId } }
  });
  return { unit, allowed: !!enrolled };
}

/** Latest generation job for a unit - teacher or an enrolled student can poll this. */
router.get('/:id/generation-job', async (req: Request, res: Response) => {
  try {
    const { unit, allowed } = await unitAccess(req.user!.id, req.params['id'] as string);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not allowed to view this unit' });

    const job = await prisma.tutorialGenerationJob.findFirst({
      where: { unitId: unit.id },
      orderBy: { startedAt: 'desc' }
    });
    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch generation job' });
  }
});

/**
 * The canonical curriculum for a unit, plus this student's progress pointer
 * into it (created on first view - PLAN §23: one shared curriculum, a thin
 * per-student pointer, not a content copy per student). The owning teacher
 * can also view it - read-only preview, no progress pointer is created for
 * them (a teacher isn't "a student progressing through" their own unit).
 */
router.get('/:id/curriculum', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const unitId = req.params['id'] as string;
    const { unit, allowed } = await unitAccess(userId, unitId);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not allowed to view this unit' });

    const curriculum = await prisma.tutorialCurriculum.findUnique({
      where: { unitId },
      include: {
        lessons: { include: { knowledgeCheck: true }, orderBy: { order: 'asc' } },
        finalAssessmentQuestions: { orderBy: { order: 'asc' } }
      }
    });
    if (!curriculum) {
      return res.status(404).json({ error: 'No curriculum generated for this unit yet' });
    }

    const isStudent = req.user!.role === 'STUDENT';
    const progress = isStudent
      ? await prisma.tutorialProgress.upsert({
          where: { studentId_curriculumId: { studentId: userId, curriculumId: curriculum.id } },
          create: { studentId: userId, curriculumId: curriculum.id, currentLessonOrder: 0 },
          update: {}
        })
      : null;

    // Adaptive presentation on top of the canonical content (PLAN §23) - the
    // student's own latest assessment, never a separate curriculum copy.
    const latestAttempt = isStudent
      ? await prisma.assessmentAttempt.findFirst({
          where: { userId, completedAt: { not: null } },
          orderBy: { completedAt: 'desc' },
          select: { preferredMode: true, attentionSpanScore: true }
        })
      : null;

    res.json({ curriculum, progress, personalization: latestAttempt, preview: !isStudent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch curriculum' });
  }
});

/**
 * Advance (or rewind) the student's position in the curriculum. Awards XP
 * once, the first time `completed` flips true - covers curricula with no
 * final assessment, where this is the only completion signal.
 */
router.patch('/:id/curriculum/progress', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { currentLessonOrder, completed } = req.body as { currentLessonOrder?: number; completed?: boolean };

    const curriculum = await prisma.tutorialCurriculum.findUnique({ where: { unitId: req.params['id'] as string } });
    if (!curriculum) return res.status(404).json({ error: 'No curriculum for this unit' });

    const existing = await prisma.tutorialProgress.findUnique({
      where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } }
    });

    const progress = await prisma.tutorialProgress.upsert({
      where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } },
      create: {
        studentId,
        curriculumId: curriculum.id,
        currentLessonOrder: currentLessonOrder ?? 0,
        completed: !!completed,
        completedAt: completed ? new Date() : null
      },
      update: {
        ...(typeof currentLessonOrder === 'number' ? { currentLessonOrder } : {}),
        ...(typeof completed === 'boolean' ? { completed, completedAt: completed ? new Date() : null } : {})
      }
    });

    let newBadges: Array<{ name: string }> = [];
    if (completed && !existing?.completed) {
      const result = await awardXp(studentId, 20);
      newBadges = result.newlyEarned;
    }

    res.json({ progress, newBadges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

/** Submit an answer to one lesson's knowledge-check question. */
router.post(
  '/:id/curriculum/lessons/:lessonId/knowledge-check',
  requireRole('STUDENT'),
  async (req: Request, res: Response) => {
    try {
      const studentId = req.user!.id;
      const { answer } = req.body as { answer?: string };
      if (!answer) return res.status(400).json({ error: 'An answer is required' });

      const question = await prisma.knowledgeCheckQuestion.findUnique({
        where: { lessonId: req.params['lessonId'] as string }
      });
      if (!question) return res.status(404).json({ error: 'No knowledge check for this lesson' });

      const correct = answer === question.correct;
      await prisma.knowledgeCheckAttempt.upsert({
        where: { questionId_studentId: { questionId: question.id, studentId } },
        create: { questionId: question.id, studentId, answer, correct },
        update: { answer, correct, answeredAt: new Date() }
      });

      res.json({ correct, correctAnswer: question.correct });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record answer' });
    }
  }
);

/** Submit the final assessment (up to 10 MCQs), score it, and mark the curriculum complete. */
router.post('/:id/curriculum/final-assessment', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { answers } = req.body as { answers?: Array<{ questionId: string; answer: string }> };

    const curriculum = await prisma.tutorialCurriculum.findUnique({
      where: { unitId: req.params['id'] as string },
      include: { finalAssessmentQuestions: true }
    });
    if (!curriculum) return res.status(404).json({ error: 'No curriculum for this unit' });
    if (curriculum.finalAssessmentQuestions.length === 0) {
      return res.status(400).json({ error: 'This curriculum has no final assessment' });
    }

    const questionMap = new Map(curriculum.finalAssessmentQuestions.map((q) => [q.id, q]));
    const answerLog = (answers || []).map((a) => {
      const question = questionMap.get(a.questionId);
      return { questionId: a.questionId, answer: a.answer, correct: !!question && a.answer === question.correct };
    });
    const scoreCorrect = answerLog.filter((a) => a.correct).length;
    const scoreTotal = curriculum.finalAssessmentQuestions.length;

    const attempt = await prisma.finalAssessmentAttempt.create({
      data: { curriculumId: curriculum.id, studentId, answerLog, scoreCorrect, scoreTotal }
    });

    const existing = await prisma.tutorialProgress.findUnique({
      where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } }
    });
    await prisma.tutorialProgress.upsert({
      where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } },
      create: {
        studentId,
        curriculumId: curriculum.id,
        currentLessonOrder: 0,
        completed: true,
        completedAt: new Date()
      },
      update: { completed: true, completedAt: new Date() }
    });

    const { newlyEarned: newBadges } = existing?.completed
      ? { newlyEarned: [] as Array<{ name: string }> }
      : await awardXp(studentId, 20);

    res.status(201).json({ attempt, newBadges });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit final assessment' });
  }
});

/**
 * Regenerates every lesson's picture from its own text - fast and doesn't
 * touch Gemini's text-generation quota at all, unlike a full regenerate:
 * image generation goes through generate_visual_image() (Gemini image model,
 * falling back to pollinations.ai), a completely separate call from the
 * lesson-planning/writing pipeline that actually hits the daily text quota.
 * Fire-and-forget, same pattern as the rest of this pipeline's background work.
 */
router.post('/:id/regenerate-visuals', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: req.params['id'] as string },
      include: { subject: { include: { classroom: true } } }
    });
    if (!unit || unit.subject.classroom.teacherId !== req.user!.id) {
      return res.status(404).json({ error: 'Unit not found or not yours' });
    }
    if (!unit.ragUnitId) return res.status(400).json({ error: 'This unit has no indexed document yet' });

    const curriculum = await prisma.tutorialCurriculum.findUnique({
      where: { unitId: unit.id },
      include: { lessons: { select: { id: true, title: true, explanation: true } } }
    });
    if (!curriculum) return res.status(404).json({ error: 'No curriculum generated for this unit yet' });

    regenerateVisuals(unit.ragUnitId, curriculum.lessons).catch(() => {});
    res.status(202).json({ status: 'queued', lessonCount: curriculum.lessons.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to queue visual regeneration' });
  }
});

async function regenerateVisuals(
  ragUnitId: number,
  lessons: Array<{ id: string; title: string; explanation: string }>
): Promise<void> {
  for (const lesson of lessons) {
    try {
      const prompt = `${lesson.title}. ${lesson.explanation}`;
      const response = await axios.post(
        `${RAG_SERVICE_URL}/generate-visual`,
        { unit_id: ragUnitId, prompt },
        { timeout: 60000 }
      );
      const imageUrl = response.data?.image_url;
      if (imageUrl) {
        await prisma.tutorialLesson.update({ where: { id: lesson.id }, data: { imageUrl } });
      }
    } catch {
      // one lesson's image failing (quota, safety block) shouldn't stop the rest
    }
  }
}

export default router;
