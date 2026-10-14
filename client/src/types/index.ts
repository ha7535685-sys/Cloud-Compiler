export interface LanguageConfig {
  id: string;
  name: string;
  monacoLanguage: string;
  pistonLanguage: string;
  judge0Id?: number;
  version: string;
  fileName: string;
  defaultCode: string;
}

export type ExecutionErrorType = 'compile_error' | 'runtime_error' | 'timeout_error' | null;

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  errorType?: ExecutionErrorType;
}

export type ThemeMode = 'dark' | 'light';
