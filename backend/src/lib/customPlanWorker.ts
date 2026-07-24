import prisma from './prisma';

export async function generateCustomizedPlanForStudent(subjectId: string, studentId: string) {
  try {
    // 1. Fetch Subject with units and curricula
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        units: {
          orderBy: { order: 'asc' },
          include: {
            curriculum: {
              include: {
                lessons: {
                  orderBy: { order: 'asc' },
                  include: { knowledgeCheck: true }
                },
                finalAssessmentQuestions: true
              }
            }
          }
        }
      }
    });

    if (!subject) throw new Error('Subject not found');

    // 2. Fetch Student customer metrics
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        attempts: { orderBy: { completedAt: 'desc' }, take: 1 },
        demoResult: true,
        accessibilityPrefs: true
      }
    });

    if (!student) throw new Error('Student not found');

    const latestAttempt = student.attempts[0] || student.demoResult || null;

    const visualEngagement = latestAttempt?.visualEngagement ?? 60;
    const audioEngagement = latestAttempt?.audioEngagement ?? 50;
    const textEngagement = latestAttempt?.textEngagement ?? 40;
    const attentionSpanScore = (latestAttempt && 'attentionSpanScore' in latestAttempt)
      ? latestAttempt.attentionSpanScore
      : 70;
    const preferredMode = latestAttempt?.preferredMode || 'VISUAL';
    const disabilityType = student.disabilityType || 'NONE';

    // 3. Determine Student Composition & Style Profile
    const totalScore = Math.max(1, visualEngagement + audioEngagement + textEngagement);
    const visualPct = Math.round((visualEngagement / totalScore) * 100);
    const audioPct = Math.round((audioEngagement / totalScore) * 100);
    const textPct = Math.round((textEngagement / totalScore) * 100);

    let styleName = 'Balanced Explorer';
    if (disabilityType === 'BLINDNESS' || preferredMode === 'AUDIO' || audioPct > 45) {
      styleName = 'Auditory Narrative Learner';
    } else if (disabilityType === 'DEAFNESS' || preferredMode === 'SIGN' || visualPct > 55) {
      styleName = 'Visual & Sign-Oriented Learner';
    } else if (disabilityType === 'ADHD' || attentionSpanScore < 60) {
      styleName = 'Bite-Sized Gamified Adventurer';
    } else if (visualPct >= textPct && visualPct >= audioPct) {
      styleName = 'Visual & Hands-on Strategist';
    }

    const compositionSummary = {
      visual: visualPct,
      audio: audioPct,
      text: textPct,
      focusScore: Math.round(attentionSpanScore),
      styleName,
      disabilityType,
      primaryTraits: [
        `${visualPct}% Visual / ${audioPct}% Audio / ${textPct}% Text`,
        `Focus Span Score: ${Math.round(attentionSpanScore)}%`,
        `Targeted Style: ${styleName}`
      ]
    };

    // 4. Gather all available lessons from subject units
    type LessonWithUnit = {
      unitId: string;
      unitTitle: string;
      lessonOrder: number;
      title: string;
      explanation: string;
      example: string | null;
      imageUrl: string | null;
      questions: Array<{ question: string; options: string[]; correct: string }>;
    };

    const pool: LessonWithUnit[] = [];

    for (const unit of subject.units) {
      if (unit.curriculum?.lessons) {
        for (const lesson of unit.curriculum.lessons) {
          const questions: Array<{ question: string; options: string[]; correct: string }> = [];
          if (lesson.knowledgeCheck) {
            questions.push({
              question: lesson.knowledgeCheck.question,
              options: lesson.knowledgeCheck.options as string[],
              correct: lesson.knowledgeCheck.correct
            });
          }
          pool.push({
            unitId: unit.id,
            unitTitle: unit.title,
            lessonOrder: lesson.order,
            title: lesson.title,
            explanation: lesson.explanation,
            example: lesson.example,
            imageUrl: lesson.imageUrl,
            questions
          });
        }
      }
    }

    // 5. Construct Customized Modules
    let plan = await prisma.customizedPlan.findUnique({
      where: { subjectId_studentId: { subjectId, studentId } }
    });

    if (!plan) {
      plan = await prisma.customizedPlan.create({
        data: {
          subjectId,
          studentId,
          title: `${student.name.split(' ')[0]}'s ${styleName} Plan`,
          status: 'GENERATING',
          compositionSummary
        }
      });
    } else {
      plan = await prisma.customizedPlan.update({
        where: { id: plan.id },
        data: {
          status: 'GENERATING',
          compositionSummary,
          errorMessage: null
        }
      });
    }

    // Delete existing modules to build freshly
    await prisma.customizedPlanModule.deleteMany({ where: { planId: plan.id } });

    // Fallback module if no units/lessons generated yet
    if (pool.length === 0) {
      await prisma.customizedPlanModule.create({
        data: {
          planId: plan.id,
          order: 1,
          title: `Introductory Exploration for ${subject.name}`,
          description: `Customized orientation tailored to your ${styleName} profile.`,
          contentType: 'MIXED_LESSON',
          content: {
            title: `Welcome to ${subject.name}`,
            explanation: `Your personalized learning path adapts to your focus level (${Math.round(attentionSpanScore)}%) and ${styleName} learning preferences.`,
            example: 'As your educator adds syllabus units, your customized plan automatically integrates them.',
            questions: [
              {
                question: `Ready to explore ${subject.name} using your customized ${styleName} path?`,
                options: ['Yes, let us begin!', 'Show me visual mode', 'Read aloud to me'],
                correct: 'Yes, let us begin!'
              }
            ]
          }
        }
      });
    } else {
      // Build blended modules matching student composition
      const modulesToCreate: Array<{
        order: number;
        title: string;
        description: string;
        contentType: string;
        content: any;
        targetUnitId: string | null;
        targetLessonOrder: number | null;
      }> = [];

      let orderCounter = 1;

      for (let i = 0; i < pool.length; i++) {
        const item = pool[i]!;

        let contentType = 'MIXED_LESSON';
        if (i % 3 === 0 && (visualPct >= 40 || preferredMode === 'VISUAL')) {
          contentType = 'VISUAL_STORY';
        } else if (i % 3 === 1 && (attentionSpanScore < 65 || disabilityType === 'ADHD')) {
          contentType = 'GAME_CHALLENGE';
        } else if (i % 3 === 2 && (audioPct >= 40 || disabilityType === 'BLINDNESS')) {
          contentType = 'AUDIO_EXPLANATION';
        }

        modulesToCreate.push({
          order: orderCounter++,
          title: `${item.unitTitle}: ${item.title}`,
          description: `Customized for your ${styleName} profile (Unit topic: ${item.unitTitle}).`,
          contentType,
          content: {
            unitTitle: item.unitTitle,
            title: item.title,
            explanation: item.explanation,
            example: item.example,
            imageUrl: item.imageUrl,
            questions: item.questions.length > 0 ? item.questions : [
              {
                question: `Key Concept Check for ${item.title}: Which statement best captures this concept?`,
                options: [
                  item.explanation.slice(0, 70) + '...',
                  'An unrelated concept from a different topic',
                  'None of the above'
                ],
                correct: item.explanation.slice(0, 70) + '...'
              }
            ]
          },
          targetUnitId: item.unitId,
          targetLessonOrder: item.lessonOrder
        });
      }

      for (const mod of modulesToCreate) {
        await prisma.customizedPlanModule.create({
          data: {
            planId: plan.id,
            ...mod
          }
        });
      }
    }

    // Mark plan READY
    await prisma.customizedPlan.update({
      where: { id: plan.id },
      data: { status: 'READY', title: `${student.name.split(' ')[0]}'s ${styleName} Plan` }
    });

    return plan;
  } catch (error: any) {
    console.error('Failed to generate customized plan:', error);
    await prisma.customizedPlan.updateMany({
      where: { subjectId, studentId },
      data: { status: 'FAILED', errorMessage: error.message || 'Customized plan generation failed.' }
    }).catch(() => {});
    throw error;
  }
}
