import { Router, Request, Response } from 'express';
import axios from 'axios';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);
router.use(requireRole('TEACHER'));

const RAG_SERVICE_URL = process.env['RAG_SERVICE_URL'] || 'http://localhost:8100';

/**
 * Kicks off transcript retrieval + quiz generation in the background - both
 * are external API calls (SerpApi, then Gemini), too slow to hold the
 * request open for.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ error: 'A YouTube URL is required' });

    let videoId: string;
    try {
      const extracted = await axios.post(`${RAG_SERVICE_URL}/extract-youtube-id`, { url }, { timeout: 10000 });
      videoId = extracted.data.video_id;
    } catch (err: any) {
      const message = err.response?.data?.detail || "That doesn't look like a valid YouTube URL";
      return res.status(400).json({ error: message });
    }

    const quiz = await prisma.youtubeQuiz.create({
      data: { teacherId: req.user!.id, sourceUrl: url, videoId, status: 'QUEUED' }
    });

    try {
      await axios.post(
        `${RAG_SERVICE_URL}/generate-youtube-quiz`,
        { quiz_id: quiz.id, video_id: videoId },
        { timeout: 15000 }
      );
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Could not queue quiz generation';
      await prisma.youtubeQuiz.update({ where: { id: quiz.id }, data: { status: 'FAILED', errorMessage: String(message) } });
      return res.status(502).json({ error: message });
    }

    res.status(201).json({ quiz });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start quiz generation' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const quizzes = await prisma.youtubeQuiz.findMany({
      where: { teacherId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { questions: { orderBy: { order: 'asc' } } }
    });
    res.json({ quizzes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const quiz = await prisma.youtubeQuiz.findFirst({
      where: { id: req.params['id'] as string, teacherId: req.user!.id },
      include: { questions: { orderBy: { order: 'asc' } } }
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

/**
 * Forward a ready quiz to one of the teacher's own units, so enrolled
 * students can take it (GET/POST /units/:id/youtube-quiz). Pass unitId: null
 * to unassign. Verifies the unit actually belongs to this teacher's
 * classroom - a quiz can't be pointed at someone else's unit.
 */
router.patch('/:id/assign', async (req: Request, res: Response) => {
  try {
    const quiz = await prisma.youtubeQuiz.findFirst({
      where: { id: req.params['id'] as string, teacherId: req.user!.id }
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.status !== 'READY') {
      return res.status(400).json({ error: 'Only a ready quiz can be assigned to a unit' });
    }

    const unitId = req.body?.unitId as string | null;
    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        include: { subject: { include: { classroom: true } } }
      });
      if (!unit || unit.subject.classroom.teacherId !== req.user!.id) {
        return res.status(404).json({ error: 'Unit not found or not yours' });
      }
    }

    const updated = await prisma.youtubeQuiz.update({
      where: { id: quiz.id },
      data: { unitId: unitId || null }
    });
    res.json({ quiz: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign quiz' });
  }
});

export default router;
