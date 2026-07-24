import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getAppConfig } from '../lib/appConfig';
import { LearningMode, Role } from '@prisma/client';

const router = Router();

router.use(requireAuth, requireAdmin);

/** Global app settings (admin-only). Currently the target grade/education level. */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await getAppConfig();
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

router.patch('/config', async (req: Request, res: Response) => {
  try {
    const gradeLevel = String(req.body?.gradeLevel ?? '').trim();
    if (!gradeLevel) return res.status(400).json({ error: 'A grade level is required' });
    if (gradeLevel.length > 60) return res.status(400).json({ error: 'Grade level is too long' });

    const config = await prisma.appConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', gradeLevel },
      update: { gradeLevel }
    });
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, name: true, email: true, role: true, createdAt: true }
      }),
      prisma.user.count()
    ]);

    res.json({ users, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params['id'] as string },
      data: { role: role as Role },
      select: { id: true, name: true, email: true, role: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params['id'] as string } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeSubscriptions = await prisma.subscription.count({
      where: { paymentStatus: 'SUCCESS' }
    });
    const results = await prisma.demoResult.findMany();
    
    let totalText = 0, totalAudio = 0, totalVisual = 0;
    results.forEach((r: { textEngagement: number; audioEngagement: number; visualEngagement: number }) => {
      totalText += r.textEngagement;
      totalAudio += r.audioEngagement;
      totalVisual += r.visualEngagement;
    });

    const n = results.length || 1;

    res.json({
      totalUsers,
      activeSubscriptions,
      avgEngagement: {
        TEXT: totalText / n,
        AUDIO: totalAudio / n,
        VISUAL: totalVisual / n
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/questions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      prisma.quizQuestion.findMany({ skip, take: limit }),
      prisma.quizQuestion.count()
    ]);

    res.json({ questions, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

router.post('/questions', async (req: Request, res: Response) => {
  try {
    const question = await prisma.quizQuestion.create({
      data: req.body
    });
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create question' });
  }
});

router.put('/questions/:id', async (req: Request, res: Response) => {
  try {
    const question = await prisma.quizQuestion.update({
      where: { id: req.params['id'] as string },
      data: req.body
    });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    await prisma.quizQuestion.delete({ where: { id: req.params['id'] as string } });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

router.get('/payments', async (req: Request, res: Response) => {
  try {
    const payments = await prisma.subscription.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.get('/materials', async (req: Request, res: Response) => {
  try {
    const materials = await prisma.learningMaterial.findMany();
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.post('/materials', async (req: Request, res: Response) => {
  try {
    const material = await prisma.learningMaterial.create({
      data: req.body
    });
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create material' });
  }
});

export default router;
