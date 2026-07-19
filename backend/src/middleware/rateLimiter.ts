import rateLimit from 'express-rate-limit';
import { ApiError } from '@/utils/ApiError';

/**
 * Brute-force guard for credential endpoints. Keyed by IP; a burst of failed
 * or repeated attempts from the same source gets locked out for the window
 * instead of being allowed to hammer the password hash / DB indefinitely.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many attempts. Please try again in a few minutes.'));
  },
});
