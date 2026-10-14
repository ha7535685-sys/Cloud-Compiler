import { Request, Response } from 'express';
import { createSnippetSchema } from '../validators/snippetValidator';
import { getDb } from '../db';
import { generateShortId } from '../utils/nanoid';
import { logger } from '../utils/logger';

export async function handleCreateSnippet(req: Request, res: Response): Promise<void> {
  const parsed = createSnippetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        message: parsed.error.errors.map((e) => e.message).join('; '),
        statusCode: 400
      }
    });
    return;
  }

  const { language, code, stdin } = parsed.data;
  const id = generateShortId();

  try {
    const db = await getDb();
    await db.createSnippet({ id, language, code, stdin });

    logger.info('Snippet created successfully', { id, language });

    res.status(201).json({
      id,
      url: `/s/${id}`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    logger.error('Failed to create snippet', { error: message });
    res.status(500).json({
      error: {
        message: 'Failed to save snippet',
        statusCode: 500
      }
    });
  }
}

export async function handleGetSnippet(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (!id || typeof id !== 'string' || id.length > 32) {
    res.status(400).json({
      error: { message: 'Invalid snippet ID', statusCode: 400 }
    });
    return;
  }

  try {
    const db = await getDb();
    const snippet = await db.findSnippetById(id);

    if (!snippet) {
      res.status(404).json({
        error: { message: 'Snippet not found', statusCode: 404 }
      });
      return;
    }

    res.status(200).json(snippet);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    logger.error('Failed to retrieve snippet', { id, error: message });
    res.status(500).json({
      error: { message: 'Failed to retrieve snippet', statusCode: 500 }
    });
  }
}
