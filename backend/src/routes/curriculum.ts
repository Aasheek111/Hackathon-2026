import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function unitAccess(userId: string, unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { subject: { include: { classroom: true } } }
  });
  if (!unit) return { unit: null, allowed: false };

  const isOwner = unit.subject.classroom.teacherId === userId;
  if (isOwner) return { unit, allowed: true };

  const enrolled = await prisma.enrolment.findUnique({
    where: { classroomId_studentId: { classroomId: unit.subject.classroomId, studentId: userId } }
  });
  return { unit, allowed: !!enrolled };
}

/** Latest generation job for a unit - teacher or an enrolled student can poll this. */
router.get('/:id/generation-job', async (req: Request, res: Response) => {
  try {
    const { unit, allowed } = await unitAccess(req.user!.id, req.params['id'] as string);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not allowed to view this unit' });

    const job = await prisma.tutorialGenerationJob.findFirst({
      where: { unitId: unit.id },
      orderBy: { startedAt: 'desc' }
    });
    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch generation job' });
  }
});

/**
 * The canonical curriculum for a unit, plus this student's progress pointer
 * into it (created on first view - PLAN §23: one shared curriculum, a thin
 * per-student pointer, not a content copy per student).
 */
router.get('/:id/curriculum', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const unitId = req.params['id'] as string;
    const { unit, allowed } = await unitAccess(studentId, unitId);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });
    if (!allowed) return res.status(403).json({ error: 'Not enrolled in this classroom' });

    const curriculum = await prisma.tutorialCurriculum.findUnique({
      where: { unitId },
      include: {
        lessons: { include: { knowledgeCheck: true }, orderBy: { order: 'asc' } },
        finalAssessmentQuestions: { orderBy: { order: 'asc' } }
      }
    });
    if (!curriculum) {
      return res.status(404).json({ error: 'No curriculum generated for this unit yet' });
    }

    const progress = await prisma.tutorialProgress.upsert({
      where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } },
      create: { studentId, curriculumId: curriculum.id, currentLessonOrder: 0 },
      update: {}
    });

    res.json({ curriculum, progress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch curriculum' });
  }
});

/** Advance (or rewind) the student's position in the curriculum. */
router.patch('/:id/curriculum/progress', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { currentLessonOrder, completed } = req.body as { currentLessonOrder?: number; completed?: boolean };

    const curriculum = await prisma.tutorialCurriculum.findUnique({ where: { unitId: req.params['id'] as string } });
    if (!curriculum) return res.status(404).json({ error: 'No curriculum for this unit' });

    const progress = await prisma.tutorialProgress.upsert({
      where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } },
      create: {
        studentId,
        curriculumId: curriculum.id,
        currentLessonOrder: currentLessonOrder ?? 0,
        completed: !!completed,
        completedAt: completed ? new Date() : null
      },
      update: {
        ...(typeof currentLessonOrder === 'number' ? { currentLessonOrder } : {}),
        ...(typeof completed === 'boolean' ? { completed, completedAt: completed ? new Date() : null } : {})
      }
    });

    res.json({ progress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

export default router;
