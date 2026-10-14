import { Router, Request, Response } from 'express';
import { healthRouter } from './healthRoutes';
import { executionRouter } from './executionRoutes';
import { aiRouter } from './aiRoutes';
import { snippetRouter } from './snippetRoutes';
import { SUPPORTED_LANGUAGES } from '../config/languages';

export const apiRouter = Router();

// Health check mounted at /health directly on root app, and also /api/health
apiRouter.use('/health', healthRouter);

// Code execution endpoint mounted at /api/run
apiRouter.use('/run', executionRouter);

// AI Assistance endpoints mounted at /api/ai
apiRouter.use('/ai', aiRouter);

// Snippet sharing endpoints mounted at /api/snippets
apiRouter.use('/snippets', snippetRouter);

// Extensible languages list route
apiRouter.get('/languages', (req: Request, res: Response) => {
  res.status(200).json({
    languages: SUPPORTED_LANGUAGES
  });
});



