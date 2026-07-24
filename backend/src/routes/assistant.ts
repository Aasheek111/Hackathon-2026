import { Router, Request, Response } from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const RAG_SERVICE_URL = process.env['RAG_SERVICE_URL'] || 'http://localhost:8100';

// A learner waiting on an answer shouldn't sit on a spinner forever, but the
// model needs room to respond - Groq's own call has a 60s timeout inside
// rag-service, so allow a little more than that here and let the service's
// own error surface rather than racing it.
const ASSIST_TIMEOUT_MS = 70000;
const MAX_QUESTION_CHARS = 2000;
const MAX_CONTEXT_CHARS = 8000;

/**
 * Learner-facing AI tutor - "explain this", "give me another example",
 * "make it easier". Backs the assistant on the blind and deaf dashboards.
 *
 * The learner's own accessibility profile is read from their session rather
 * than trusted from the request body, so a client can't ask for a different
 * profile's phrasing than the account actually has. It only shapes TONE
 * (see ASSISTANT_PROFILE_RULES in rag_engine.py) - never what may be asked.
 */
router.post('/ask', async (req: Request, res: Response) => {
  try {
    const { question, context } = req.body as { question?: string; context?: string };
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'A question is required' });
    }

    const response = await axios.post(
      `${RAG_SERVICE_URL}/ai-assist`,
      {
        question: question.trim().slice(0, MAX_QUESTION_CHARS),
        ...(context?.trim() ? { context: context.trim().slice(0, MAX_CONTEXT_CHARS) } : {}),
        profile: req.user!.disabilityType || 'NONE'
      },
      { timeout: ASSIST_TIMEOUT_MS }
    );

    res.json({ answer: response.data.answer });
  } catch (error: any) {
    const message =
      error.response?.data?.detail || "The assistant couldn't answer right now. Please try again.";
    res.status(502).json({ error: message });
  }
});

export default router;
