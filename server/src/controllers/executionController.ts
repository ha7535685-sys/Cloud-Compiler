import { Request, Response } from 'express';
import { executeSchema } from '../validators/executionValidator';
import { executeCode } from '../services/executionService';
import { logger } from '../utils/logger';

export async function handleRunCode(req: Request, res: Response): Promise<void> {
  const parseResult = executeSchema.safeParse(req.body);

  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors.map((e) => e.message).join('; ');
    res.status(400).json({
      error: {
        message: errorDetails,
        statusCode: 400,
        issues: parseResult.error.errors
      }
    });
    return;
  }

  const { language, code, stdin } = parseResult.data;

  try {
    const result = await executeCode({ language, code, stdin });

    logger.info('Execution completed', {
      language,
      exitCode: result.exitCode,
      timeMs: result.timeMs,
      errorType: result.errorType
    });

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown execution failure';
    logger.error('Unexpected execution controller error', { error: message });

    res.status(500).json({
      error: {
        message: 'Internal execution service failure',
        statusCode: 500
      }
    });
  }
}
