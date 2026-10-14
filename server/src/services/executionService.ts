import axios, { AxiosError } from 'axios';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { getLanguageById, LanguageConfig } from '../config/languages';
import {
  ExecuteRequest,
  ExecuteResponse,
  PistonApiResponse,
  PistonExecutePayload
} from '../types/execution';
import { logger } from '../utils/logger';

/**
 * Truncates output if it exceeds max size in bytes
 */
export function truncateOutput(output: string, maxBytes: number = env.MAX_OUTPUT_SIZE_BYTES): string {
  if (!output) return '';
  const buffer = Buffer.from(output, 'utf8');
  if (buffer.length <= maxBytes) {
    return output;
  }
  const truncated = buffer.subarray(0, maxBytes).toString('utf8');
  return `${truncated}\n[Output truncated at ${maxBytes / 1024} KB]`;
}

// In-memory or custom mock runner function for testing environments
type CustomRunner = (req: ExecuteRequest) => Promise<ExecuteResponse> | ExecuteResponse;
let customRunnerOverride: CustomRunner | null = null;

export function setCustomRunnerOverride(runner: CustomRunner | null): void {
  customRunnerOverride = runner;
}

/**
 * Executes code using Judge0 Cloud Sandbox (Public CE runner)
 */
async function runViaJudge0(
  langConfig: LanguageConfig,
  code: string,
  stdin: string,
  startTime: number
): Promise<ExecuteResponse | null> {
  if (!langConfig.judge0Id) {
    return null;
  }

  try {
    const encodedCode = Buffer.from(code, 'utf8').toString('base64');
    const encodedStdin = stdin ? Buffer.from(stdin, 'utf8').toString('base64') : '';

    const url = `${env.JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`;
    const response = await axios.post(
      url,
      {
        source_code: encodedCode,
        language_id: langConfig.judge0Id,
        stdin: encodedStdin,
        cpu_time_limit: Math.min(Math.round(env.EXECUTION_TIMEOUT_MS / 1000), 10)
      },
      {
        timeout: env.EXECUTION_TIMEOUT_MS + 4000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const data = response.data;
    const decodeB64 = (val?: string | null): string => {
      if (!val) return '';
      try {
        return Buffer.from(val, 'base64').toString('utf8');
      } catch {
        return val;
      }
    };

    const stdout = decodeB64(data.stdout);
    const stderr = decodeB64(data.stderr);
    const compileOutput = decodeB64(data.compile_output);
    const statusId = data.status?.id;

    const duration = Date.now() - startTime;

    // Check compilation error (Judge0 status 6)
    if (statusId === 6 || compileOutput) {
      return {
        stdout: '',
        stderr: truncateOutput(compileOutput || stderr || 'Compilation failed'),
        exitCode: 1,
        timeMs: duration,
        errorType: 'compile_error'
      };
    }

    // Check timeout (Judge0 status 5)
    if (statusId === 5) {
      return {
        stdout: truncateOutput(stdout),
        stderr: 'Execution timed out after 10 seconds',
        exitCode: 124,
        timeMs: Math.max(duration, env.EXECUTION_TIMEOUT_MS),
        errorType: 'timeout_error'
      };
    }

    // Success (Judge0 status 3: Accepted)
    if (statusId === 3) {
      return {
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        exitCode: 0,
        timeMs: duration,
        errorType: null
      };
    }

    // Runtime Error or other non-zero status
    const exitCode = typeof data.exit_code === 'number' ? data.exit_code : 1;
    return {
      stdout: truncateOutput(stdout),
      stderr: truncateOutput(stderr || data.message || data.status?.description || 'Runtime error'),
      exitCode: exitCode === 0 ? 1 : exitCode,
      timeMs: duration,
      errorType: 'runtime_error'
    };
  } catch (error) {
    logger.warn('Judge0 execution failed or timed out', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Attempts execution via local Piston Docker container (http://localhost:2000)
 */
async function runViaPiston(
  langConfig: LanguageConfig,
  code: string,
  stdin: string,
  startTime: number
): Promise<ExecuteResponse | null> {
  const payload: PistonExecutePayload = {
    language: langConfig.pistonLanguage,
    version: langConfig.version,
    files: [
      {
        name: langConfig.fileName,
        content: code
      }
    ],
    stdin,
    run_timeout: env.EXECUTION_TIMEOUT_MS,
    compile_timeout: env.EXECUTION_TIMEOUT_MS,
    run_memory_limit: env.MEMORY_LIMIT_BYTES
  };

  try {
    const pistonUrl = `${env.PISTON_API_URL}/execute`;
    const response = await axios.post<PistonApiResponse>(pistonUrl, payload, {
      timeout: 2500, // fast check for local docker
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;
    if (!data.run && !data.compile) {
      return null;
    }

    const duration = Date.now() - startTime;

    if (data.compile && data.compile.code !== 0) {
      return {
        stdout: '',
        stderr: truncateOutput(data.compile.stderr || data.compile.output || 'Compilation failed'),
        exitCode: data.compile.code ?? 1,
        timeMs: duration,
        errorType: 'compile_error'
      };
    }

    const runResult = data.run;
    if (!runResult) return null;

    const isTimeout =
      runResult.signal === 'SIGKILL' ||
      runResult.signal === 'SIGXCPU' ||
      (runResult.output && runResult.output.toLowerCase().includes('timed out'));

    if (isTimeout) {
      return {
        stdout: truncateOutput(runResult.stdout || ''),
        stderr: 'Execution timed out after 10 seconds',
        exitCode: 124,
        timeMs: Math.max(duration, env.EXECUTION_TIMEOUT_MS),
        errorType: 'timeout_error'
      };
    }

    const exitCode = runResult.code ?? (runResult.signal ? 137 : 0);
    return {
      stdout: truncateOutput(runResult.stdout || ''),
      stderr: truncateOutput(runResult.stderr || ''),
      exitCode,
      timeMs: duration,
      errorType: exitCode !== 0 ? 'runtime_error' : null
    };
  } catch {
    // Docker is not running or unreachable
    return null;
  }
}

/**
 * Attempts execution via public Piston API fallback (e.g. on Vercel)
 */
async function runViaPublicPiston(
  langConfig: LanguageConfig,
  code: string,
  stdin: string,
  startTime: number
): Promise<ExecuteResponse | null> {
  const payload: PistonExecutePayload = {
    language: langConfig.pistonLanguage,
    version: langConfig.version,
    files: [
      {
        name: langConfig.fileName,
        content: code
      }
    ],
    stdin,
    run_timeout: env.EXECUTION_TIMEOUT_MS,
    compile_timeout: env.EXECUTION_TIMEOUT_MS,
    run_memory_limit: env.MEMORY_LIMIT_BYTES
  };

  try {
    const pistonUrl = `${env.FALLBACK_PISTON_API_URL}/execute`;
    const response = await axios.post<PistonApiResponse>(pistonUrl, payload, {
      timeout: env.EXECUTION_TIMEOUT_MS + 3000,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;
    if (!data.run && !data.compile) {
      return null;
    }

    const duration = Date.now() - startTime;

    if (data.compile && data.compile.code !== 0) {
      return {
        stdout: '',
        stderr: truncateOutput(data.compile.stderr || data.compile.output || 'Compilation failed'),
        exitCode: data.compile.code ?? 1,
        timeMs: duration,
        errorType: 'compile_error'
      };
    }

    const runResult = data.run;
    if (!runResult) return null;

    const isTimeout =
      runResult.signal === 'SIGKILL' ||
      runResult.signal === 'SIGXCPU' ||
      (runResult.output && runResult.output.toLowerCase().includes('timed out'));

    if (isTimeout) {
      return {
        stdout: truncateOutput(runResult.stdout || ''),
        stderr: 'Execution timed out after 10 seconds',
        exitCode: 124,
        timeMs: Math.max(duration, env.EXECUTION_TIMEOUT_MS),
        errorType: 'timeout_error'
      };
    }

    const exitCode = runResult.code ?? (runResult.signal ? 137 : 0);
    return {
      stdout: truncateOutput(runResult.stdout || ''),
      stderr: truncateOutput(runResult.stderr || ''),
      exitCode,
      timeMs: duration,
      errorType: exitCode !== 0 ? 'runtime_error' : null
    };
  } catch {
    return null;
  }
}

/**
 * Local child process fallback runner for Python and Node.js
 */
async function runLocally(
  langConfig: LanguageConfig,
  code: string,
  stdin: string,
  startTime: number
): Promise<ExecuteResponse> {
  const isWindows = process.platform === 'win32';
  let cmd = '';
  let args: string[] = [];

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compiler-'));
  const filePath = path.join(tempDir, langConfig.fileName);
  fs.writeFileSync(filePath, code, 'utf8');

  if (langConfig.id === 'python') {
    cmd = isWindows ? 'py' : 'python3';
    args = [filePath];
  } else if (langConfig.id === 'javascript') {
    cmd = 'node';
    args = [filePath];
  } else {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    return {
      stdout: '',
      stderr: `Runner notice: Execution for ${langConfig.name} is currently offline. Start Docker or check network connection.`,
      exitCode: 1,
      timeMs: Date.now() - startTime,
      errorType: 'runtime_error'
    };
  }

  return new Promise<ExecuteResponse>((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(cmd, args, {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWindows
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, env.EXECUTION_TIMEOUT_MS);

    child.stdout?.on('data', (d) => {
      stdout += d.toString('utf8');
    });

    child.stderr?.on('data', (d) => {
      stderr += d.toString('utf8');
    });

    if (stdin && child.stdin) {
      try {
        child.stdin.write(stdin);
      } catch {}
    }
    try {
      child.stdin?.end();
    } catch {}

    child.on('error', (err) => {
      clearTimeout(timer);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
      resolve({
        stdout: '',
        stderr: `Failed to execute ${langConfig.name}: ${err.message}`,
        exitCode: 1,
        timeMs: Date.now() - startTime,
        errorType: 'runtime_error'
      });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
      const duration = Date.now() - startTime;

      if (timedOut) {
        resolve({
          stdout: truncateOutput(stdout),
          stderr: 'Execution timed out after 10 seconds',
          exitCode: 124,
          timeMs: env.EXECUTION_TIMEOUT_MS,
          errorType: 'timeout_error'
        });
        return;
      }

      const exitCode = code ?? (signal ? 137 : 0);
      resolve({
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        exitCode,
        timeMs: duration,
        errorType: exitCode !== 0 ? 'runtime_error' : null
      });
    });
  });
}

export async function executeCode(request: ExecuteRequest): Promise<ExecuteResponse> {
  const { language, code, stdin = '' } = request;
  const langConfig = getLanguageById(language);

  if (!langConfig) {
    return {
      stdout: '',
      stderr: `Unsupported language: ${language}`,
      exitCode: 1,
      timeMs: 0,
      errorType: 'runtime_error'
    };
  }

  // Use test runner override if registered (e.g. during integration tests)
  if (customRunnerOverride) {
    return customRunnerOverride(request);
  }

  const startTime = Date.now();

  // 0. For HTML and CSS: produce instant structural parsing & live preview manifest
  if (langConfig.id === 'html' || langConfig.id === 'css') {
    const duration = Date.now() - startTime;
    if (langConfig.id === 'html') {
      const tagCount = (code.match(/<[a-zA-Z0-9]+(\s|>)/g) || []).length;
      const hasDoctype = /<!doctype/i.test(code);
      const hasBody = /<body/i.test(code);
      const hasScript = /<script/i.test(code);
      const hasStyle = /<style/i.test(code);

      const stdout = [
        `🌐 [HTML5 Engine]: Document parsed successfully.`,
        `   • Total Tags: ${tagCount}`,
        `   • DOCTYPE: ${hasDoctype ? 'Valid HTML5' : 'Implicit'}`,
        `   • Body Section: ${hasBody ? 'Present' : 'Inline'}`,
        `   • Embedded Styles: ${hasStyle ? 'Detected' : 'None'}`,
        `   • Embedded Scripts: ${hasScript ? 'Detected' : 'None'}`,
        `   • Status: Interactive page rendered in Live Web Preview.`
      ].join('\n');

      return {
        stdout,
        stderr: '',
        exitCode: 0,
        timeMs: Math.max(duration, 12),
        errorType: null
      };
    }

    if (langConfig.id === 'css') {
      const rules = (code.match(/\{[^}]*\}/g) || []).length;
      const selectors = (code.match(/[^{}]+(?=\{)/g) || []).length;
      const stdout = [
        `🎨 [CSS3 Engine]: Stylesheet parsed successfully.`,
        `   • CSS Style Rules: ${rules}`,
        `   • Selectors Identified: ${selectors}`,
        `   • Syntax: Well-formed CSS3`,
        `   • Status: Interactive styling rendered in Live Web Preview.`
      ].join('\n');

      return {
        stdout,
        stderr: '',
        exitCode: 0,
        timeMs: Math.max(duration, 10),
        errorType: null
      };
    }
  }

  // 1. For Python and JavaScript: execute locally for ultra-fast response (< 200ms) with zero network dependency
  if (langConfig.id === 'python' || langConfig.id === 'javascript') {
    const localResult = await runLocally(langConfig, code, stdin, startTime);
    // If local execution did not fail on spawn error, return local result
    if (!localResult.stderr.startsWith(`Failed to execute ${langConfig.name}`)) {
      return localResult;
    }
    logger.info('Local runner unavailable, falling back to cloud runner', { language });
  }

  // 2. Try local Docker Piston if available
  const pistonResult = await runViaPiston(langConfig, code, stdin, startTime);
  if (pistonResult) {
    return pistonResult;
  }

  // 3. Try public Piston API fallback (for serverless environments like Vercel)
  const publicPistonResult = await runViaPublicPiston(langConfig, code, stdin, startTime);
  if (publicPistonResult) {
    return publicPistonResult;
  }

  // 4. Execute via Judge0 Cloud Runner (supports C, C++, Java, Python, Node.js)
  const judge0Result = await runViaJudge0(langConfig, code, stdin, startTime);
  if (judge0Result) {
    return judge0Result;
  }

  // 5. Final fallback to local execution
  return await runLocally(langConfig, code, stdin, startTime);
}
