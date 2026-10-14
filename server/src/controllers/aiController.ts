import { Request, Response } from 'express';
import { aiRequestSchema } from '../validators/aiValidator';
import { explainCode, fixCode, commentCode } from '../services/aiService';
import { logger } from '../utils/logger';

export async function handleExplain(req: Request, res: Response): Promise<void> {
  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        message: parsed.error.errors.map((e) => e.message).join('; '),
        statusCode: 400
      }
    });
    return;
  }

  try {
    const result = await explainCode(parsed.data);
    logger.info('AI explain request fulfilled', { language: parsed.data.language });
    res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    logger.error('Failed processing AI explain request', { error: message });
    res.status(500).json({
      error: { message: 'Failed to process AI explanation', statusCode: 500 }
    });
  }
}

export async function handleFix(req: Request, res: Response): Promise<void> {
  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        message: parsed.error.errors.map((e) => e.message).join('; '),
        statusCode: 400
      }
    });
    return;
  }

  try {
    const result = await fixCode(parsed.data);
    logger.info('AI fix request fulfilled', { language: parsed.data.language });
    res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    logger.error('Failed processing AI fix request', { error: message });
    res.status(500).json({
      error: { message: 'Failed to process AI code fix', statusCode: 500 }
    });
  }
}

export async function handleComment(req: Request, res: Response): Promise<void> {
  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        message: parsed.error.errors.map((e) => e.message).join('; '),
        statusCode: 400
      }
    });
    return;
  }

  try {
    const result = await commentCode(parsed.data);
    logger.info('AI comment request fulfilled', { language: parsed.data.language });
    res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    logger.error('Failed processing AI comment request', { error: message });
    res.status(500).json({
      error: { message: 'Failed to process AI comments', statusCode: 500 }
    });
  }
}
