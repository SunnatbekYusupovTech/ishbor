import type { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '@/utils/jwt';
import { ACCESS_COOKIE } from '@/utils/cookies';

/**
 * Fills `req.user` when a valid access-token cookie is present and does
 * nothing otherwise — never throws.
 *
 * For endpoints that are public but render differently for the owner (the
 * freelancer profile: anyone may read it, only the owner sees the add/edit/
 * delete controls). A missing OR invalid token is simply "anonymous visitor";
 * anything that actually mutates state still sits behind `authenticate`.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE];

  if (token) {
    try {
      req.user = verifyAuthToken(token);
    } catch {
      // Expired/garbage token → treat as anonymous rather than 401, so a
      // stale token never hides a public page.
    }
  }

  next();
}
