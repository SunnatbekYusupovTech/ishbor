import type { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';

/**
 * Verifies the Bearer JWT and attaches the decoded payload to `req.user`.
 * All assessment endpoints are behind this — an anonymous client can never
 * start, mutate, or submit a session.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}
