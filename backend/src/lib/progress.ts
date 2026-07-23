import prisma from './prisma';

/**
 * XP/streak/badge side effects (PLAN.md Part 9.2), awarded as a side effect of
 * an event that already has to run (assessment completion, tutorial-quiz
 * completion) rather than tracked separately.
 */

const BADGE_DEFS: Record<string, { name: string; test: (ctx: BadgeContext) => boolean }> = {
  first_assessment: {
    name: 'First Steps',
    test: (ctx) => ctx.attemptCount === 1
  },
  first_tutorial: {
    name: 'Curious Learner',
    test: (ctx) => ctx.tutorialCount === 1
  },
  streak_3: {
    name: '3-Day Streak',
    test: (ctx) => ctx.streakDays >= 3
  },
  level_up: {
    name: 'Leveling Up',
    test: (ctx) => ctx.xp >= 100
  }
};

interface BadgeContext {
  attemptCount: number;
  tutorialCount: number;
  streakDays: number;
  xp: number;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function isYesterday(a: Date, b: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  const diff = Math.round(
    (new Date(b.toDateString()).getTime() - new Date(a.toDateString()).getTime()) / oneDay
  );
  return diff === 1;
}

export async function awardXp(
  userId: string,
  amount: number,
  opts: { attemptCount?: number; tutorialCount?: number } = {}
) {
  const now = new Date();
  const existing = await prisma.studentProgress.findUnique({ where: { studentId: userId } });

  let streakDays = 1;
  if (existing?.lastActiveDate) {
    if (isSameDay(existing.lastActiveDate, now)) {
      streakDays = existing.streakDays || 1;
    } else if (isYesterday(existing.lastActiveDate, now)) {
      streakDays = (existing.streakDays || 0) + 1;
    } else {
      streakDays = 1;
    }
  }

  const newXp = (existing?.xp || 0) + amount;
  // Prisma auto-(de)serializes Json columns on SQLite - existing.badges already
  // comes back as a real array, not a string (same pattern quiz.ts relies on
  // for engagementLog). Defend against a missing/malformed value only.
  const existingBadges: Array<{ id: string; name: string; earnedAt: string }> = Array.isArray(
    existing?.badges
  )
    ? (existing!.badges as any)
    : [];

  const ctx: BadgeContext = {
    attemptCount: opts.attemptCount ?? 0,
    tutorialCount: opts.tutorialCount ?? 0,
    streakDays,
    xp: newXp
  };

  const earnedIds = new Set(existingBadges.map((b) => b.id));
  const newlyEarned: typeof existingBadges = [];
  for (const [id, def] of Object.entries(BADGE_DEFS)) {
    if (!earnedIds.has(id) && def.test(ctx)) {
      newlyEarned.push({ id, name: def.name, earnedAt: now.toISOString() });
    }
  }

  const allBadges = [...existingBadges, ...newlyEarned];

  const progress = await prisma.studentProgress.upsert({
    where: { studentId: userId },
    create: {
      studentId: userId,
      xp: newXp,
      streakDays,
      lastActiveDate: now,
      badges: allBadges
    },
    update: {
      xp: newXp,
      streakDays,
      lastActiveDate: now,
      badges: allBadges
    }
  });

  return { progress, newlyEarned };
}
