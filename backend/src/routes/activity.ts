import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

/**
 * GET /api/activity?month=YYYY-MM           (student: own data)
 * GET /api/activity?month=YYYY-MM&studentId=xxx  (teacher: student in their classroom)
 *
 * Returns daily learning activity for the requested month (or the last 30 days
 * if month is omitted):
 *   days[]   – one entry per calendar day that had any activity
 *   summary  – totals for the full range
 *
 * Score is always reported as a raw percentage, never as a letter grade.
 */

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { month, studentId: queryStudentId } = req.query as Record<string, string>;
    const role = req.user!.role;

    // ── resolve which student we're reporting on ─────────────────────────────
    let targetStudentId: string;

    if (role === 'STUDENT') {
      targetStudentId = req.user!.id;
    } else if (role === 'TEACHER') {
      if (!queryStudentId) {
        return res.status(400).json({ error: 'studentId is required for teacher requests' });
      }
      // Verify the student is in this teacher's classroom
      const classroom = await prisma.classroom.findUnique({
        where: { teacherId: req.user!.id },
        select: { id: true },
      });
      if (!classroom) {
        return res.status(403).json({ error: 'You have no classroom' });
      }
      const enrolment = await prisma.enrolment.findFirst({
        where: { classroomId: classroom.id, studentId: queryStudentId },
      });
      if (!enrolment) {
        return res.status(403).json({ error: 'This student is not in your classroom' });
      }
      targetStudentId = queryStudentId;
    } else {
      // Admin can see any student
      targetStudentId = queryStudentId || req.user!.id;
    }

    // ── date range ────────────────────────────────────────────────────────────
    let rangeStart: Date;
    let rangeEnd: Date;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      rangeStart = new Date(y, m - 1, 1);
      rangeEnd = new Date(y, m, 0, 23, 59, 59, 999); // last ms of the month
    } else {
      // Default: last 30 days
      rangeEnd = new Date();
      rangeStart = new Date(rangeEnd.getTime() - 29 * 24 * 60 * 60 * 1000);
      rangeStart.setHours(0, 0, 0, 0);
    }

    // ── fetch data in parallel ────────────────────────────────────────────────
    const [assessments, finalAttempts, kcAttempts, tutorialProgresses] = await Promise.all([
      // Adaptive quiz attempts
      prisma.assessmentAttempt.findMany({
        where: {
          userId: targetStudentId,
          completedAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { completedAt: true, scorePercent: true, scoreCorrect: true, scoreTotal: true },
        orderBy: { completedAt: 'asc' },
      }),

      // Curriculum final assessment attempts
      prisma.finalAssessmentAttempt.findMany({
        where: {
          studentId: targetStudentId,
          completedAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { completedAt: true, scoreCorrect: true, scoreTotal: true },
        orderBy: { completedAt: 'asc' },
      }),

      // Per-lesson knowledge checks (each correct/incorrect answer counts as activity)
      prisma.knowledgeCheckAttempt.findMany({
        where: {
          studentId: targetStudentId,
          answeredAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { answeredAt: true, correct: true },
        orderBy: { answeredAt: 'asc' },
      }),

      // Lesson completions (curriculum progress updatedAt when lesson advances)
      prisma.tutorialProgress.findMany({
        where: {
          studentId: targetStudentId,
          completedAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { completedAt: true },
        orderBy: { completedAt: 'asc' },
      }),
    ]);

    // ── aggregate by day ──────────────────────────────────────────────────────
    const dayMap = new Map<
      string, // YYYY-MM-DD
      { scores: number[]; lessonsCompleted: number; kcCorrect: number; kcTotal: number }
    >();

    const getDay = (d: Date | null | undefined) => {
      if (!d) return null;
      // Use UTC date string for consistency
      return d.toISOString().slice(0, 10);
    };

    const ensureDay = (dayKey: string) => {
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { scores: [], lessonsCompleted: 0, kcCorrect: 0, kcTotal: 0 });
      }
      return dayMap.get(dayKey)!;
    };

    for (const a of assessments) {
      const key = getDay(a.completedAt);
      if (key) ensureDay(key).scores.push(a.scorePercent);
    }

    for (const fa of finalAttempts) {
      const key = getDay(fa.completedAt);
      if (key && fa.scoreTotal > 0) {
        ensureDay(key).scores.push((fa.scoreCorrect / fa.scoreTotal) * 100);
      }
    }

    for (const kc of kcAttempts) {
      const key = getDay(kc.answeredAt);
      if (key) {
        const day = ensureDay(key);
        day.kcTotal += 1;
        if (kc.correct) day.kcCorrect += 1;
      }
    }

    for (const tp of tutorialProgresses) {
      const key = getDay(tp.completedAt);
      if (key) ensureDay(key).lessonsCompleted += 1;
    }

    // ── build the sorted days array ───────────────────────────────────────────
    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => {
        const avgScore =
          d.scores.length > 0
            ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length)
            : null;
        const kcAccuracy =
          d.kcTotal > 0 ? Math.round((d.kcCorrect / d.kcTotal) * 100) : null;
        return {
          date,
          avgScore,
          kcAccuracy,
          kcCorrect: d.kcCorrect,
          kcTotal: d.kcTotal,
          lessonsCompleted: d.lessonsCompleted,
        };
      });

    // ── summary ───────────────────────────────────────────────────────────────
    const allScores = days.flatMap((d) => (d.avgScore !== null ? [d.avgScore] : []));
    const overallAvgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
        : null;

    const totalLessonsCompleted = days.reduce((s, d) => s + d.lessonsCompleted, 0);
    const totalKcCorrect = days.reduce((s, d) => s + d.kcCorrect, 0);
    const totalKcTotal = days.reduce((s, d) => s + d.kcTotal, 0);
    const totalAssessments = assessments.length + finalAttempts.length;
    const activeDays = days.length;

    // XP / streak for summary card
    const studentProgress = await prisma.studentProgress.findUnique({
      where: { studentId: targetStudentId },
      select: { xp: true, streakDays: true },
    });

    res.json({
      studentId: targetStudentId,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      days,
      summary: {
        activeDays,
        totalAssessments,
        avgScore: overallAvgScore,
        totalLessonsCompleted,
        totalKcCorrect,
        totalKcTotal,
        kcAccuracy: totalKcTotal > 0 ? Math.round((totalKcCorrect / totalKcTotal) * 100) : null,
        xp: studentProgress?.xp ?? 0,
        streakDays: studentProgress?.streakDays ?? 0,
      },
    });
  } catch (error) {
    console.error('Activity route error:', error);
    res.status(500).json({ error: 'Failed to load activity data' });
  }
});

export default router;
