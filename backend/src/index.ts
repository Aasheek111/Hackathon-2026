import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import authRouter from './routes/auth';
import quizRouter from './routes/quiz';
import subscriptionRouter from './routes/subscription';
import dashboardRouter from './routes/dashboard';
import adminRouter from './routes/admin';

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
