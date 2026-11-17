import express from 'express';
import cors from 'cors';
import bootstrapRoutes from './routes/bootstrap.js';
import snippetsRoutes from './routes/snippets.js';
import collectionsRoutes from './routes/collections.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check handler
  const healthHandler = (req, res) => {
    res.json({
      ok: true,
      data: {
        service: 'snippet-supabase-backend',
        status: 'healthy',
        timestamp: Date.now(),
      },
    });
  };

  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  // Mount routes with and without /api prefix for maximum compatibility (Vercel serverless + Standalone)
  app.use('/api/bootstrap', bootstrapRoutes);
  app.use('/bootstrap', bootstrapRoutes);

  app.use('/api/snippets', snippetsRoutes);
  app.use('/snippets', snippetsRoutes);

  app.use('/api/collections', collectionsRoutes);
  app.use('/collections', collectionsRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.url} not found` },
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(err.status || 500).json({
      ok: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred.',
      },
    });
  });

  return app;
}
