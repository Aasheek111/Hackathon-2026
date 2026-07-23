import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { awardXp } from '../lib/progress';

const router = Router();
router.use(requireAuth);

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
 * per-student pointer, not a content copy per student).
 */
router.get('/:id/curriculum', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const unitId = req.params['id'] as string;
    const { unit, allowed } = await unitAccess(studentId, unitId);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not enrolled in this classroom' });

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

    const progress = await prisma.tutorialProgress.upsert({
      where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } },
      create: { studentId, curriculumId: curriculum.id, currentLessonOrder: 0 },
      update: {}
    });

    res.json({ curriculum, progress });
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

export default router;
