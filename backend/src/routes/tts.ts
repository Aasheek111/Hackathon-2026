import { Router, Request, Response } from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const RAG_SERVICE_URL = process.env['RAG_SERVICE_URL'] || 'http://localhost:8100';

/**
 * Generic Gemini text-to-speech for any logged-in user - used both for "listen
 * to this lesson" (full explanation text) and "listen to selected text" (an
 * arbitrary highlighted snippet). rag-service content-hash caches identical
 * text+voice pairs, so repeat requests for the same lesson are instant.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, voice } = req.body as { text?: string; voice?: string };
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text is required' });

    const response = await axios.post(
      `${RAG_SERVICE_URL}/generate-speech`,
      { text: text.trim(), ...(voice ? { voice } : {}) },
      { timeout: 30000 }
    );

    res.json({ audioUrl: response.data.audio_url });
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Could not generate speech right now';
    res.status(502).json({ error: message });
  }
});

export default router;
