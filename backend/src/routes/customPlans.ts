import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { generateCustomizedPlanForStudent } from '../lib/customPlanWorker';
import { awardXp } from '../lib/progress';

const router = Router();
router.use(requireAuth);

/** Get customized plan for a subject */
router.get('/subjects/:subjectId', async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { subjectId } = req.params;

    const plan = await prisma.customizedPlan.findUnique({
      where: { subjectId_studentId: { subjectId: subjectId as string, studentId } },
      include: {
        modules: { orderBy: { order: 'asc' } }
      }
    });

    res.json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customized plan' });
  }
});

/** Trigger background worker to generate or regenerate a customized plan for a subject */
router.post('/subjects/:subjectId/generate', async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { subjectId } = req.params;

    // Check enrolment
    const subject = await prisma.subject.findUnique({ where: { id: subjectId as string } });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const enrolment = await prisma.enrolment.findUnique({
      where: { classroomId_studentId: { classroomId: subject.classroomId, studentId } }
    });

    if (!enrolment) {
      return res.status(403).json({ error: 'Not enrolled in this classroom' });
    }

    // Trigger async generation
    generateCustomizedPlanForStudent(subjectId as string, studentId).catch((err) => {
      console.error('Background customized plan error:', err);
    });

    res.json({ message: 'Customized plan generation started', status: 'GENERATING' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request customized plan' });
  }
});

/** Mark a module complete and sync progress to underlying default split unit */
router.post('/:planId/modules/:moduleId/complete', async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { planId, moduleId } = req.params;

    const plan = await prisma.customizedPlan.findFirst({
      where: { id: planId as string, studentId }
    });

    if (!plan) return res.status(404).json({ error: 'Customized plan not found' });

    const moduleItem = await prisma.customizedPlanModule.findFirst({
      where: { id: moduleId as string, planId: plan.id }
    });

    if (!moduleItem) return res.status(404).json({ error: 'Module not found' });

    // Mark module complete
    const updatedModule = await prisma.customizedPlanModule.update({
      where: { id: moduleItem.id },
      data: {
        completed: true,
        completedAt: new Date()
      }
    });

    // Sync progress to underlying Unit's TutorialProgress if targetUnitId exists
    if (moduleItem.targetUnitId) {
      const curriculum = await prisma.tutorialCurriculum.findUnique({
        where: { unitId: moduleItem.targetUnitId }
      });

      if (curriculum) {
        const targetOrder = moduleItem.targetLessonOrder || 1;
        const existingProgress = await prisma.tutorialProgress.findUnique({
          where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } }
        });

        const newOrder = Math.max(existingProgress?.currentLessonOrder || 0, targetOrder);

        await prisma.tutorialProgress.upsert({
          where: { studentId_curriculumId: { studentId, curriculumId: curriculum.id } },
          create: {
            studentId,
            curriculumId: curriculum.id,
            currentLessonOrder: newOrder,
            completed: false
          },
          update: {
            currentLessonOrder: newOrder
          }
        });
      }
    }

    // Award XP
    const progress = await awardXp(studentId, 25, { tutorialCount: 1 });

    res.json({ module: updatedModule, progress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete module' });
  }
});

export default router;
