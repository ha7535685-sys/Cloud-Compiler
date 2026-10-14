import { Router } from 'express';
import { handleCreateSnippet, handleGetSnippet } from '../controllers/snippetController';

export const snippetRouter = Router();

snippetRouter.post('/', handleCreateSnippet);
snippetRouter.get('/:id', handleGetSnippet);
