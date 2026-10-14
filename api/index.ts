import type { IncomingMessage, ServerResponse } from 'http';

// Cache app instance across serverless function invocations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let appInstance: any = null;

function getApp() {
  if (!appInstance) {
    try {
      // Try compiled JavaScript server bundle
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createApp } = require('../server/dist/app');
      appInstance = createApp();
    } catch {
      // Fallback to TypeScript source for local or TS-driven runtimes
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createApp } = require('../server/src/app');
      appInstance = createApp();
    }
  }
  return appInstance;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const app = getApp();

  // If Vercel rewrote the path, restore original target route
  const matched = (req.headers['x-matched-path'] || req.headers['x-now-route-matches']) as string;
  if (matched && typeof matched === 'string') {
    req.url = matched;
  }

  return app(req, res);
}
