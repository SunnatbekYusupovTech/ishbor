import type { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Wraps an async controller so rejected promises are forwarded to Express's
 * error-handling middleware instead of crashing the process. Keeps controllers
 * free of repetitive try/catch-just-to-call-next boilerplate.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
