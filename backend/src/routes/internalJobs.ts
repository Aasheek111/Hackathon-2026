import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireInternalSecret } from '../middleware/internalAuth';
import { JobStage } from '@prisma/client';

const router = Router();
router.use(requireInternalSecret);

const VALID_STAGES: JobStage[] = [
  'QUEUED', 'EXTRACTING', 'PLANNING', 'GENERATING_TEXT', 'GENERATING_VISUALS',
  'GENERATING_AUDIO', 'GENERATING_QUESTIONS', 'FINALIZING', 'COMPLETED', 'FAILED'
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

export default router;
