import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

const generateToken = (userId: string, expiresIn: string) => {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', options);
};

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, intendedRole } = req.body;

    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Invalid input data. Password must be at least 8 characters.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Self-registration only ever produces STUDENT or TEACHER accounts - ADMIN
    // is never selectable here (PLAN.md Part 4.3). A self-registered teacher
    // starts PENDING and cannot use teacher-only routes until an admin
    // approves them (see requireApprovedTeacher).
    const isTeacher = intendedRole === 'TEACHER';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: isTeacher ? 'TEACHER' : 'STUDENT',
        teacherStatus: isTeacher ? 'PENDING' : null
      },
    });

    const token = generateToken(user.id, '7d');
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const expiresIn = rememberMe ? '30d' : '7d';
    const token = generateToken(user.id, expiresIn);

    await prisma.user.update({
      where: { id: user.id },
      data: { rememberMe: !!rememberMe }
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const resetTokenExp = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: resetTokenHash, resetTokenExp }
      });

      console.log(`[Dev] Password reset token for ${email}: ${resetToken}`);
    }

    res.json({ message: 'Reset link sent if email exists' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, email, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetToken || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const isValidToken = await bcrypt.compare(token, user.resetToken);
    if (!isValidToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null
      }
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  res.json(req.user);
});

export default router;
