import { Router } from 'express';
import { handleExplain, handleFix, handleComment } from '../controllers/aiController';
import { aiRateLimiter } from '../middlewares/rateLimiter';

export const aiRouter = Router();

// Rate limit all AI routes to 10 requests per minute per IP
aiRouter.use(aiRateLimiter);

aiRouter.post('/explain', handleExplain);
aiRouter.post('/fix', handleFix);
aiRouter.post('/comment', handleComment);
