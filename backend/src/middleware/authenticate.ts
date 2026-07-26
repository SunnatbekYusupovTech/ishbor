import type { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import { ACCESS_COOKIE } from '@/utils/cookies';

/**
 * Verifies the access-token JWT (sent as an httpOnly cookie, never read by
 * client JS) and attaches the decoded payload to `req.user`. All assessment
 * endpoints are behind this — an anonymous client can never start, mutate,
 * or submit a session.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE];

  if (!token) {
    throw ApiError.unauthorized('Missing or expired session');
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}
