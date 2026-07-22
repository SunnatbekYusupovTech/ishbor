import { z } from 'zod';
import { ALL_TECHNOLOGIES } from '@/config/catalog';

/**
 * Shape produced by the Make.com Gemini scenario for each generated question.
 * Mirrors `SeedQuestion` (`data/questions.ts`) so imported questions are
 * indistinguishable from hand-written ones once inserted.
 */
export const importedQuestionSchema = z
  .object({
    technology: z.enum(ALL_TECHNOLOGIES as [string, ...string[]]),
    difficulty: z.enum(['junior', 'middle', 'senior']),
    text: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2).max(6),
    correctAnswer: z.number().int().min(0),
  })
  .refine((q) => q.correctAnswer < q.options.length, {
    message: 'correctAnswer must be a valid index into options.',
    path: ['correctAnswer'],
  });

export const importQuestionsSchema = z.object({
  body: z.object({
    questions: z.array(importedQuestionSchema).min(1).max(200),
  }),
});
