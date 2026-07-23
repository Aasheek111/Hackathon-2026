import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        demoResult: true,
        subscription: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...profileData } = user;
    res.json(profileData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const sessions = await prisma.quizSession.findMany({
      where: { userId, completed: true },
      orderBy: { completedAt: 'desc' },
      take: 10
    });

    const demoResult = await prisma.demoResult.findUnique({
      where: { userId }
    });

    res.json({
      recentSessions: sessions,
      demoResult,
      modeDistribution: demoResult ? {
        TEXT: demoResult.textEngagement,
        AUDIO: demoResult.audioEngagement,
        VISUAL: demoResult.visualEngagement
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/lessons', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const demoResult = await prisma.demoResult.findUnique({
      where: { userId }
    });

    const preferredMode = demoResult?.preferredMode || 'TEXT';

    const materials = await prisma.learningMaterial.findMany({
      where: { learningMode: preferredMode },
      take: 10
    });

    const recentSessions = await prisma.quizSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 5
    });

    res.json({
      recommendedMaterials: materials,
      recentSessions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

export default router;
