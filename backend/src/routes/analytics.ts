import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireApprovedTeacher } from '../middleware/auth';
import { buildStudentReport, teacherTeachesStudent } from '../lib/studentReport';

const router = Router();
router.use(requireAuth);

/**
 * Teacher class overview: every subject/unit the teacher owns with quick
 * roll-ups (average concentration, average final-assessment score, how many
 * enrolled students have completed it) - the landing view for the Insights
 * page, from which a teacher drills into any unit's concentration heatmap
 * (GET /units/:id/analytics). All local data, no AI.
 */
router.get('/analytics/class', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { teacherId: req.user!.id },
      include: {
        enrolments: { include: { student: { select: { id: true, name: true } } } },
        subjects: {
          include: {
            units: {
              include: {
                curriculum: { include: { lessons: { select: { id: true } } } }
              }
            }
          }
        }
      }
    });
    if (!classroom) return res.json({ classroom: null });

    const studentIds = classroom.enrolments.map((e) => e.student.id);
    const enrolledCount = studentIds.length;

    // Pull every rollup / attempt once, then aggregate in memory.
    const unitIds = classroom.subjects.flatMap((s) => s.units.map((u) => u.id));
    const curriculumIds = classroom.subjects
      .flatMap((s) => s.units.map((u) => u.curriculum?.id))
      .filter((x): x is string => !!x);

    const [samples, progresses, finals, latestAttempts] = await Promise.all([
      prisma.unitEngagementSample.findMany({ where: { unitId: { in: unitIds }, studentId: { in: studentIds } } }),
      prisma.tutorialProgress.findMany({ where: { curriculumId: { in: curriculumIds }, studentId: { in: studentIds } } }),
      prisma.finalAssessmentAttempt.findMany({
        where: { curriculumId: { in: curriculumIds }, studentId: { in: studentIds } }
      }),
      prisma.assessmentAttempt.findMany({
        where: { userId: { in: studentIds }, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        select: { userId: true, attentionSpanScore: true, scorePercent: true, preferredMode: true, completedAt: true }
      })
    ]);

    const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null);

    const subjects = classroom.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      units: subject.units.map((unit) => {
        const unitSamples = samples.filter((s) => s.unitId === unit.id && s.samples > 0);
        const focus = avg(unitSamples.map((s) => s.totalScore / s.samples));
        const unitFinals = unit.curriculum
          ? finals.filter((f) => f.curriculumId === unit.curriculum!.id)
          : [];
        const avgScorePercent = avg(
          unitFinals.map((f) => (f.scoreTotal > 0 ? (f.scoreCorrect / f.scoreTotal) * 100 : 0))
        );
        const completed = unit.curriculum
          ? progresses.filter((p) => p.curriculumId === unit.curriculum!.id && p.completed).length
          : 0;
        return {
          id: unit.id,
          title: unit.title,
          hasCurriculum: !!unit.curriculum,
          lessonCount: unit.curriculum?.lessons.length ?? 0,
          avgFocus: focus,
          avgScorePercent,
          completed,
          enrolled: enrolledCount
        };
      })
    }));

    // Per-student class summary (attention from the diagnostic, average focus
    // across all this teacher's units, units completed).
    const latestByStudent = new Map<string, (typeof latestAttempts)[number]>();
    for (const a of latestAttempts) if (!latestByStudent.has(a.userId)) latestByStudent.set(a.userId, a);

    const studentRows = classroom.enrolments.map((e) => {
      const s = e.student;
      const mySamples = samples.filter((x) => x.studentId === s.id && x.samples > 0);
      const avgFocus = avg(mySamples.map((x) => x.totalScore / x.samples));
      const completedUnits = progresses.filter((p) => p.studentId === s.id && p.completed).length;
      const attempt = latestByStudent.get(s.id) || null;
      return {
        id: s.id,
        name: s.name,
        attentionSpanScore: attempt ? Math.round(attempt.attentionSpanScore) : null,
        diagnosticScore: attempt ? Math.round(attempt.scorePercent) : null,
        preferredMode: attempt?.preferredMode ?? null,
        avgFocus,
        completedUnits
      };
    });

    res.json({
      classroom: { id: classroom.id, name: classroom.name },
      enrolledCount,
      subjects,
      students: studentRows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to build class analytics' });
  }
});

/**
 * Everything a teacher needs about ONE of their students, in one call: the
 * same report card the student sees for themselves (identical numbers, via
 * the shared buildStudentReport), plus their profile, gamification stats,
 * and full diagnostic-assessment history.
 *
 * Authorized by classroom ownership, not just the TEACHER role - a teacher
 * may only ever open a learner enrolled in their own classroom. Returns 404
 * rather than 403 for someone else's student, so this can't be used to probe
 * which user ids exist.
 */
router.get('/analytics/students/:studentId', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const studentId = req.params['studentId'] as string;

    if (!(await teacherTeachesStudent(req.user!.id, studentId))) {
      return res.status(404).json({ error: 'Student not found in your classroom' });
    }

    const [student, report, progress, attempts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, email: true, disabilityType: true, createdAt: true }
      }),
      buildStudentReport(studentId),
      prisma.studentProgress.findUnique({ where: { studentId } }),
      prisma.assessmentAttempt.findMany({
        where: { userId: studentId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          scorePercent: true,
          scoreCorrect: true,
          scoreTotal: true,
          preferredMode: true,
          attentionSpanScore: true,
          textEngagement: true,
          audioEngagement: true,
          visualEngagement: true,
          adaptationCount: true,
          durationSeconds: true,
          completedAt: true
        }
      })
    ]);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    res.json({
      student,
      report,
      progress: progress || { xp: 0, streakDays: 0, badges: [], lastActiveDate: null },
      attempts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load student detail' });
  }
});

export default router;
