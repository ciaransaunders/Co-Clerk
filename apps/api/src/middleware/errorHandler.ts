import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so that rejected promises are forwarded
 * to Express's error-handling middleware instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Application-level error with an HTTP status code.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Centralized error-handling middleware.
 * Must be registered AFTER all routes.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Log unexpected errors but don't leak internals to the client
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
}
