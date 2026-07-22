import { z } from 'zod';
import { DIRECTIONS } from '@/config/catalog';

/** MongoDB ObjectId (24-char hex) guard. */
const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id format');

export const startTestSchema = z.object({
  body: z.object({
    direction: z.enum(DIRECTIONS as [string, ...string[]]),
    technologies: z.array(z.string().trim().min(1)).min(1).max(30),
    locale: z.enum(['en', 'ru', 'uz']).optional(),
  }),
});

export const submitTestSchema = z.object({
  body: z.object({
    sessionId: objectId,
    answers: z
      .array(
        z.object({
          questionId: objectId,
          userAnswer: z.number().int().min(0),
        }),
      )
      .max(200),
  }),
});

export const tabSwitchSchema = z.object({
  body: z.object({
    sessionId: objectId,
  }),
});

export type StartTestBody = z.infer<typeof startTestSchema>['body'];
export type SubmitTestBody = z.infer<typeof submitTestSchema>['body'];
