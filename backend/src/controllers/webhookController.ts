import type { Request, Response } from 'express';
import { Question } from '@/models/Question';
import { asyncHandler } from '@/utils/asyncHandler';
import type { importedQuestionSchema } from '@/validation/webhookSchemas';
import type { z } from 'zod';

type ImportedQuestion = z.infer<typeof importedQuestionSchema>;

/**
 * POST /api/webhooks/questions
 * Bulk-imports AI-generated questions (Make.com → Gemini → here) into the
 * question bank. Body already validated/parsed by `importQuestionsSchema`.
 */
export const importQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { questions } = req.body as { questions: ImportedQuestion[] };

  // `category` mirrors `technology` (same convention as `scripts/seed.ts`).
  const inserted = await Question.insertMany(
    questions.map((q) => ({ ...q, category: q.technology })),
    { ordered: false },
  );

  res.status(201).json({
    success: true,
    data: { insertedCount: inserted.length },
  });
});
