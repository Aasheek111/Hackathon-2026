import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { DisabilityType, Prisma } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.use(requireRole('STUDENT'));

/**
 * Returns the sensible pref defaults for a given disability type.
 * Used both for first-time seeding and when the user explicitly changes
 * their profile from Settings (the only time defaults are re-applied).
 */
function defaultsFor(disabilityType: DisabilityType | null): Prisma.AccessibilityPrefsCreateWithoutStudentInput {
  switch (disabilityType) {
    case 'BLINDNESS':
      return { alwaysNarrate: true, audiobookMode: true };
    case 'DEAFNESS':
      return { signLanguage: true };
    case 'ADHD':
      // Fewer moving distractions by default - the one setting with real
      // evidence behind it for attention regulation. Everything else stays
      // at the shared default so an ADHD learner isn't boxed in.
      return { reducedMotion: true };
    default:
      return {};
  }
}

/**
 * Returns a reset patch that undoes the profile-specific defaults that the
 * OLD disability type had set, so they don't bleed over into the new profile.
 * Only resets keys that the old profile set to a non-schema-default value.
 */
function resetOldDefaults(oldType: DisabilityType | null): Prisma.AccessibilityPrefsUpdateInput {
  switch (oldType) {
    case 'BLINDNESS':
      return { alwaysNarrate: false, audiobookMode: false };
    case 'DEAFNESS':
      return { signLanguage: false };
    case 'ADHD':
      return { reducedMotion: false };
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

const VALID_DISABILITY_TYPES: DisabilityType[] = ['NONE', 'AUTISM', 'ADHD', 'BLINDNESS', 'DEAFNESS'];

router.patch('/', async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    // Only ever touch fields the caller actually sent - partial updates must
    // never clobber the rest back to schema defaults (user-set beats
    // inferred, and a partial PATCH beats a full-row overwrite).
    const { fontSize, highContrast, alwaysNarrate, reducedMotion, signLanguage, audiobookMode, disabilityType } =
      req.body;
    const data: Prisma.AccessibilityPrefsUpdateInput = {};
    if (fontSize !== undefined) data.fontSize = fontSize;
    if (highContrast !== undefined) data.highContrast = highContrast;
    if (alwaysNarrate !== undefined) data.alwaysNarrate = alwaysNarrate;
    if (reducedMotion !== undefined) data.reducedMotion = reducedMotion;
    if (signLanguage !== undefined) data.signLanguage = signLanguage;
    if (audiobookMode !== undefined) data.audiobookMode = audiobookMode;

    await getOrCreatePrefs(studentId, req.user!.disabilityType);

    // Changing your disability profile is an explicit user action (from
    // Settings), not an inference - so unlike first-time seeding, it DOES
    // re-apply that profile's defaults. Switching to BLINDNESS should
    // actually turn narration on rather than silently leaving it off. Any
    // toggle sent in the same request still wins, since `data` is applied
    // after the re-seeded defaults.
    let nextDisabilityType = req.user!.disabilityType;
    if (disabilityType !== undefined) {
      if (disabilityType !== null && !VALID_DISABILITY_TYPES.includes(disabilityType)) {
        return res.status(400).json({ error: 'Unknown disability type' });
      }
      if (disabilityType !== req.user!.disabilityType) {
        await prisma.user.update({ where: { id: studentId }, data: { disabilityType } });
        nextDisabilityType = disabilityType;
        // Snapshot the explicitly-sent toggles first: `data` is about to be
        // mutated, so passing it as both target and last source of a single
        // Object.assign would be a no-op and let defaults win.
        const explicit = { ...data };
        // 1. Reset the old profile's pref overrides (e.g. signLanguage from DEAFNESS)
        // 2. Apply the new profile's defaults
        // 3. Let any explicitly-sent toggles win over both
        Object.assign(data, resetOldDefaults(req.user!.disabilityType), defaultsFor(disabilityType), explicit);
      }
    }

    const prefs = await prisma.accessibilityPrefs.update({ where: { studentId }, data });
    res.json({ ...prefs, disabilityType: nextDisabilityType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update accessibility preferences' });
  }
});

export default router;
