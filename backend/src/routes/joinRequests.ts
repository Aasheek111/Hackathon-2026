import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireApprovedTeacher, requireRole } from '../middleware/auth';
import { scoreClassroomMatch, profileFromAttempt } from '../lib/classroomMatch';
import { awardXp } from '../lib/progress';

const router = Router();

router.use(requireAuth);

/** Student requests to join a classroom (PLAN.md 5.5). */
router.post('/:id/requests', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const classroomId = req.params['id'] as string;
    const studentId = req.user!.id;

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: { admissionCriteria: true }
    });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const alreadyEnrolled = await prisma.enrolment.findUnique({
      where: { classroomId_studentId: { classroomId, studentId } }
    });
    if (alreadyEnrolled) return res.status(400).json({ error: 'Already enrolled in this classroom' });

    const latestAttempt = await prisma.assessmentAttempt.findFirst({
      where: { userId: studentId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' }
    });
    if (!latestAttempt) {
      return res.status(400).json({ error: 'Complete the assessment before requesting to join a classroom' });
    }

    const match = scoreClassroomMatch(profileFromAttempt(latestAttempt), classroom.admissionCriteria || {});

    const request = await prisma.classroomJoinRequest.upsert({
      where: { classroomId_studentId: { classroomId, studentId } },
      create: {
        classroomId,
        studentId,
        matchScore: match.score,
        matchReasons: match.reasons as unknown as object,
        status: 'PENDING'
      },
      update: {
        matchScore: match.score,
        matchReasons: match.reasons as unknown as object,
        status: 'PENDING',
        teacherNote: null,
        decidedAt: null
      }
    });

    res.status(201).json({ request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create join request' });
  }
});

/** Student's own request history/status. */
router.get('/mine/requests', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const requests = await prisma.classroomJoinRequest.findMany({
      where: { studentId: req.user!.id },
      include: { classroom: { select: { id: true, name: true, description: true } } },
      orderBy: { requestedAt: 'desc' }
    });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
});

/** Teacher lists join requests for their classroom. */
router.get('/:id/requests', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const classroom = await prisma.classroom.findUnique({ where: { id: req.params['id'] as string } });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    if (classroom.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    const status = req.query['status'] as string | undefined;
    const requests = await prisma.classroomJoinRequest.findMany({
      where: { classroomId: classroom.id, ...(status ? { status: status as any } : {}) },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { requestedAt: 'desc' }
    });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch join requests' });
  }
});

router.patch('/requests/:requestId/approve', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const request = await prisma.classroomJoinRequest.findUnique({
      where: { id: req.params['requestId'] as string },
      include: { classroom: true }
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.classroom.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    const [updatedRequest] = await prisma.$transaction([
      prisma.classroomJoinRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED', decidedAt: new Date() }
      }),
      prisma.enrolment.upsert({
        where: { classroomId_studentId: { classroomId: request.classroomId, studentId: request.studentId } },
        create: { classroomId: request.classroomId, studentId: request.studentId },
        update: {}
      })
    ]);

    res.json({ request: updatedRequest });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

router.patch('/requests/:requestId/reject', requireApprovedTeacher, async (req: Request, res: Response) => {
  try {
    const { note } = req.body;
    const request = await prisma.classroomJoinRequest.findUnique({
      where: { id: req.params['requestId'] as string },
      include: { classroom: true }
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.classroom.teacherId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not own this classroom' });
    }

    const updated = await prisma.classroomJoinRequest.update({
      where: { id: request.id },
      data: { status: 'REJECTED', teacherNote: note || null, decidedAt: new Date() }
    });
    res.json({ request: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

/** The student's currently-enrolled classroom, if any. */
router.get('/mine/enrolment', requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const enrolment = await prisma.enrolment.findFirst({
      where: { studentId: req.user!.id },
      include: {
        classroom: {
          include: {
            subjects: {
              include: {
                units: {
                  include: { youtubeQuizzes: { where: { status: 'READY' }, select: { id: true } } }
                }
              }
            },
            teacher: { select: { name: true } }
          }
        }
      }
    });
    res.json({ enrolment });
    if (enrolment) {
      await awardXp(req.user!.id, 0); // touch streak/last-active without granting extra xp
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrolment' });
  }
});

export default router;
