import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);
router.use(requireRole('TEACHER'));

router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { teacherId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const unreadCount = await prisma.notification.count({ where: { teacherId: req.user!.id, read: false } });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params['id'] as string, teacherId: req.user!.id }
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true }
    });
    res.json({ notification: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
