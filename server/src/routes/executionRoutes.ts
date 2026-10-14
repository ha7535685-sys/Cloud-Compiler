import { Router } from 'express';
import { handleRunCode } from '../controllers/executionController';
import { runRateLimiter } from '../middlewares/rateLimiter';

export const executionRouter = Router();

// Apply rate limiting (20 runs per minute per IP) and execute handler
executionRouter.post('/', runRateLimiter, handleRunCode);
