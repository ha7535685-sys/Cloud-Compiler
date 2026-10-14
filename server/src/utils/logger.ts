type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'api_key',
  'apikey',
  'api-key',
  'secret',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'cookie'
]);

/**
 * Recursively masks sensitive fields in objects and strings
 */
export function sanitize(data: unknown): unknown {
  if (typeof data === 'string') {
    // Mask potential bearer tokens or API key patterns
    return data
      .replace(/(Bearer\s+)[A-Za-z0-9_\-\.]{10,}/gi, '$1[REDACTED]')
      .replace(/(key=)[A-Za-z0-9_\-\.]{10,}/gi, '$1[REDACTED]');
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  if (data !== null && typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitize(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: sanitize(meta) } : {})
  };

  const output = JSON.stringify(payload);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta)
};
