import express from 'express';
import cors from 'cors';
import { errorHandler } from './lib/http.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { waiterRouter } from './routes/waiter.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/waiter', waiterRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Nepostojeća ruta.' } }));
  app.use(errorHandler);
  return app;
}
