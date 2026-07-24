import prisma from './prisma';

/**
 * The single global-settings row, created on first read. Keeps callers from
 * having to handle "no config yet" - there is always exactly one.
 */
export async function getAppConfig() {
  return prisma.appConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {}
  });
}

/** The admin-configured target grade/education level (e.g. "Nursery", "Grade 3"). */
export async function getGradeLevel(): Promise<string> {
  const config = await getAppConfig();
  return config.gradeLevel;
}
