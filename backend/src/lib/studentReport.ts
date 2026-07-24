import prisma from './prisma';
import { computeMark, letterGrade } from './marking';

/**
 * Builds a student's report card: a consolidated MARK per unit and per
 * subject (see lib/marking) rolled up from exam scores, lesson-check
 * accuracy, concentration and completion - plus a learning-pattern read
 * (which mode they engage/focus best in, attention level) and, from that,
 * which subjects to focus on next. All local aggregation, no AI.
 *
 * Extracted from progress.ts's GET /report so the teacher-facing per-student
 * view renders the exact same numbers a student sees for themselves. A
 * teacher spotting a different mark than the learner is looking at would be
 * worse than having no teacher view at all.
 *
 * Takes studentId explicitly - it does NO authorization of its own. Callers
 * are responsible for proving they may see this student (progress.ts passes
 * the caller's own id; the teacher route checks classroom ownership first).
 */
export async function buildStudentReport(studentId: string) {
  const enrolment = await prisma.enrolment.findFirst({
    where: { studentId },
    include: {
      classroom: {
        include: {
          subjects: {
            include: {
              units: {
                include: {
                  curriculum: {
                    include: {
                      lessons: { select: { id: true, title: true, order: true } },
                      finalAssessmentQuestions: { select: { id: true } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!enrolment) {
    return { enrolled: false as const, subjects: [], overall: null, pattern: null, recommendations: [] };
  }

  const subjectsRaw = enrolment.classroom.subjects;
  const unitIds = subjectsRaw.flatMap((s) => s.units.map((u) => u.id));
  const curriculumIds = subjectsRaw
    .flatMap((s) => s.units.map((u) => u.curriculum?.id))
    .filter((x): x is string => !!x);

  const [finals, kcAttempts, progresses, samples, latestAttempt] = await Promise.all([
    prisma.finalAssessmentAttempt.findMany({
      where: { studentId, curriculumId: { in: curriculumIds } },
      orderBy: { completedAt: 'desc' }
    }),
    prisma.knowledgeCheckAttempt.findMany({
      where: { studentId, question: { lesson: { curriculumId: { in: curriculumIds } } } },
      include: { question: { select: { lesson: { select: { curriculumId: true } } } } }
    }),
    prisma.tutorialProgress.findMany({ where: { studentId, curriculumId: { in: curriculumIds } } }),
    prisma.unitEngagementSample.findMany({ where: { studentId, unitId: { in: unitIds } } }),
    prisma.assessmentAttempt.findFirst({
      where: { userId: studentId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' }
    })
  ]);

  // Knowledge-check accuracy per curriculum: each attempt carries its
  // question -> lesson -> curriculumId via the include above.
  const kcByCurriculum = new Map<string, { correct: number; total: number }>();
  for (const a of kcAttempts) {
    const cid = a.question?.lesson?.curriculumId;
    if (!cid) continue;
    const agg = kcByCurriculum.get(cid) || { correct: 0, total: 0 };
    agg.total += 1;
    if (a.correct) agg.correct += 1;
    kcByCurriculum.set(cid, agg);
  }

  const subjectReports = subjectsRaw.map((subject) => {
    const unitReports = subject.units.map((unit) => {
      const cid = unit.curriculum?.id;

      const latestFinal = cid ? finals.find((f) => f.curriculumId === cid) : undefined;
      const finalPercent =
        latestFinal && latestFinal.scoreTotal > 0
          ? (latestFinal.scoreCorrect / latestFinal.scoreTotal) * 100
          : null;

      const unitSamples = samples.filter((s) => s.unitId === unit.id && s.samples > 0);
      const focus = unitSamples.length
        ? Math.round(unitSamples.reduce((a, s) => a + s.totalScore / s.samples, 0) / unitSamples.length)
        : null;

      const tutorialProgress = cid ? progresses.find((p) => p.curriculumId === cid) : undefined;
      const completed = !!tutorialProgress?.completed;
      const kc = cid ? kcByCurriculum.get(cid) : undefined;
      const kcAccuracy = kc && kc.total > 0 ? (kc.correct / kc.total) * 100 : null;
      const mark = computeMark({ finalPercent, kcAccuracy, focus, completed });

      const totalLessons = unit.curriculum?.lessons.length ?? 0;
      // currentLessonOrder is a 0-based pointer at the lesson they're ON, so
      // the count they've moved PAST is the pointer itself - clamped, and
      // forced to the full count once the unit is complete.
      const lessonsDone = completed
        ? totalLessons
        : Math.min(Math.max(tutorialProgress?.currentLessonOrder ?? 0, 0), totalLessons);

      return {
        id: unit.id,
        title: unit.title,
        hasCurriculum: !!cid,
        mark: mark.percent,
        grade: mark.grade,
        finalPercent: finalPercent === null ? null : Math.round(finalPercent),
        kcAccuracy: kcAccuracy === null ? null : Math.round(kcAccuracy),
        focus,
        completed,
        // Lesson-level detail - powers the teacher's per-unit breakdown and is
        // simply ignored by the student's own report page.
        totalLessons,
        lessonsDone,
        currentLessonOrder: tutorialProgress?.currentLessonOrder ?? null,
        lastActivityAt: tutorialProgress?.updatedAt ?? null,
        preferredMode: tutorialProgress?.preferredMode ?? null,
        knowledgeChecks: kc ? { correct: kc.correct, total: kc.total } : { correct: 0, total: 0 },
        finalAttempt: latestFinal
          ? {
              scoreCorrect: latestFinal.scoreCorrect,
              scoreTotal: latestFinal.scoreTotal,
              completedAt: latestFinal.completedAt
            }
          : null,
        lessons:
          unit.curriculum?.lessons
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              order: lesson.order,
              done: completed || lesson.order < (tutorialProgress?.currentLessonOrder ?? 0)
            })) ?? []
      };
    });

    const marked = unitReports.filter((u) => u.mark !== null) as Array<{ mark: number }>;
    const subjectMark = marked.length ? Math.round(marked.reduce((a, u) => a + u.mark, 0) / marked.length) : null;
    return {
      id: subject.id,
      name: subject.name,
      mark: subjectMark,
      grade: subjectMark === null ? '—' : letterGrade(subjectMark),
      units: unitReports
    };
  });

  const markedSubjects = subjectReports.filter((s) => s.mark !== null) as Array<{ mark: number }>;
  const overall = markedSubjects.length
    ? Math.round(markedSubjects.reduce((a, s) => a + s.mark, 0) / markedSubjects.length)
    : null;

  // --- Learning pattern --------------------------------------------------
  // Which mode does this student engage best in? Blend the diagnostic's
  // per-mode engagement with actual in-tutorial focus per mode.
  const focusByMode = new Map<string, { total: number; n: number }>();
  for (const s of samples) {
    if (s.samples <= 0) continue;
    const agg = focusByMode.get(s.mode) || { total: 0, n: 0 };
    agg.total += s.totalScore / s.samples;
    agg.n += 1;
    focusByMode.set(s.mode, agg);
  }
  const modeScores: Record<string, number> = {};
  if (latestAttempt) {
    modeScores.TEXT = latestAttempt.textEngagement;
    modeScores.AUDIO = latestAttempt.audioEngagement;
    modeScores.VISUAL = latestAttempt.visualEngagement;
  }
  for (const [mode, agg] of focusByMode) {
    const focusAvg = agg.total / agg.n;
    modeScores[mode] = modeScores[mode] !== undefined ? (modeScores[mode] + focusAvg) / 2 : focusAvg;
  }
  const bestMode =
    Object.keys(modeScores).length > 0
      ? Object.entries(modeScores).sort((a, b) => b[1] - a[1])[0][0]
      : latestAttempt?.preferredMode ?? null;

  const pattern = {
    bestMode,
    preferredMode: latestAttempt?.preferredMode ?? null,
    attentionSpanScore: latestAttempt ? Math.round(latestAttempt.attentionSpanScore) : null,
    diagnosticScore: latestAttempt ? Math.round(latestAttempt.scorePercent) : null,
    modeScores: Object.fromEntries(
      Object.entries(modeScores).map(([mode, score]) => [mode, Math.round(score)])
    )
  };

  // --- Recommendations ---------------------------------------------------
  const recommendations: Array<{ type: string; title: string; detail: string; unitId?: string }> = [];

  // Weakest subject worth revisiting (has a mark, below B).
  const weakest = [...subjectReports]
    .filter((s) => s.mark !== null && (s.mark as number) < 70)
    .sort((a, b) => (a.mark as number) - (b.mark as number))[0];
  if (weakest) {
    recommendations.push({
      type: 'revisit',
      title: `Revisit ${weakest.name}`,
      detail: `Your mark here is ${weakest.mark}% (${weakest.grade}) — the lowest so far. A quick review will lift it.`
    });
  }

  // Next unit to continue (first not-completed unit with a curriculum).
  for (const s of subjectReports) {
    const next = s.units.find((u) => u.hasCurriculum && !u.completed);
    if (next) {
      recommendations.push({
        type: 'continue',
        title: `Continue ${next.title}`,
        detail: `You haven't finished this unit in ${s.name} yet.`,
        unitId: next.id
      });
      break;
    }
  }

  // Best-mode nudge.
  if (bestMode) {
    recommendations.push({
      type: 'mode',
      title: `You learn best in ${bestMode} mode`,
      detail: `You stay most engaged in ${bestMode}. Try switching to it when a lesson feels hard.`
    });
  }

  return {
    enrolled: true as const,
    classroom: { id: enrolment.classroom.id, name: enrolment.classroom.name },
    joinedAt: enrolment.joinedAt,
    overall,
    overallGrade: overall === null ? '—' : letterGrade(overall),
    subjects: subjectReports,
    pattern,
    recommendations
  };
}

/**
 * True when `studentId` is enrolled in the classroom taught by `teacherId`.
 * The authorization gate for every teacher-facing per-student route - a
 * teacher may only ever see their own learners.
 */
export async function teacherTeachesStudent(teacherId: string, studentId: string): Promise<boolean> {
  const enrolment = await prisma.enrolment.findFirst({
    where: { studentId, classroom: { teacherId } },
    select: { id: true }
  });
  return !!enrolment;
}
