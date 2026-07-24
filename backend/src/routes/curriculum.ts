import { Router, Request, Response } from 'express';
import axios from 'axios';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, requireApprovedTeacher } from '../middleware/auth';
import { awardXp } from '../lib/progress';
import { computeMark } from '../lib/marking';
import { LearningMode } from '@prisma/client';

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
 * AR balloon-game questions for a unit, assembled entirely from MCQs the
 * curriculum ALREADY has (each lesson's knowledge-check + the final
 * assessment) - deliberately ZERO AI calls, so "AR mode" costs nothing to
 * generate. The board has 4 balloons, so only 4-option questions qualify;
 * shorter ones are skipped rather than padded with fake options.
 */
router.get('/:id/ar-game', async (req: Request, res: Response) => {
  try {
    const { unit, allowed } = await unitAccess(req.user!.id, req.params['id'] as string);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not allowed to view this unit' });

    const curriculum = await prisma.tutorialCurriculum.findUnique({
      where: { unitId: unit.id },
      include: {
        lessons: { include: { knowledgeCheck: true }, orderBy: { order: 'asc' } },
        finalAssessmentQuestions: { orderBy: { order: 'asc' } }
      }
    });
    if (!curriculum) return res.status(404).json({ error: 'No curriculum generated for this unit yet' });

    type ArQuestion = { q: string; options: string[]; answer: string };
    const seen = new Set<string>();
    const questions: ArQuestion[] = [];
    const add = (question: string, options: string[], answer: string) => {
      // Exactly 4 options (one per balloon), a correct answer that is one of
      // them, and no duplicate questions across lessons + final assessment.
      if (!question || options.length !== 4 || !options.includes(answer)) return;
      const key = question.trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      questions.push({ q: question, options, answer });
    };

    for (const lesson of curriculum.lessons) {
      const kc = lesson.knowledgeCheck;
      if (kc) add(kc.question, kc.options as string[], kc.correct);
    }
    for (const q of curriculum.finalAssessmentQuestions) {
      add(q.question, q.options as string[], q.correct);
    }

    res.json({ title: curriculum.title, questions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to build AR game' });
  }
});

/**
 * The unit's assigned YouTube quiz (teacher forwarded it via
 * PATCH /youtube-quiz/:id/assign), stripped of `correct` - answers only come
 * back after POST .../submit, so a student can't just read them off the
 * network tab before attempting it.
 */
router.get('/:id/youtube-quiz', async (req: Request, res: Response) => {
  try {
    const { unit, allowed } = await unitAccess(req.user!.id, req.params['id'] as string);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not allowed to view this unit' });

    const quiz = await prisma.youtubeQuiz.findFirst({
      where: { unitId: unit.id, status: 'READY' },
      orderBy: { createdAt: 'desc' },
      include: { questions: { orderBy: { order: 'asc' }, select: { id: true, order: true, question: true, options: true } } }
    });
    if (!quiz) return res.status(404).json({ error: 'No YouTube quiz assigned to this unit yet' });

    const isStudent = req.user!.role === 'STUDENT';
    const latestAttempt = isStudent
      ? await prisma.youtubeQuizAttempt.findFirst({
          where: { quizId: quiz.id, studentId: req.user!.id },
          orderBy: { completedAt: 'desc' }
        })
      : null;

    res.json({
      quiz: { id: quiz.id, title: quiz.title, sourceUrl: quiz.sourceUrl, questions: quiz.questions },
      latestAttempt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch YouTube quiz' });
  }
});

/** Score a YouTube quiz attempt server-side (never trust a client-reported score) and award XP. */
router.post('/:id/youtube-quiz/submit', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { unit, allowed } = await unitAccess(studentId, req.params['id'] as string);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not allowed to view this unit' });

    const quiz = await prisma.youtubeQuiz.findFirst({
      where: { unitId: unit.id, status: 'READY' },
      include: { questions: true }
    });
    if (!quiz) return res.status(404).json({ error: 'No YouTube quiz assigned to this unit yet' });

    const { answers } = req.body as { answers?: Array<{ questionId: string; answer: string }> };
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));
    const answerLog = (answers || []).map((a) => {
      const question = questionMap.get(a.questionId);
      return { questionId: a.questionId, answer: a.answer, correct: !!question && a.answer === question.correct };
    });
    const scoreCorrect = answerLog.filter((a) => a.correct).length;
    const scoreTotal = quiz.questions.length;

    const attempt = await prisma.youtubeQuizAttempt.create({
      data: { quizId: quiz.id, studentId, scoreCorrect, scoreTotal, answerLog }
    });

    const { newlyEarned: newBadges } = await awardXp(studentId, 10);
    const correctAnswers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correct]));

    res.status(201).json({ attempt, newBadges, correctAnswers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

/**
 * Concentration ingestion from the tutorial player's webcam/CV loop. Stored
 * as running sums per (student, unit, lesson) so this is a single cheap
 * upsert-increment - no per-frame rows, no external AI (the CV compute is
 * local). Best-effort by nature; a dropped sample just slightly changes an
 * average.
 */
router.post('/:id/engagement', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { unit, allowed } = await unitAccess(studentId, req.params['id'] as string);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not enrolled in this classroom' });

    const lessonOrder = Math.max(0, Math.round(Number(req.body?.lessonOrder) || 0));
    const score = Math.max(0, Math.min(100, Number(req.body?.score) || 0));
    const focused = Boolean(req.body?.focused);
    const mode = (['TEXT', 'AUDIO', 'VISUAL', 'AR'] as const).includes(req.body?.mode)
      ? (req.body.mode as LearningMode)
      : 'TEXT';

    await prisma.unitEngagementSample.upsert({
      where: { studentId_unitId_lessonOrder: { studentId, unitId: unit.id, lessonOrder } },
      create: {
        studentId,
        unitId: unit.id,
        lessonOrder,
        mode,
        totalScore: score,
        samples: 1,
        focusedSamples: focused ? 1 : 0
      },
      update: {
        totalScore: { increment: score },
        samples: { increment: 1 },
        focusedSamples: { increment: focused ? 1 : 0 },
        mode
      }
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record engagement' });
  }
});

/**
 * Teacher-only per-unit analytics: the data behind the concentration heatmap
 * (each enrolled student x each lesson = average focus) plus per-student
 * performance (knowledge-check accuracy, final-assessment score, completion).
 * One indexed query set, no AI.
 */
router.get('/:id/analytics', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: req.params['id'] as string },
      include: {
        subject: { include: { classroom: { include: { enrolments: { include: { student: true } } } } } },
        curriculum: {
          include: {
            lessons: { include: { knowledgeCheck: true }, orderBy: { order: 'asc' } },
            finalAssessmentQuestions: true
          }
        }
      }
    });
    if (!unit || unit.subject.classroom.teacherId !== req.user!.id) {
      return res.status(404).json({ error: 'Unit not found or not yours' });
    }

    const curriculum = unit.curriculum;
    const lessons = curriculum?.lessons ?? [];
    const students = unit.subject.classroom.enrolments.map((e) => e.student);
    const studentIds = students.map((s) => s.id);

    const [samples, progresses, kcAttempts, finalAttempts] = await Promise.all([
      prisma.unitEngagementSample.findMany({ where: { unitId: unit.id, studentId: { in: studentIds } } }),
      curriculum
        ? prisma.tutorialProgress.findMany({ where: { curriculumId: curriculum.id, studentId: { in: studentIds } } })
        : Promise.resolve([]),
      curriculum
        ? prisma.knowledgeCheckAttempt.findMany({
            where: { studentId: { in: studentIds }, question: { lesson: { curriculumId: curriculum.id } } }
          })
        : Promise.resolve([]),
      curriculum
        ? prisma.finalAssessmentAttempt.findMany({
            where: { curriculumId: curriculum.id, studentId: { in: studentIds } },
            orderBy: { completedAt: 'desc' }
          })
        : Promise.resolve([])
    ]);

    const sampleKey = (studentId: string, order: number) => `${studentId}:${order}`;
    const sampleMap = new Map(samples.map((s) => [sampleKey(s.studentId, s.lessonOrder), s]));

    const studentRows = students.map((student) => {
      const perLesson = lessons.map((lesson) => {
        const s = sampleMap.get(sampleKey(student.id, lesson.order));
        const avgScore = s && s.samples > 0 ? Math.round(s.totalScore / s.samples) : null;
        const focusedRatio = s && s.samples > 0 ? Math.round((s.focusedSamples / s.samples) * 100) : null;
        return { order: lesson.order, avgScore, focusedRatio, samples: s?.samples ?? 0 };
      });
      const withData = perLesson.filter((l) => l.avgScore !== null) as Array<{ avgScore: number }>;
      const overallAvgFocus = withData.length
        ? Math.round(withData.reduce((a, l) => a + l.avgScore, 0) / withData.length)
        : null;

      const myKc = kcAttempts.filter((a) => a.studentId === student.id);
      const kcCorrect = myKc.filter((a) => a.correct).length;
      const latestFinal = finalAttempts.find((a) => a.studentId === student.id) || null;
      const progress = progresses.find((p) => p.studentId === student.id) || null;

      const mark = computeMark({
        finalPercent: latestFinal && latestFinal.scoreTotal > 0 ? (latestFinal.scoreCorrect / latestFinal.scoreTotal) * 100 : null,
        kcAccuracy: myKc.length > 0 ? (kcCorrect / myKc.length) * 100 : null,
        focus: overallAvgFocus,
        completed: !!progress?.completed
      });

      return {
        id: student.id,
        name: student.name,
        completed: !!progress?.completed,
        currentLessonOrder: progress?.currentLessonOrder ?? 0,
        preferredMode: progress?.preferredMode ?? null,
        knowledgeChecks: { correct: kcCorrect, total: myKc.length },
        finalScore: latestFinal ? { correct: latestFinal.scoreCorrect, total: latestFinal.scoreTotal } : null,
        mark: mark.percent,
        grade: mark.grade,
        lessons: perLesson,
        overallAvgFocus
      };
    });

    res.json({
      unit: { id: unit.id, title: unit.title },
      hasCurriculum: !!curriculum,
      lessons: lessons.map((l) => ({ order: l.order, title: l.title })),
      students: studentRows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to build analytics' });
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
    const { currentLessonOrder, completed, preferredMode } = req.body as {
      currentLessonOrder?: number;
      completed?: boolean;
      preferredMode?: LearningMode;
    };
    const validMode = (['TEXT', 'AUDIO', 'VISUAL', 'AR'] as const).includes(preferredMode as any)
      ? (preferredMode as LearningMode)
      : undefined;

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
        ...(validMode ? { preferredMode: validMode } : {}),
        completed: !!completed,
        completedAt: completed ? new Date() : null
      },
      update: {
        ...(typeof currentLessonOrder === 'number' ? { currentLessonOrder } : {}),
        ...(validMode ? { preferredMode: validMode } : {}),
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
