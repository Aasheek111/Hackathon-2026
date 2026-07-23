import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

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

export default router;
