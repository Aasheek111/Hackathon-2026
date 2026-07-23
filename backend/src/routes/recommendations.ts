import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { scoreClassroomMatch, profileFromAttempt } from '../lib/classroomMatch';

const router = Router();

router.use(requireAuth);

/**
 * Ranked classroom matches for the current student, from their latest
 * completed assessment (PLAN.md 5.4). Never invents a recommendation - if
 * there is no completed attempt yet, it says so rather than guessing.
 */
router.get('/', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;

    const latestAttempt = await prisma.assessmentAttempt.findFirst({
      where: { userId: studentId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' }
    });

    if (!latestAttempt) {
      return res.json({ recommendations: [], attempt: null, message: 'Complete the assessment first' });
    }

    const classrooms = await prisma.classroom.findMany({
      include: { admissionCriteria: true, teacher: { select: { name: true } } }
    });

    const profile = profileFromAttempt(latestAttempt);
    const recommendations = classrooms
      .map((classroom) => {
        const match = scoreClassroomMatch(profile, classroom.admissionCriteria || {});
        return {
          classroom: {
            id: classroom.id,
            name: classroom.name,
            description: classroom.description,
            teacherName: classroom.teacher.name
          },
          score: match.score,
          reasons: match.reasons
        };
      })
      .sort((a, b) => b.score - a.score);

    res.json({ recommendations, attempt: latestAttempt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute recommendations' });
  }
});

export default router;
