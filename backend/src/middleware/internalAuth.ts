import { Request, Response, NextFunction } from 'express';

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

/**
 * Gates service-to-service routes (the Celery worker writing job progress and
 * generated curricula back into the DB) with a shared secret header instead
 * of a user JWT - a background job has no logged-in user to authenticate as.
 */
export function requireInternalSecret(req: Request, res: Response, next: NextFunction) {
  if (!INTERNAL_API_SECRET) {
    return res.status(500).json({ error: 'INTERNAL_API_SECRET is not configured' });
  }
  if (req.headers['x-internal-secret'] !== INTERNAL_API_SECRET) {
    return res.status(401).json({ error: 'Invalid internal secret' });
  }
  next();
}
