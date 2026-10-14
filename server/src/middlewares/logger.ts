import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request handled', {
      method,
      url: originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: ip || req.socket.remoteAddress
    });
  });

  next();
}
