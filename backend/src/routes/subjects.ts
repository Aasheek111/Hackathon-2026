import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireApprovedTeacher, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

async function ownsClassroom(userId: string, classroomId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  return classroom && classroom.teacherId === userId ? classroom : null;
}

async function ownsSubject(userId: string, subjectId: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, include: { classroom: true } });
  return subject && subject.classroom.teacherId === userId ? subject : null;
}

router.post('/classrooms/:id/subjects', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const classroom = await ownsClassroom(req.user!.id, req.params['id'] as string);
    if (!classroom) return res.status(404).json({ error: 'Classroom not found or not yours' });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name is required' });

    const subject = await prisma.subject.create({ data: { classroomId: classroom.id, name } });
    res.status(201).json({ subject });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

/** Teacher sees full detail; an enrolled student sees the same tree (read-only). */
router.get('/classrooms/:id/subjects', async (req: Request, res: Response) => {
  try {
    const classroomId = req.params['id'] as string;
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const isOwner = classroom.teacherId === req.user!.id;
    if (!isOwner) {
      const enrolled = await prisma.enrolment.findUnique({
        where: { classroomId_studentId: { classroomId, studentId: req.user!.id } }
      });
      if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this classroom' });
    }

    const subjects = await prisma.subject.findMany({
      where: { classroomId },
      include: { units: { orderBy: { order: 'asc' }, include: { _count: { select: { documents: true } } } } }
    });
    res.json({ subjects });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

router.post('/subjects/:id/units', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const subject = await ownsSubject(req.user!.id, req.params['id'] as string);
    if (!subject) return res.status(404).json({ error: 'Subject not found or not yours' });

    const { title, order } = req.body;
    if (!title) return res.status(400).json({ error: 'Unit title is required' });

    const unit = await prisma.unit.create({
      data: { subjectId: subject.id, title, order: order ?? 0 }
    });
    res.status(201).json({ unit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

export default router;
