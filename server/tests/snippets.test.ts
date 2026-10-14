import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getDb } from '../src/db';

describe('Snippet Sharing API - /api/snippets', () => {
  const app = createApp();

  beforeAll(async () => {
    // Ensure database is initialized before running tests
    await getDb();
  });

  it('POST /api/snippets creates a snippet and returns a short id and url', async () => {
    const res = await request(app)
      .post('/api/snippets')
      .send({
        language: 'python',
        code: 'def hello():\n    return "Shared World"\n\nprint(hello())',
        stdin: 'sample input'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.id).toBe('string');
    expect(res.body.url).toBe(`/s/${res.body.id}`);

    // Verify GET /api/snippets/:id loads the exact snippet
    const getRes = await request(app).get(`/api/snippets/${res.body.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(res.body.id);
    expect(getRes.body.language).toBe('python');
    expect(getRes.body.code).toContain('Shared World');
    expect(getRes.body.stdin).toBe('sample input');
    expect(getRes.body).toHaveProperty('createdAt');
  });

  it('GET /api/snippets/:id returns 404 for nonexistent id', async () => {
    const res = await request(app).get('/api/snippets/nonexistent999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toContain('Snippet not found');
  });

  it('rejects snippet creation with unsupported language', async () => {
    const res = await request(app)
      .post('/api/snippets')
      .send({
        language: 'invalid-lang',
        code: 'print(123)'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Unsupported language');
  });

  it('rejects snippet creation with oversized code (> 64 KB)', async () => {
    const oversizedCode = 'x = 1\n'.repeat(15000); // ~90 KB
    const res = await request(app)
      .post('/api/snippets')
      .send({
        language: 'python',
        code: oversizedCode
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Code size exceeds maximum limit of 64 KB');
  });
});
