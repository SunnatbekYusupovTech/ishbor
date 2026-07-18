import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError } from '@/utils/ApiError';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Global error handler. Normalises every error type into a consistent JSON
 * envelope and never leaks stack traces / internals in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.flatten();
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Database validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for field "${err.path}"`;
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error('Unhandled error', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    },
  });
}
