import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';
import { healthRouter } from './routes/healthRoutes';
import { apiRouter } from './routes/index';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  const allowedOrigins = [
    env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (
          env.NODE_ENV === 'development' ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    })
  );

  // Normalize path if rewritten by Vercel serverless functions
  app.use((req, _res, next) => {
    const matched = (req.headers['x-matched-path'] || req.headers['x-now-route-matches']) as string;
    if (matched && typeof matched === 'string') {
      req.url = matched;
    }
    next();
  });

  // Body parser with size constraint
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true, limit: '256kb' }));

  // Structured HTTP request logging
  app.use(requestLogger);

  // Health check endpoint directly on root (/health) and under /api/health
  app.use('/health', healthRouter);

  // API router mounted under /api and also / (for serverless rewrite flexibility)
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  // Short URL snippet route (/s/:id)
  app.get('/s/:id', async (req, res, next) => {
    try {
      if (req.accepts('json') && !req.accepts('html')) {
        const { handleGetSnippet } = await import('./controllers/snippetController');
        return handleGetSnippet(req, res);
      }
      res.redirect(`${env.CLIENT_URL}/s/${req.params.id}`);
    } catch (err) {
      next(err);
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        statusCode: 404
      }
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
