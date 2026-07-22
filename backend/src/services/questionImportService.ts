import { Question } from '@/models/Question';
import { logger } from '@/utils/logger';
import type { Difficulty } from '@/services/groqQuestionGenerator';

export interface ImportableQuestion {
  technology: string;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctAnswer: number;
}

/** Normalises text for duplicate comparison — case/whitespace differences don't count as "new". */
function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Inserts questions, skipping any whose text already exists in the bank
 * (case/whitespace-insensitive) — a candidate seeing near-identical wording
 * twice isn't a "new" question. Used by both the webhook (external
 * automation) and the auto-refill service (in-process, triggered when a
 * technology's unseen pool runs low).
 */
export async function importQuestions(questions: ImportableQuestion[]): Promise<{
  insertedCount: number;
  skippedDuplicates: number;
}> {
  if (questions.length === 0) return { insertedCount: 0, skippedDuplicates: 0 };

  const normalizedIncoming = questions.map((q) => normalize(q.text));

  // Existing questions whose normalized text collides with anything in this batch.
  const existing = await Question.find({ technology: { $in: questions.map((q) => q.technology) } })
    .select('text')
    .lean();
  const existingNormalized = new Set(existing.map((e) => normalize(e.text)));

  // Within-batch duplicates count too (Groq occasionally repeats itself).
  const seen = new Set<string>();
  const toInsert: ImportableQuestion[] = [];
  questions.forEach((q, i) => {
    const norm = normalizedIncoming[i];
    if (existingNormalized.has(norm) || seen.has(norm)) return;
    seen.add(norm);
    toInsert.push(q);
  });

  const skippedDuplicates = questions.length - toInsert.length;
  if (toInsert.length === 0) {
    logger.info('importQuestions: all candidates were duplicates', { skippedDuplicates });
    return { insertedCount: 0, skippedDuplicates };
  }

  // `category` mirrors `technology` (same convention as `scripts/seed.ts`).
  const inserted = await Question.insertMany(
    toInsert.map((q) => ({ ...q, category: q.technology })),
    { ordered: false },
  );

  return { insertedCount: inserted.length, skippedDuplicates };
}
