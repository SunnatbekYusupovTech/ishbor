import { z } from 'zod';
import { ALL_TECHNOLOGIES } from '@/config/catalog';

const localizedContentSchema = z.object({
  text: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).min(2).max(6),
});

/**
 * Shape produced by external question-generation automation (the AI
 * generator / webhook caller) for each imported question. Mirrors
 * `SeedQuestion` (`data/questions.ts`) plus an optional ru/uz `translations`
 * block (mirrors `Question.translations`) so imported questions are
 * indistinguishable from hand-written, pre-translated ones once inserted.
 */
export const importedQuestionSchema = z
  .object({
    technology: z.enum(ALL_TECHNOLOGIES as [string, ...string[]]),
    difficulty: z.enum(['junior', 'middle', 'senior']),
    text: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2).max(6),
    correctAnswer: z.number().int().min(0),
    translations: z
      .object({
        ru: localizedContentSchema.optional(),
        uz: localizedContentSchema.optional(),
      })
      .optional(),
  })
  .refine((q) => q.correctAnswer < q.options.length, {
    message: 'correctAnswer must be a valid index into options.',
    path: ['correctAnswer'],
  })
  .refine(
    (q) =>
      (q.translations?.ru?.options.length ?? q.options.length) === q.options.length &&
      (q.translations?.uz?.options.length ?? q.options.length) === q.options.length,
    {
      message: 'translations.ru/uz options must have the same length as the canonical options.',
      path: ['translations'],
    },
  );

export const importQuestionsSchema = z.object({
  body: z.object({
    questions: z.array(importedQuestionSchema).min(1).max(200),
  }),
});
