import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { LearningMode } from '@prisma/client';

const router = Router();

router.get('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    let session = await prisma.quizSession.findFirst({
      where: { userId, completed: false },
      orderBy: { startedAt: 'desc' }
    });

    if (!session) {
      session = await prisma.quizSession.create({
        data: { userId, currentMode: 'TEXT' }
      });
    }

    const question = await prisma.quizQuestion.findFirst({
      where: { learningMode: session.currentMode },
      skip: session.questionIndex
    });

    if (!question) {
      return res.json({ message: 'No more questions available for this mode', sessionId: session.id });
    }

    res.json({
      sessionId: session.id,
      question,
      timerStart: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start quiz' });
  }
});

router.post('/answer', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, questionId, answer, engagementScore } = req.body;

    const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
    const question = await prisma.quizQuestion.findUnique({ where: { id: questionId } });

    if (!session || !question) {
      return res.status(404).json({ error: 'Session or question not found' });
    }

    const isCorrect = question.answer === answer;
    const newScore = isCorrect ? session.score + 1 : session.score;

    const engagementLog = Array.isArray(session.engagementLog) ? session.engagementLog : [];
    engagementLog.push({ questionId, score: engagementScore, timestamp: Date.now() });

    let nextMode = session.currentMode;
    let switchedMode = false;

    if (engagementLog.length >= 3) {
      const recentScores = (engagementLog as unknown as Array<{ score?: number }>)
        .slice(-3).map(l => l.score || 0);
      const avgEngagement = recentScores.reduce((a: number, b: number) => a + b, 0) / 3;

      if (avgEngagement < 40) {
        if (session.currentMode === 'TEXT') nextMode = 'AUDIO';
        else if (session.currentMode === 'AUDIO') nextMode = 'VISUAL';
        switchedMode = session.currentMode !== nextMode;
      }
    }

    const updatedSession = await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        score: newScore,
        questionIndex: session.questionIndex + 1,
        currentMode: nextMode,
        engagementLog
      }
    });

    const nextQuestion = await prisma.quizQuestion.findFirst({
      where: { learningMode: nextMode },
      skip: updatedSession.questionIndex
    });

    res.json({
      correct: isCorrect,
      nextQuestion: nextQuestion || null,
      currentMode: nextMode,
      switchedMode
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

router.post('/engagement', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, score, faceDetected, gaze } = req.body;
    
    const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const engagementLog = Array.isArray(session.engagementLog) ? session.engagementLog : [];
    engagementLog.push({ score, faceDetected, gaze, timestamp: Date.now(), type: 'periodic' });

    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { engagementLog }
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log engagement' });
  }
});

router.post('/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user!.id;

    const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { completed: true, completedAt: new Date() }
    });

    const engagementLog = Array.isArray(session.engagementLog) ? session.engagementLog : [];
    let textScore = 0, audioScore = 0, visualScore = 0;
    
    // Simplistic engagement calculation for demo
    const avgScore = engagementLog.length > 0 
      ? engagementLog.reduce((acc: number, val: any) => acc + (val.score || 0), 0) / engagementLog.length 
      : 50;

    textScore = session.currentMode === 'TEXT' ? avgScore : 40;
    audioScore = session.currentMode === 'AUDIO' ? avgScore : 45;
    visualScore = session.currentMode === 'VISUAL' ? avgScore : 50;

    let preferredMode: LearningMode = 'TEXT';
    const scores = { TEXT: textScore, AUDIO: audioScore, VISUAL: visualScore };
    const maxScore = Math.max(textScore, audioScore, visualScore);
    
    if (maxScore === audioScore) preferredMode = 'AUDIO';
    if (maxScore === visualScore) preferredMode = 'VISUAL';

    const overallAvg = (textScore + audioScore + visualScore) / 3;
    const arRecommended = overallAvg < 50;

    const demoResult = await prisma.demoResult.upsert({
      where: { userId },
      create: {
        userId,
        textEngagement: textScore,
        audioEngagement: audioScore,
        visualEngagement: visualScore,
        preferredMode,
        arRecommended
      },
      update: {
        textEngagement: textScore,
        audioEngagement: audioScore,
        visualEngagement: visualScore,
        preferredMode,
        arRecommended,
        completedAt: new Date()
      }
    });

    res.json(demoResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

router.get('/result', requireAuth, async (req: Request, res: Response) => {
  try {
    let result = await prisma.demoResult.findUnique({ where: { userId: req.user!.id } });
    if (!result) {
      result = await prisma.demoResult.create({
        data: { userId: req.user!.id }
      });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

router.get('/questions', requireAuth, async (req: Request, res: Response) => {
  try {
    const questions = await prisma.quizQuestion.findMany();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

export default router;
