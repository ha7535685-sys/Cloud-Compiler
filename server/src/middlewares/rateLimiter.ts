import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Rate limiter for code execution requests (20 runs per minute per IP)
 */
export const runRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.RATE_LIMIT_RUNS_PER_MIN, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: `Too many execution requests. Limit is ${env.RATE_LIMIT_RUNS_PER_MIN} runs per minute per IP.`,
        statusCode: 429
      }
    });
  }
});

/**
 * Rate limiter for AI requests (10 calls per minute per IP)
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.RATE_LIMIT_AI_PER_MIN, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: `Too many AI requests. Limit is ${env.RATE_LIMIT_AI_PER_MIN} calls per minute per IP.`,
        statusCode: 429
      }
    });
  }
});
