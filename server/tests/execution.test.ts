import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { setCustomRunnerOverride } from '../src/services/executionService';

describe('Execution API - POST /api/run', () => {
  const app = createApp();

  afterEach(() => {
    // Reset custom runner after each test
    setCustomRunnerOverride(null);
  });

  it('successfully executes Python code and returns stdout, exitCode 0, and timeMs', async () => {
    setCustomRunnerOverride(async (req) => {
      expect(req.language).toBe('python');
      return {
        stdout: 'Hello from Python Sandbox\n',
        stderr: '',
        exitCode: 0,
        timeMs: 45,
        errorType: null
      };
    });

    const res = await request(app)
      .post('/api/run')
      .send({
        language: 'python',
        code: 'print("Hello from Python Sandbox")'
      });

    expect(res.status).toBe(200);
    expect(res.body.stdout).toBe('Hello from Python Sandbox\n');
    expect(res.body.stderr).toBe('');
    expect(res.body.exitCode).toBe(0);
    expect(res.body.timeMs).toBeGreaterThan(0);
    expect(res.body.errorType).toBeNull();
  });

  it('handles standard input (stdin) properly', async () => {
    setCustomRunnerOverride(async (req) => {
      expect(req.stdin).toBe('Alice\n');
      return {
        stdout: 'Welcome, Alice!\n',
        stderr: '',
        exitCode: 0,
        timeMs: 38,
        errorType: null
      };
    });

    const res = await request(app)
      .post('/api/run')
      .send({
        language: 'python',
        code: 'name = input()\nprint(f"Welcome, {name}!")',
        stdin: 'Alice\n'
      });

    expect(res.status).toBe(200);
    expect(res.body.stdout).toBe('Welcome, Alice!\n');
    expect(res.body.exitCode).toBe(0);
  });

  it('identifies and returns clear compile errors (e.g. C/C++ compilation failure)', async () => {
    setCustomRunnerOverride(async () => {
      return {
        stdout: '',
        stderr: 'main.cpp:5:1: error: expected \';\' before \'return\'',
        exitCode: 1,
        timeMs: 92,
        errorType: 'compile_error'
      };
    });

    const res = await request(app)
      .post('/api/run')
      .send({
        language: 'cpp',
        code: '#include <iostream>\nint main() { std::cout << "test" return 0; }'
      });

    expect(res.status).toBe(200);
    expect(res.body.exitCode).toBe(1);
    expect(res.body.errorType).toBe('compile_error');
    expect(res.body.stderr).toContain('error: expected \';\' before \'return\'');
  });

  it('identifies and returns runtime errors (e.g. uncaught exception)', async () => {
    setCustomRunnerOverride(async () => {
      return {
        stdout: '',
        stderr: 'ZeroDivisionError: division by zero',
        exitCode: 1,
        timeMs: 50,
        errorType: 'runtime_error'
      };
    });

    const res = await request(app)
      .post('/api/run')
      .send({
        language: 'python',
        code: 'print(1 / 0)'
      });

    expect(res.status).toBe(200);
    expect(res.body.exitCode).toBe(1);
    expect(res.body.errorType).toBe('runtime_error');
    expect(res.body.stderr).toContain('ZeroDivisionError');
  });

  it('detects and terminates an infinite loop with a timeout error after 10 seconds', async () => {
    setCustomRunnerOverride(async () => {
      return {
        stdout: '',
        stderr: 'Execution timed out after 10 seconds',
        exitCode: 124,
        timeMs: 10000,
        errorType: 'timeout_error'
      };
    });

    const res = await request(app)
      .post('/api/run')
      .send({
        language: 'python',
        code: 'while True: pass'
      });

    expect(res.status).toBe(200);
    expect(res.body.exitCode).toBe(124);
    expect(res.body.errorType).toBe('timeout_error');
    expect(res.body.stderr).toContain('Execution timed out after 10 seconds');
    expect(res.body.timeMs).toBe(10000);
  });

  it('rejects unsupported languages with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/run')
      .send({
        language: 'unsupported-lang',
        code: 'print(1)'
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toContain('Unsupported language');
  });

  it('rejects code exceeding the 64 KB size limit with 400 Bad Request', async () => {
    // Generate code larger than 64 KB (65,536 bytes)
    const oversizedCode = 'a = 1\n'.repeat(15000); // ~90 KB

    const res = await request(app)
      .post('/api/run')
      .send({
        language: 'python',
        code: oversizedCode
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toContain('Code size exceeds maximum limit of 64 KB');
  });

  it('truncates output that exceeds 100 KB and adds notification banner', async () => {
    setCustomRunnerOverride(async () => {
      const hugeOutput = 'X'.repeat(120000);
      const { truncateOutput } = await import('../src/services/executionService');
      return {
        stdout: truncateOutput(hugeOutput),
        stderr: '',
        exitCode: 0,
        timeMs: 120,
        errorType: null
      };
    });

    const res = await request(app)
      .post('/api/run')
      .send({
        language: 'javascript',
        code: 'console.log("X".repeat(120000))'
      });

    expect(res.status).toBe(200);
    expect(res.body.stdout).toContain('[Output truncated at 100 KB]');
    expect(Buffer.byteLength(res.body.stdout, 'utf8')).toBeLessThanOrEqual(102400 + 100);
  });
});
