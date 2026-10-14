import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env if present (checking current, parent, and project root directories)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Automatically normalize legacy, deprecated, or rate-limited Gemini model names to the active production model
function getAiModel(): string {
  const model = process.env.AI_MODEL?.trim();
  if (!model || model === 'gemini-1.5-flash' || model === 'gemini-1.0-pro' || model === 'gemini-flash-latest') {
    return 'gemini-flash-lite-latest';
  }
  return model;
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Piston Sandbox URLs
  PISTON_API_URL: process.env.PISTON_API_URL || 'http://localhost:2000/api/v2',
  FALLBACK_PISTON_API_URL: process.env.FALLBACK_PISTON_API_URL || 'https://emkc.org/api/v2/piston',

  // Judge0 Public Cloud Runner URL
  JUDGE0_API_URL: process.env.JUDGE0_API_URL || 'https://ce.judge0.com',
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  
  // AI Settings
  AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: getAiModel(),
  
  // Rate Limits
  RATE_LIMIT_RUNS_PER_MIN: parseInt(process.env.RATE_LIMIT_RUNS_PER_MIN || '20', 10),
  RATE_LIMIT_AI_PER_MIN: parseInt(process.env.RATE_LIMIT_AI_PER_MIN || '10', 10),
  
  // Sandbox constraints
  MAX_CODE_SIZE_BYTES: parseInt(process.env.MAX_CODE_SIZE_BYTES || '65536', 10), // 64 KB
  EXECUTION_TIMEOUT_MS: parseInt(process.env.EXECUTION_TIMEOUT_MS || '10000', 10), // 10 s
  MAX_OUTPUT_SIZE_BYTES: parseInt(process.env.MAX_OUTPUT_SIZE_BYTES || '102400', 10), // 100 KB
  MEMORY_LIMIT_BYTES: 256 * 1024 * 1024, // 256 MB
};
