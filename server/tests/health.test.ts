import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Health & Config Routes', () => {
  const app = createApp();

  it('GET /health returns 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });

  it('GET /api/languages returns allow-listed languages', async () => {
    const res = await request(app).get('/api/languages');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('languages');
    expect(Array.isArray(res.body.languages)).toBe(true);

    const ids = res.body.languages.map((l: { id: string }) => l.id);
    expect(ids).toContain('python');
    expect(ids).toContain('javascript');
    expect(ids).toContain('c');
    expect(ids).toContain('cpp');
    expect(ids).toContain('java');
  });

  it('GET /unknown-route returns structured 404', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.statusCode).toBe(404);
  });
});
