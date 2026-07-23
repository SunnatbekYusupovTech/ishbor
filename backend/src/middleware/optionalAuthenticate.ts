import type { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '@/utils/jwt';

/**
 * Fills `req.user` when a valid Bearer token is present and does nothing
 * otherwise — never throws.
 *
 * For endpoints that are public but render differently for the owner (the
 * freelancer profile: anyone may read it, only the owner sees the add/edit/
 * delete controls). A missing OR invalid token is simply "anonymous visitor";
 * anything that actually mutates state still sits behind `authenticate`.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAuthToken(header.slice('Bearer '.length).trim());
    } catch {
      // Expired/garbage token → treat as anonymous rather than 401, so a
      // stale token never hides a public page.
    }
  }

  next();
}
