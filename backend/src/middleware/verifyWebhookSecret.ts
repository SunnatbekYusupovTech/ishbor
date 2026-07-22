import type { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';
import { ApiError } from '@/utils/ApiError';

/**
 * Guards webhook routes hit by external automations (e.g. Make.com) that
 * can't carry a user JWT. Checks a shared secret sent via `X-Webhook-Secret`
 * instead. If `QUESTION_IMPORT_SECRET` isn't configured, the route is
 * disabled rather than silently open.
 */
export const verifyWebhookSecret = (req: Request, _res: Response, next: NextFunction) => {
  if (!env.questionImportSecret) {
    throw new ApiError(503, 'Question import webhook is not configured.');
  }
  if (req.header('x-webhook-secret') !== env.questionImportSecret) {
    throw ApiError.unauthorized('Invalid webhook secret.');
  }
  next();
};
