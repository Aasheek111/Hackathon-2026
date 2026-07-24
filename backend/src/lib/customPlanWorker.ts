import axios from 'axios';
import prisma from './prisma';

async function callGroqAi(systemPrompt: string, userPrompt: string): Promise<any | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_')) return null;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 25000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (content) return JSON.parse(content);
  } catch (err) {
    console.warn('Groq AI call skipped/failed:', (err as any)?.message || err);
  }
  return null;
}

async function callGeminiAi(systemPrompt: string, userPrompt: string): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_')) return null;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      }
    );

    const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate) return JSON.parse(candidate);
  } catch (err) {
    console.warn('Gemini AI call skipped/failed:', (err as any)?.message || err);
  }
  return null;
}

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

    // 2. Fetch Student customer metrics (DemoResult or AssessmentAttempt)
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        attempts: { orderBy: { completedAt: 'desc' }, take: 3 },
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
      ? (latestAttempt as any).attentionSpanScore
      : 70;
    const preferredMode = latestAttempt?.preferredMode || 'VISUAL';
    const disabilityType = student.disabilityType || 'NONE';

    // Composition Pct
    const totalScore = Math.max(1, visualEngagement + audioEngagement + textEngagement);
    const visualPct = Math.round((visualEngagement / totalScore) * 100);
    const audioPct = Math.round((audioEngagement / totalScore) * 100);
    const textPct = Math.round((textEngagement / totalScore) * 100);

    let defaultStyleName = 'Balanced Explorer';
    if (disabilityType === 'BLINDNESS' || preferredMode === 'AUDIO' || audioPct > 45) {
      defaultStyleName = 'Auditory Narrative Learner';
    } else if (disabilityType === 'DEAFNESS' || preferredMode === 'SIGN' || visualPct > 55) {
      defaultStyleName = 'Visual & Sign-Oriented Learner';
    } else if (disabilityType === 'ADHD' || attentionSpanScore < 60) {
      defaultStyleName = 'Bite-Sized Gamified Adventurer';
    } else if (visualPct >= textPct && visualPct >= audioPct) {
      defaultStyleName = 'Visual & Hands-on Strategist';
    }

    // Gather existing generated lessons
    type LessonItem = {
      unitId: string;
      unitTitle: string;
      lessonOrder: number;
      title: string;
      explanation: string;
      example: string | null;
      imageUrl: string | null;
      questions: Array<{ question: string; options: string[]; correct: string }>;
    };

    const lessonsPool: LessonItem[] = [];
    for (const unit of subject.units) {
      if (unit.curriculum?.lessons) {
        for (const l of unit.curriculum.lessons) {
          const questions: Array<{ question: string; options: string[]; correct: string }> = [];
          if (l.knowledgeCheck) {
            questions.push({
              question: l.knowledgeCheck.question,
              options: l.knowledgeCheck.options as string[],
              correct: l.knowledgeCheck.correct
            });
          }
          lessonsPool.push({
            unitId: unit.id,
            unitTitle: unit.title,
            lessonOrder: l.order,
            title: l.title,
            explanation: l.explanation,
            example: l.example,
            imageUrl: l.imageUrl,
            questions
          });
        }
      }
    }

    // Create / find plan record
    let plan = await prisma.customizedPlan.findUnique({
      where: { subjectId_studentId: { subjectId, studentId } }
    });

    const initSummary = {
      visual: visualPct,
      audio: audioPct,
      text: textPct,
      focusScore: Math.round(attentionSpanScore),
      styleName: defaultStyleName,
      disabilityType,
      primaryTraits: [
        `${visualPct}% Visual / ${audioPct}% Audio / ${textPct}% Text`,
        `Focus Span: ${Math.round(attentionSpanScore)}%`,
        `Style: ${defaultStyleName}`
      ]
    };

    if (!plan) {
      plan = await prisma.customizedPlan.create({
        data: {
          subjectId,
          studentId,
          title: `${student.name.split(' ')[0]}'s ${defaultStyleName} Plan`,
          status: 'GENERATING',
          compositionSummary: initSummary
        }
      });
    } else {
      plan = await prisma.customizedPlan.update({
        where: { id: plan.id },
        data: { status: 'GENERATING', compositionSummary: initSummary, errorMessage: null }
      });
    }

    await prisma.customizedPlanModule.deleteMany({ where: { planId: plan.id } });

    // Try AI generation (Groq first, Gemini fallback) to reorder & adapt lessonsPool
    let aiResult: any = null;
    if (lessonsPool.length > 0) {
      const systemPrompt = `You are an adaptive educational AI planner. Rearrange and adapt the provided subject lessons into a customized learning plan JSON object for a student based on their customer metrics.
Return JSON with format:
{
  "styleName": "string",
  "primaryTraits": ["string"],
  "modules": [
    {
      "order": 1,
      "title": "string",
      "description": "string",
      "contentType": "VISUAL_STORY | GAME_CHALLENGE | AUDIO_EXPLANATION | MIXED_LESSON",
      "explanation": "string",
      "example": "string",
      "targetUnitId": "string",
      "targetLessonOrder": 1,
      "questions": [
        { "question": "string", "options": ["string"], "correct": "string" }
      ]
    }
  ]
}`;

      const userPrompt = `Student Metrics:
- Focus Span Score: ${Math.round(attentionSpanScore)}%
- Engagement: Visual ${visualPct}%, Audio ${audioPct}%, Text ${textPct}%
- Disability Profile: ${disabilityType}
- Preferred Mode: ${preferredMode}

Previously Generated Lessons on Subject "${subject.name}":
${JSON.stringify(lessonsPool.map((lp) => ({ unitId: lp.unitId, unitTitle: lp.unitTitle, lessonOrder: lp.lessonOrder, title: lp.title, explanation: lp.explanation, example: lp.example })))}

Rearrange and adapt these lessons into a customized sequence of modules tailored to the student's focus span and composition profile.`;

      aiResult = await callGroqAi(systemPrompt, userPrompt);
      if (!aiResult) {
        aiResult = await callGeminiAi(systemPrompt, userPrompt);
      }
    }

    let modulesToCreate: Array<{
      order: number;
      title: string;
      description: string;
      contentType: string;
      content: any;
      targetUnitId: string | null;
      targetLessonOrder: number | null;
    }> = [];

    let finalStyleName = defaultStyleName;
    let finalTraits = initSummary.primaryTraits;

    if (aiResult?.modules && Array.isArray(aiResult.modules) && aiResult.modules.length > 0) {
      finalStyleName = aiResult.styleName || defaultStyleName;
      if (Array.isArray(aiResult.primaryTraits)) finalTraits = aiResult.primaryTraits;

      modulesToCreate = aiResult.modules.map((m: any, idx: number) => {
        const orig = lessonsPool.find((lp) => lp.unitId === m.targetUnitId && lp.lessonOrder === m.targetLessonOrder) || lessonsPool[idx % lessonsPool.length];
        return {
          order: idx + 1,
          title: m.title || orig?.title || `Module ${idx + 1}`,
          description: m.description || `Adapted for ${finalStyleName}`,
          contentType: m.contentType || (idx % 2 === 0 ? 'VISUAL_STORY' : 'GAME_CHALLENGE'),
          content: {
            unitTitle: orig?.unitTitle || subject.name,
            title: m.title || orig?.title,
            explanation: m.explanation || orig?.explanation,
            example: m.example || orig?.example,
            imageUrl: orig?.imageUrl || null,
            questions: m.questions || orig?.questions || [
              {
                question: `Concept Check for ${m.title || 'this topic'}: Which statement is correct?`,
                options: [(m.explanation || 'Key concept explanation').slice(0, 60) + '...', 'Incorrect statement option', 'None of the above'],
                correct: (m.explanation || 'Key concept explanation').slice(0, 60) + '...'
              }
            ]
          },
          targetUnitId: orig?.unitId || null,
          targetLessonOrder: orig?.lessonOrder || null
        };
      });
    } else {
      // Fallback rule-based reordering if AI is not configured or fails
      if (lessonsPool.length === 0) {
        modulesToCreate.push({
          order: 1,
          title: `Introductory Exploration for ${subject.name}`,
          description: `Customized orientation tailored to your ${defaultStyleName} profile.`,
          contentType: 'MIXED_LESSON',
          content: {
            title: `Welcome to ${subject.name}`,
            explanation: `Your personalized learning path adapts to your focus level (${Math.round(attentionSpanScore)}%) and ${defaultStyleName} learning preferences.`,
            example: 'As your educator adds syllabus units, your customized plan automatically integrates them.',
            questions: [
              {
                question: `Ready to explore ${subject.name} using your customized ${defaultStyleName} path?`,
                options: ['Yes, let us begin!', 'Show me visual mode', 'Read aloud to me'],
                correct: 'Yes, let us begin!'
              }
            ]
          },
          targetUnitId: null,
          targetLessonOrder: null
        });
      } else {
        modulesToCreate = lessonsPool.map((item, idx) => {
          let contentType = 'MIXED_LESSON';
          if (idx % 3 === 0 && (visualPct >= 40 || preferredMode === 'VISUAL')) {
            contentType = 'VISUAL_STORY';
          } else if (idx % 3 === 1 && (attentionSpanScore < 65 || disabilityType === 'ADHD')) {
            contentType = 'GAME_CHALLENGE';
          } else if (idx % 3 === 2 && (audioPct >= 40 || disabilityType === 'BLINDNESS')) {
            contentType = 'AUDIO_EXPLANATION';
          }

          return {
            order: idx + 1,
            title: `${item.unitTitle}: ${item.title}`,
            description: `Customized for your ${defaultStyleName} profile (Unit topic: ${item.unitTitle}).`,
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
                  options: [item.explanation.slice(0, 70) + '...', 'An unrelated concept from a different topic', 'None of the above'],
                  correct: item.explanation.slice(0, 70) + '...'
                }
              ]
            },
            targetUnitId: item.unitId,
            targetLessonOrder: item.lessonOrder
          };
        });
      }
    }

    for (const mod of modulesToCreate) {
      await prisma.customizedPlanModule.create({
        data: {
          planId: plan.id,
          ...mod
        }
      });
    }

    const updatedSummary = {
      ...initSummary,
      styleName: finalStyleName,
      primaryTraits: finalTraits
    };

    await prisma.customizedPlan.update({
      where: { id: plan.id },
      data: {
        status: 'READY',
        title: `${student.name.split(' ')[0]}'s ${finalStyleName} Plan`,
        compositionSummary: updatedSummary
      }
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
