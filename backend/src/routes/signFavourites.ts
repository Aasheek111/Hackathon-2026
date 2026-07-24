import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole('STUDENT'));

const MAX_SIGN_ID_LENGTH = 64; // generous - the longest real id ("letter-Z") is 8 chars

/**
 * A student's starred signs in the sign-language dictionary, synced to their
 * account (was localStorage-only - see SignFavourite's schema doc comment).
 * signId is whatever frontend/src/data/signLanguage.ts assigns (e.g.
 * "letter-A", "w-hello"); this route does not validate it against a
 * catalogue since the catalogue lives in frontend static data, not here.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const favourites = await prisma.signFavourite.findMany({
      where: { studentId: req.user!.id },
      select: { signId: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ signIds: favourites.map((f) => f.signId) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sign favourites' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const signId = String(req.body?.signId || '').trim();
    if (!signId || signId.length > MAX_SIGN_ID_LENGTH) {
      return res.status(400).json({ error: 'A valid signId is required' });
    }
    // Idempotent star - the frontend calls this from a toggle button that
    // doesn't track prior state authoritatively, so a duplicate tap must not 500.
    await prisma.signFavourite.upsert({
      where: { studentId_signId: { studentId: req.user!.id, signId } },
      create: { studentId: req.user!.id, signId },
      update: {}
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save favourite' });
  }
});

router.delete('/:signId', async (req: Request, res: Response) => {
  try {
    // deleteMany (not delete) so un-starring something already gone is a
    // no-op 200, not a 404 the UI would have to special-case.
    await prisma.signFavourite.deleteMany({
      where: { studentId: req.user!.id, signId: req.params['signId'] as string }
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove favourite' });
  }
});

export default router;
