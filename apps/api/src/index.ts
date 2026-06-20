import express from 'express';
import cors from 'cors';
import { pool } from '@coclerk/database';

import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

import authRouter from './routes/auth';
import mattersRouter from './routes/matters';
import diaryRouter from './routes/diary';
import notificationsRouter from './routes/notifications';
import allocationRouter from './routes/allocation';
import workflowRouter from './routes/workflow';

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
export const app = express();

// CORS — allow both frontend apps and local dev origins
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',  // Vite default
    'http://localhost:5174',
  ],
  credentials: true,
}));

app.use(express.json());
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Health check — verifies database connectivity
// ---------------------------------------------------------------------------
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', version: '0.1.0', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', version: '0.1.0', db: 'unreachable' });
  }
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/matters', mattersRouter);
app.use('/api/v1/diary', diaryRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/allocation', allocationRouter);
app.use('/api/v1/workflow', workflowRouter);

// Centralized error handler (must be last)
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server start + graceful shutdown
// ---------------------------------------------------------------------------
if (require.main === module) {
  const PORT = process.env.API_PORT || 4000;
  const server = app.listen(PORT, () => {
    console.log(`CoClerk API Gateway listening on port ${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    server.close(async () => {
      await pool.end();
      console.log('Database pool closed');
      process.exit(0);
    });

    // Force exit after 10 seconds if connections don't drain.
    // unref() so a clean close still allows the process to exit immediately.
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
