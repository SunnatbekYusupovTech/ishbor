import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { importQuestions as importQuestionsIntoBank } from '@/services/questionImportService';
import type { importedQuestionSchema } from '@/validation/webhookSchemas';
import type { z } from 'zod';

type ImportedQuestion = z.infer<typeof importedQuestionSchema>;

/**
 * POST /api/webhooks/questions
 * Bulk-imports AI-generated questions (external automation, or
 * `scripts/generateQuestions.ts`) into the question bank. Body already
 * validated/parsed by `importQuestionsSchema`. Duplicate-text detection and
 * the `category` mirroring convention live in `questionImportService`.
 */
export const importQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { questions } = req.body as { questions: ImportedQuestion[] };

  const result = await importQuestionsIntoBank(questions);

  res.status(201).json({ success: true, data: result });
});
