import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireApprovedTeacher } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

/** The teacher's own classroom (create-once, per PLAN.md 5.1: one teacher -> one classroom). */
router.get('/mine', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { teacherId: req.user!.id },
      include: {
        admissionCriteria: true,
        subjects: { include: { units: { include: { _count: { select: { documents: true } } } } } },
        enrolments: { include: { student: { select: { id: true, name: true, email: true } } } },
        joinRequests: {
          where: { status: 'PENDING' },
          include: { student: { select: { id: true, name: true, email: true } } },
          orderBy: { requestedAt: 'desc' }
        }
      }
    });
    res.json({ classroom });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classroom' });
  }
});

router.post('/', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Classroom name is required' });

    const existing = await prisma.classroom.findUnique({ where: { teacherId: req.user!.id } });
    if (existing) {
      return res.status(400).json({ error: 'You already have a classroom', classroom: existing });
    }

    const classroom = await prisma.classroom.create({
      data: { name, description: description || null, teacherId: req.user!.id }
    });
    res.status(201).json({ classroom });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create classroom' });
  }
});

router.patch('/:id', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const classroom = await prisma.classroom.findUnique({ where: { id: req.params['id'] as string } });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    if (classroom.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    const { name, description } = req.body;
    const updated = await prisma.classroom.update({
      where: { id: classroom.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {})
      }
    });
    res.json({ classroom: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update classroom' });
  }
});

/** Admission criteria - defines what kind of learner this classroom is tuned for (PLAN.md 5.2). */
router.put('/:id/criteria', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const classroom = await prisma.classroom.findUnique({ where: { id: req.params['id'] as string } });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    if (classroom.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    const {
      minTextEngagement, maxTextEngagement,
      minAudioEngagement, maxAudioEngagement,
      minVisualEngagement, maxVisualEngagement,
      preferredModes,
      minAttentionSpanScore, maxAttentionSpanScore,
      minScorePercent, maxScorePercent,
      arRecommendedOnly
    } = req.body;

    const data = {
      minTextEngagement: minTextEngagement ?? null,
      maxTextEngagement: maxTextEngagement ?? null,
      minAudioEngagement: minAudioEngagement ?? null,
      maxAudioEngagement: maxAudioEngagement ?? null,
      minVisualEngagement: minVisualEngagement ?? null,
      maxVisualEngagement: maxVisualEngagement ?? null,
      preferredModes: preferredModes ?? undefined,
      minAttentionSpanScore: minAttentionSpanScore ?? null,
      maxAttentionSpanScore: maxAttentionSpanScore ?? null,
      minScorePercent: minScorePercent ?? null,
      maxScorePercent: maxScorePercent ?? null,
      arRecommendedOnly: arRecommendedOnly ?? null
    };

    const criteria = await prisma.admissionCriteria.upsert({
      where: { classroomId: classroom.id },
      create: { classroomId: classroom.id, ...data },
      update: data
    });
    res.json({ criteria });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update admission criteria' });
  }
});

/** Public-ish listing so a student's recommendation/browse view can see what exists. */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      include: {
        admissionCriteria: true,
        teacher: { select: { name: true } },
        _count: { select: { enrolments: true } }
      }
    });
    res.json({ classrooms });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list classrooms' });
  }
});

export default router;
