import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { DisabilityType, Prisma } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.use(requireRole('STUDENT'));

/**
 * disabilityType only ever seeds sensible DEFAULTS the first time a
 * student's AccessibilityPrefs row is created (see the model's own doc
 * comment) - never re-applied after, so a student who changes a setting
 * stays changed even if an admin edits their disabilityType later.
 */
function defaultsFor(disabilityType: DisabilityType | null): Prisma.AccessibilityPrefsCreateWithoutStudentInput {
  switch (disabilityType) {
    case 'BLINDNESS':
      return { alwaysNarrate: true, audiobookMode: true };
    case 'DEAFNESS':
      return { signLanguage: true };
    default:
      return {};
  }
}

async function getOrCreatePrefs(studentId: string, disabilityType: DisabilityType | null) {
  const existing = await prisma.accessibilityPrefs.findUnique({ where: { studentId } });
  if (existing) return existing;
  return prisma.accessibilityPrefs.create({
    data: { studentId, ...defaultsFor(disabilityType) }
  });
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const prefs = await getOrCreatePrefs(req.user!.id, req.user!.disabilityType);
    res.json({ ...prefs, disabilityType: req.user!.disabilityType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accessibility preferences' });
  }
});

router.patch('/', async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    // Only ever touch fields the caller actually sent - partial updates must
    // never clobber the rest back to schema defaults (user-set beats
    // inferred, and a partial PATCH beats a full-row overwrite).
    const { fontSize, highContrast, alwaysNarrate, reducedMotion, signLanguage, audiobookMode } = req.body;
    const data: Prisma.AccessibilityPrefsUpdateInput = {};
    if (fontSize !== undefined) data.fontSize = fontSize;
    if (highContrast !== undefined) data.highContrast = highContrast;
    if (alwaysNarrate !== undefined) data.alwaysNarrate = alwaysNarrate;
    if (reducedMotion !== undefined) data.reducedMotion = reducedMotion;
    if (signLanguage !== undefined) data.signLanguage = signLanguage;
    if (audiobookMode !== undefined) data.audiobookMode = audiobookMode;

    await getOrCreatePrefs(studentId, req.user!.disabilityType);
    const prefs = await prisma.accessibilityPrefs.update({ where: { studentId }, data });
    res.json({ ...prefs, disabilityType: req.user!.disabilityType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update accessibility preferences' });
  }
});

export default router;
