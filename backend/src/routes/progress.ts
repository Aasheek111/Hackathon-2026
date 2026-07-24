import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { buildStudentReport } from '../lib/studentReport';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const progress = await prisma.studentProgress.findUnique({
      where: { studentId: req.user!.id }
    });
    res.json(
      progress || { studentId: req.user!.id, xp: 0, streakDays: 0, badges: [], lastActiveDate: null }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

/**
 * The student's report card: a consolidated MARK per unit and per subject
 * (see lib/marking) rolled up from exam scores, lesson-check accuracy,
 * concentration and completion - plus a learning-pattern read (which mode
 * they engage/focus best in, attention level) and, from that, which subjects
 * to focus on next. All local aggregation, no AI.
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    // Shared with the teacher-facing view so both render identical numbers -
    // see lib/studentReport.ts. Callers authorize; here the caller IS the
    // student, so their own id is inherently allowed.
    const report = await buildStudentReport(req.user!.id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to build report' });
  }
});

export default router;
