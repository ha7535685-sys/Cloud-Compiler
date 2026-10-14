import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('AI Features API - /api/ai/*', () => {
  const app = createApp();

  it('POST /api/ai/explain returns structured code explanation', async () => {
    const res = await request(app)
      .post('/api/ai/explain')
      .send({
        language: 'python',
        code: 'def add(a, b):\n    return a + b\n\nprint(add(2, 3))'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('explanation');
    expect(typeof res.body.explanation).toBe('string');
    expect(res.body.explanation.length).toBeGreaterThan(10);
  }, 15000);

  it('POST /api/ai/fix returns fixed code, explanation, and diff', async () => {
    const res = await request(app)
      .post('/api/ai/fix')
      .send({
        language: 'python',
        code: 'result = 10 / 0',
        stderr: 'ZeroDivisionError: division by zero'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fixedCode');
    expect(res.body).toHaveProperty('explanation');
    expect(res.body).toHaveProperty('diff');
    expect(typeof res.body.fixedCode).toBe('string');
    expect(typeof res.body.diff).toBe('string');
  }, 15000);

  it('POST /api/ai/comment returns commented code version', async () => {
    const res = await request(app)
      .post('/api/ai/comment')
      .send({
        language: 'javascript',
        code: 'function multiply(x, y) {\n    return x * y;\n}'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('commentedCode');
    expect(typeof res.body.commentedCode).toBe('string');
    expect(res.body.commentedCode).toContain('multiply');
  }, 15000);

  it('rejects AI requests with unsupported languages', async () => {
    const res = await request(app)
      .post('/api/ai/explain')
      .send({
        language: 'brainfuck',
        code: '+++'
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toContain('Unsupported language');
  });

  it('rejects oversized code input exceeding 64 KB limit', async () => {
    const hugeCode = 'x = 1\n'.repeat(15000); // ~90 KB
    const res = await request(app)
      .post('/api/ai/explain')
      .send({
        language: 'python',
        code: hugeCode
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Code size exceeds maximum limit of 64 KB');
  });
});
