import { Question } from '@/models/Question';
import { generateQuestions, type Difficulty } from '@/services/groqQuestionGenerator';
import { importQuestions } from '@/services/questionImportService';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

const DIFFICULTIES: Difficulty[] = ['junior', 'middle', 'senior'];

/**
 * In-memory debounce so a burst of concurrent `startTest` calls for the same
 * low-stock technology doesn't fire a dozen redundant Groq batches — one
 * refill per technology per `AUTO_REFILL_COOLDOWN_MINUTES` is enough. Reset
 * on process restart; that's fine, worst case is one extra batch after a
 * deploy.
 */
const lastTriggeredAt = new Map<string, number>();

/**
 * Fire-and-forget: if a technology's total question pool has fallen below
 * `AUTO_REFILL_THRESHOLD`, kick off a background Groq batch (all three
 * difficulties) and import it directly into the bank. Never awaited by the
 * caller — `testController.startTest` must not block a candidate's request
 * on an AI API call. Silently no-ops if `GROQ_API_KEY` isn't configured.
 */
export function maybeRefill(technology: string): void {
  if (!env.groqApiKey) return;

  const cooldownMs = env.autoRefillCooldownMinutes * 60 * 1000;
  const last = lastTriggeredAt.get(technology);
  if (last && Date.now() - last < cooldownMs) return;

  void (async () => {
    const count = await Question.countDocuments({ technology });
    if (count >= env.autoRefillThreshold) return;

    lastTriggeredAt.set(technology, Date.now());
    logger.info('Auto-refill triggered', { technology, currentCount: count, threshold: env.autoRefillThreshold });

    for (const difficulty of DIFFICULTIES) {
      try {
        const questions = await generateQuestions(env.groqApiKey!, technology, difficulty, 5);
        const result = await importQuestions(questions as any);
        logger.info('Auto-refill batch imported', { technology, difficulty, ...result });
      } catch (err) {
        logger.error('Auto-refill batch failed', { technology, difficulty, error: (err as Error).message });
      }
    }
  })().catch((err) => logger.error('Auto-refill run failed', { technology, error: (err as Error).message }));
}

/**
 * Synchronous refill used when a requested custom technology has 0 or too few questions.
 * This blocks the client request while Groq generates the required number of questions.
 */
export async function forceRefillAndWait(technology: string, difficulty: Difficulty = 'middle', countNeeded: number = 5): Promise<void> {
  if (!env.groqApiKey) throw new Error('AI Generation unavailable (GROQ_API_KEY missing).');

  // We'll just generate one batch of the default difficulty to get the user started quickly.
  // The fire-and-forget `maybeRefill` will eventually fill out the other difficulties.
  try {
    logger.info(`Forcing real-time generation of ${countNeeded} questions for custom stack: ${technology}`);
    const questions = await generateQuestions(env.groqApiKey, technology, difficulty, countNeeded);
    const result = await importQuestions(questions as any);
    logger.info('Forced real-time generation imported', { technology, ...result });
  } catch (err) {
    logger.error('Forced real-time generation failed', { technology, error: (err as Error).message });
    throw err;
  }
}
