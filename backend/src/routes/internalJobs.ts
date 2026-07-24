import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireInternalSecret } from '../middleware/internalAuth';
import { JobStage, YoutubeQuizStatus, StorybookStatus } from '@prisma/client';

const router = Router();
router.use(requireInternalSecret);

const VALID_STAGES: JobStage[] = [
  'QUEUED', 'EXTRACTING', 'PLANNING', 'GENERATING_TEXT', 'GENERATING_VISUALS',
  'GENERATING_AUDIO', 'GENERATING_QUESTIONS', 'FINALIZING', 'COMPLETED', 'FAILED'
];

const VALID_YOUTUBE_QUIZ_STATUSES: YoutubeQuizStatus[] = [
  'QUEUED', 'FETCHING_TRANSCRIPT', 'GENERATING_QUESTIONS', 'READY', 'FAILED'
];

const VALID_STORYBOOK_STATUSES: StorybookStatus[] = [
  'QUEUED', 'GENERATING_STORY', 'GENERATING_IMAGES', 'READY', 'FAILED'
];

/** Celery calls this after every stage transition - real progress, not simulated. */
router.patch('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { stage, progressPercent, errorMessage } = req.body;
    if (stage && !VALID_STAGES.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage: ${stage}` });
    }

    const job = await prisma.tutorialGenerationJob.update({
      where: { id: req.params['jobId'] as string },
      data: {
        ...(stage ? { stage } : {}),
        ...(typeof progressPercent === 'number' ? { progressPercent } : {}),
        ...(errorMessage ? { errorMessage } : {}),
        ...(stage === 'FAILED' || stage === 'COMPLETED' ? { completedAt: new Date() } : {})
      }
    });

    if (stage === 'FAILED') {
      await prisma.notification.create({
        data: {
          teacherId: job.teacherId,
          type: 'GENERATION_FAILED',
          title: 'Tutorial generation failed',
          body: errorMessage || 'Generation failed for an unknown reason.',
          unitId: job.unitId,
          jobId: job.id
        }
      });
    }

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

interface LessonPayload {
  order: number;
  title: string;
  explanation: string;
  example?: string | null;
  imageUrl?: string | null;
  imageQuery?: string | null;
  audioUrl?: string | null;
  sourceChunkStart?: number | null;
  sourceChunkEnd?: number | null;
  knowledgeCheck?: { question: string; options: string[]; correct: string } | null;
}

/**
 * Celery's final step: persist the whole generated curriculum in one shot and
 * mark the job complete. Replaces any previous curriculum for this unit
 * (cascades to its lessons/questions/progress) so re-uploading a document is
 * idempotent rather than accumulating duplicate curricula.
 */
router.post('/jobs/:jobId/curriculum', async (req: Request, res: Response) => {
  try {
    const job = await prisma.tutorialGenerationJob.findUnique({ where: { id: req.params['jobId'] as string } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const { title, sourceChunks, lessons, finalAssessmentQuestions } = req.body as {
      title: string;
      sourceChunks: number;
      lessons: LessonPayload[];
      finalAssessmentQuestions: Array<{ order: number; question: string; options: string[]; correct: string }>;
    };

    if (!Array.isArray(lessons) || lessons.length === 0) {
      return res.status(400).json({ error: 'A curriculum needs at least one lesson' });
    }

    const curriculum = await prisma.$transaction(async (tx) => {
      await tx.tutorialCurriculum.deleteMany({ where: { unitId: job.unitId } });

      return tx.tutorialCurriculum.create({
        data: {
          unitId: job.unitId,
          title: title || 'Curriculum',
          sourceChunks: sourceChunks || 0,
          lessons: {
            create: lessons.map((lesson) => ({
              order: lesson.order,
              title: lesson.title,
              explanation: lesson.explanation,
              example: lesson.example || null,
              imageUrl: lesson.imageUrl || null,
              imageQuery: lesson.imageQuery || null,
              audioUrl: lesson.audioUrl || null,
              sourceChunkStart: lesson.sourceChunkStart ?? null,
              sourceChunkEnd: lesson.sourceChunkEnd ?? null,
              ...(lesson.knowledgeCheck
                ? {
                    knowledgeCheck: {
                      create: {
                        question: lesson.knowledgeCheck.question,
                        options: lesson.knowledgeCheck.options,
                        correct: lesson.knowledgeCheck.correct
                      }
                    }
                  }
                : {})
            }))
          },
          finalAssessmentQuestions: {
            create: (finalAssessmentQuestions || []).map((q) => ({
              order: q.order,
              question: q.question,
              options: q.options,
              correct: q.correct
            }))
          }
        },
        include: { lessons: { include: { knowledgeCheck: true } }, finalAssessmentQuestions: true }
      });
    });

    await prisma.tutorialGenerationJob.update({
      where: { id: job.id },
      data: { stage: 'COMPLETED', progressPercent: 100, completedAt: new Date() }
    });

    await prisma.notification.create({
      data: {
        teacherId: job.teacherId,
        type: 'GENERATION_COMPLETE',
        title: 'Tutorial ready',
        body: `The full curriculum is ready: ${curriculum.lessons.length} lesson${curriculum.lessons.length === 1 ? '' : 's'}.`,
        unitId: job.unitId,
        jobId: job.id
      }
    });

    res.status(201).json({ curriculum });
  } catch (error) {
    res.status(500).json({ error: 'Failed to persist curriculum' });
  }
});

/** Celery calls this after fetching the transcript / while generating questions. */
router.patch('/youtube-quiz/:quizId', async (req: Request, res: Response) => {
  try {
    const { status, errorMessage } = req.body;
    if (status && !VALID_YOUTUBE_QUIZ_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const quiz = await prisma.youtubeQuiz.update({
      where: { id: req.params['quizId'] as string },
      data: {
        ...(status ? { status } : {}),
        ...(errorMessage ? { errorMessage } : {})
      }
    });

    if (status === 'FAILED') {
      await prisma.notification.create({
        data: {
          teacherId: quiz.teacherId,
          type: 'GENERATION_FAILED',
          title: 'YouTube quiz generation failed',
          body: errorMessage || 'Generation failed for an unknown reason.'
        }
      });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

/** Celery's final step: persist the generated questions and mark the quiz ready. */
router.post('/youtube-quiz/:quizId/questions', async (req: Request, res: Response) => {
  try {
    const quiz = await prisma.youtubeQuiz.findUnique({ where: { id: req.params['quizId'] as string } });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const { title, questions } = req.body as {
      title?: string;
      questions: Array<{ question: string; options: string[]; correct: string }>;
    };

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.youtubeQuizQuestion.deleteMany({ where: { quizId: quiz.id } });
      await tx.youtubeQuiz.update({
        where: { id: quiz.id },
        data: {
          title: title || quiz.title,
          status: 'READY',
          errorMessage: null,
          questions: {
            create: questions.map((q, i) => ({ order: i, question: q.question, options: q.options, correct: q.correct }))
          }
        }
      });
    });

    await prisma.notification.create({
      data: {
        teacherId: quiz.teacherId,
        type: 'GENERATION_COMPLETE',
        title: 'YouTube quiz ready',
        body: `Generated ${questions.length} question${questions.length === 1 ? '' : 's'} from your video.`
      }
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to persist quiz questions' });
  }
});

/** Celery calls this after every storybook generation stage transition. */
router.patch('/storybook/:storybookId', async (req: Request, res: Response) => {
  try {
    const { status, errorMessage } = req.body;
    if (status && !VALID_STORYBOOK_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    await prisma.tutorialStorybook.update({
      where: { id: req.params['storybookId'] as string },
      data: {
        ...(status ? { status } : {}),
        ...(errorMessage ? { errorMessage } : {})
      }
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update storybook' });
  }
});

interface StorybookPagePayload {
  pageNumber: number;
  storyText: string;
  imageUrl?: string | null;
  imageQuery?: string | null;
}

/**
 * Celery's final step: persist all 5 pages and mark the storybook ready.
 * Replaces any previous pages for this storybook (a re-triggered generation
 * after FAILED is idempotent rather than accumulating duplicates).
 */
router.post('/storybook/:storybookId/pages', async (req: Request, res: Response) => {
  try {
    const storybook = await prisma.tutorialStorybook.findUnique({ where: { id: req.params['storybookId'] as string } });
    if (!storybook) return res.status(404).json({ error: 'Storybook not found' });

    const { title, pages } = req.body as { title?: string; pages: StorybookPagePayload[] };
    if (!Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: 'A storybook needs at least one page' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.storybookPage.deleteMany({ where: { storybookId: storybook.id } });
      await tx.tutorialStorybook.update({
        where: { id: storybook.id },
        data: {
          title: title || storybook.title,
          status: 'READY',
          errorMessage: null,
          pages: {
            create: pages.map((p) => ({
              pageNumber: p.pageNumber,
              storyText: p.storyText,
              imageUrl: p.imageUrl || null,
              imageQuery: p.imageQuery || null
            }))
          }
        }
      });
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to persist storybook pages' });
  }
});

export default router;
