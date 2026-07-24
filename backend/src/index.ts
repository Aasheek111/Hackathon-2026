import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import authRouter from './routes/auth';
import quizRouter from './routes/quiz';
import subscriptionRouter from './routes/subscription';
import dashboardRouter from './routes/dashboard';
import adminRouter from './routes/admin';
import teachersRouter from './routes/teachers';
import classroomsRouter from './routes/classrooms';
import joinRequestsRouter from './routes/joinRequests';
import assessmentsRouter from './routes/assessments';
import recommendationsRouter from './routes/recommendations';
import subjectsRouter from './routes/subjects';
import documentsRouter from './routes/documents';
import tutorialsRouter from './routes/tutorials';
import progressRouter from './routes/progress';
import curriculumRouter from './routes/curriculum';
import internalJobsRouter from './routes/internalJobs';
import notificationsRouter from './routes/notifications';
import youtubeQuizRouter from './routes/youtubeQuiz';
import ttsRouter from './routes/tts';
import analyticsRouter from './routes/analytics';
import accessibilityRouter from './routes/accessibility';
import assistantRouter from './routes/assistant';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl) or any localhost/127.0.0.1 origin
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/teachers', teachersRouter);
app.use('/api/classrooms', classroomsRouter);
app.use('/api/classrooms', joinRequestsRouter); // nested under /:id/requests
app.use('/api/assessments', assessmentsRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api', subjectsRouter); // defines /classrooms/:id/subjects and /subjects/:id/units itself
app.use('/api/units', documentsRouter); // nested under /:id/documents
app.use('/api/units', tutorialsRouter); // nested under /:id/tutorial
app.use('/api/units', curriculumRouter); // nested under /:id/generation-job, /:id/curriculum
app.use('/api/progress', progressRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/youtube-quiz', youtubeQuizRouter);
app.use('/api/tts', ttsRouter);
app.use('/api', analyticsRouter); // defines /analytics/class itself
app.use('/api/me/accessibility', accessibilityRouter);
app.use('/api/assistant', assistantRouter);
// Service-to-service only (shared-secret header, not user JWT) - the Celery
// worker calls back into these to report job progress and persist results.
app.use('/internal', internalJobsRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
