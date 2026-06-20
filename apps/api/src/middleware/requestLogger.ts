import { Request, Response, NextFunction } from 'express';

/**
 * Logs every inbound request with method, path, status code, and duration.
 * Uses structured JSON in production for machine parsing.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      user_id: (req as any).user?.id ?? null,
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(log));
    } else {
      console.log(`${log.method} ${log.path} ${log.status} ${log.duration_ms}ms`);
    }
  });

  next();
}
