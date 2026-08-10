import { z } from 'zod';
import { APPLICATION_STATUSES } from '@/models/Application';

/**
 * All schemas follow the project's `validate` middleware convention: the
 * parsed object is `{ body, query, params }`, so each schema is a wrapper
 * around its `body` shape (see `middleware/validate.ts`).
 */

/** POST /api/chat/conversations/:id/messages */
export const sendMessageSchema = z.object({
  body: z.object({
    text: z.string().trim().min(1, 'Message cannot be empty.').max(2000, 'Message is too long.'),
  }),
});

/** POST /api/chat/conversations — open a thread with another user. */
export const startConversationSchema = z.object({
  body: z.object({
    userId: z.string().trim().min(1),
    jobId: z.string().trim().optional(),
  }),
});

/** POST /api/jobs/:id/apply — the request itself. */
export const applySchema = z.object({
  body: z.object({
    message: z
      .string()
      .trim()
      .max(1000, 'Cover message is too long.')
      .optional(),
  }),
});

/** PATCH /api/applications/:id — employer decides on a request. */
export const updateApplicationSchema = z.object({
  body: z.object({
    status: z.enum(APPLICATION_STATUSES),
  }),
});
