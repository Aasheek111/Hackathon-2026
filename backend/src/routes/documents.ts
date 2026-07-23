import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import prisma from '../lib/prisma';
import { requireAuth, requireApprovedTeacher } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const RAG_SERVICE_URL = process.env['RAG_SERVICE_URL'] || 'http://localhost:8100';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'syllabus');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB cap before it ever reaches rag-service
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf'];
    // rag-service is PDF-only today (PLAN.md 15) - reject early with a clear
    // message rather than letting a docx/txt fail deep inside the pipeline
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(new Error('Only PDF files are supported right now'));
      return;
    }
    cb(null, true);
  }
});

async function ownsUnit(userId: string, unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { subject: { include: { classroom: true } } }
  });
  return unit && unit.subject.classroom.teacherId === userId ? unit : null;
}

async function assignRagUnitId(unitId: string): Promise<number> {
  const existing = await prisma.unit.findUnique({ where: { id: unitId } });
  if (existing?.ragUnitId) return existing.ragUnitId;

  const max = await prisma.unit.aggregate({ _max: { ragUnitId: true } });
  const nextId = (max._max.ragUnitId || 0) + 1;
  await prisma.unit.update({ where: { id: unitId }, data: { ragUnitId: nextId } });
  return nextId;
}

router.post(
  '/:id/documents',
  requireApprovedTeacher,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req: Request, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    try {
      const unit = await ownsUnit(req.user!.id, req.params['id'] as string);
      if (!unit) {
        if (file) fs.unlink(file.path, () => {});
        return res.status(404).json({ error: 'Unit not found or not yours' });
      }
      if (!file) return res.status(400).json({ error: 'No file uploaded' });

      const document = await prisma.syllabusDocument.create({
        data: {
          unitId: unit.id,
          uploadedById: req.user!.id,
          filename: file.originalname,
          fileType: 'pdf',
          storagePath: file.path,
          status: 'PROCESSING'
        }
      });

      const ragUnitId = await assignRagUnitId(unit.id);
      await prisma.unit.update({ where: { id: unit.id }, data: { indexStatus: 'PROCESSING' } });

      try {
        const form = new FormData();
        form.append('unit_id', String(ragUnitId));
        form.append('file', fs.createReadStream(file.path), file.originalname);

        const ragResponse = await axios.post(`${RAG_SERVICE_URL}/upload-pdf`, form, {
          headers: form.getHeaders(),
          timeout: 120000
        });

        const updated = await prisma.syllabusDocument.update({
          where: { id: document.id },
          data: {
            status: 'READY',
            chunkCount: ragResponse.data?.chunks ?? null
          }
        });
        await prisma.unit.update({ where: { id: unit.id }, data: { indexStatus: 'READY' } });

        res.status(201).json({ document: updated });
      } catch (ragError: any) {
        const message =
          ragError.response?.data?.detail || ragError.message || 'rag-service is unreachable';
        await prisma.syllabusDocument.update({
          where: { id: document.id },
          data: { status: 'FAILED', errorMessage: String(message) }
        });
        await prisma.unit.update({ where: { id: unit.id }, data: { indexStatus: 'FAILED' } });
        res.status(502).json({ error: `Document processing failed: ${message}` });
      }
    } catch (error) {
      if (file) fs.unlink(file.path, () => {});
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

router.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id: req.params['id'] as string },
      include: { subject: { include: { classroom: true } } }
    });
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const isOwner = unit.subject.classroom.teacherId === req.user!.id;
    if (!isOwner) {
      const enrolled = await prisma.enrolment.findUnique({
        where: {
          classroomId_studentId: { classroomId: unit.subject.classroomId, studentId: req.user!.id }
        }
      });
      if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this classroom' });
    }

    const documents = await prisma.syllabusDocument.findMany({ where: { unitId: unit.id } });
    res.json({ documents, indexStatus: unit.indexStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
