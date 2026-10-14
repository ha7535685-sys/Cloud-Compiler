export interface ExecuteRequest {
  language: string;
  code: string;
  stdin?: string;
}

export type ExecutionErrorType = 'compile_error' | 'runtime_error' | 'timeout_error' | null;

export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  errorType?: ExecutionErrorType;
}

export interface PistonFile {
  name?: string;
  content: string;
  encoding?: string;
}

export interface PistonExecutePayload {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  run_timeout?: number;
  compile_timeout?: number;
  run_memory_limit?: number;
}

export interface PistonStageResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: string | null;
  output: string;
}

export interface PistonApiResponse {
  language: string;
  version: string;
  run: PistonStageResult;
  compile?: PistonStageResult;
  message?: string;
}
