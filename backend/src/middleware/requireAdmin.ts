import type { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * Chain AFTER `authenticate`. The JWT payload only carries `userId`/`email`
 * (see `utils/jwt.ts#AuthTokenPayload`) — deliberately no `role`, so a role
 * change (or revocation) takes effect immediately instead of waiting out an
 * already-issued token's lifetime. That means this always re-checks the
 * database, trading one extra query for that guarantee.
 */
export const requireAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const user = await User.findById(req.user!.userId);
    if (!user || user.role !== 'admin') {
      throw ApiError.forbidden('Admin access required.');
    }
    next();
  },
);
