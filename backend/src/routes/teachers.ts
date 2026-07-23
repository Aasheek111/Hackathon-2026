import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAdmin);

// List teachers, optionally filtered by status: /api/admin/teachers?status=PENDING
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query['status'] as string | undefined;
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        ...(status ? { teacherStatus: status as any } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        teacherStatus: true,
        teacherNote: true,
        createdAt: true,
        classroomTaught: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ teachers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Admin directly creates an approved teacher account (Option A from the brief)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ error: 'name, email and an 8+ character password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const teacher = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TEACHER',
        teacherStatus: 'APPROVED'
      },
      select: { id: true, name: true, email: true, role: true, teacherStatus: true, createdAt: true }
    });

    res.status(201).json({ teacher });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const teacher = await prisma.user.update({
      where: { id: req.params['id'] as string, role: 'TEACHER' },
      data: { teacherStatus: 'APPROVED', teacherNote: null },
      select: { id: true, name: true, email: true, teacherStatus: true }
    });
    res.json({ teacher });
  } catch (error) {
    res.status(404).json({ error: 'Teacher not found' });
  }
});

router.patch('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { note } = req.body;
    const teacher = await prisma.user.update({
      where: { id: req.params['id'] as string, role: 'TEACHER' },
      data: { teacherStatus: 'REJECTED', teacherNote: note || null },
      select: { id: true, name: true, email: true, teacherStatus: true, teacherNote: true }
    });
    res.json({ teacher });
  } catch (error) {
    res.status(404).json({ error: 'Teacher not found' });
  }
});

router.patch('/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { note } = req.body;
    const teacher = await prisma.user.update({
      where: { id: req.params['id'] as string, role: 'TEACHER' },
      data: { teacherStatus: 'SUSPENDED', teacherNote: note || null },
      select: { id: true, name: true, email: true, teacherStatus: true, teacherNote: true }
    });
    res.json({ teacher });
  } catch (error) {
    res.status(404).json({ error: 'Teacher not found' });
  }
});

export default router;
