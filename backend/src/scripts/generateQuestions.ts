import dotenv from 'dotenv';
import cron from 'node-cron';
import { ALL_TECHNOLOGIES } from '@/config/catalog';
import { logger } from '@/utils/logger';
import { generateQuestions, type Difficulty, type GeneratedQuestion } from '@/services/groqQuestionGenerator';

dotenv.config();

/**
 * Standalone, self-scheduling question generator. Replaces the Make.com
 * scenario: calls Groq's free chat-completions API (via
 * `services/groqQuestionGenerator`) and posts the result to
 * `POST /api/webhooks/questions`. Runs continuously — `node-cron` re-fires on
 * the configured schedule for as long as the process stays up (Railway/PM2/etc).
 * Deliberately decoupled from the DB (goes through the webhook, not a direct
 * Mongoose write) so it can run as an entirely separate deployed process.
 *
 * Groq (not Gemini): free tier, no billing setup required, generous rate
 * limits, OpenAI-compatible endpoint. Get a key at console.groq.com.
 *
 * Required env vars: GROQ_API_KEY, QUESTION_IMPORT_SECRET, WEBHOOK_URL.
 * Optional: GENERATE_CRON (default: once a day at 03:00), GENERATE_TECHNOLOGIES
 * (comma-separated, default: all), GENERATE_DIFFICULTIES (default: all three),
 * GENERATE_QUESTIONS_PER_CALL (default: 5), RUN_ONCE=true (generate once and exit,
 * for local testing — bypasses the cron schedule entirely).
 */

const DIFFICULTIES: Difficulty[] = ['junior', 'middle', 'senior'];

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`[generateQuestions] Missing required env var: ${key}`);
  return value;
}

const groqApiKey = requiredEnv('GROQ_API_KEY');
const webhookSecret = requiredEnv('QUESTION_IMPORT_SECRET');
const webhookUrl = requiredEnv('WEBHOOK_URL'); // e.g. https://backend-production-c269.up.railway.app/api/webhooks/questions

const technologies = (process.env.GENERATE_TECHNOLOGIES?.split(',').map((t) => t.trim()) ??
  ALL_TECHNOLOGIES) as string[];
const difficulties = (process.env.GENERATE_DIFFICULTIES?.split(',').map((d) => d.trim()) ??
  DIFFICULTIES) as Difficulty[];
const questionsPerCall = Number(process.env.GENERATE_QUESTIONS_PER_CALL ?? 5);
const cronSchedule = process.env.GENERATE_CRON ?? '0 3 * * *'; // daily at 03:00 server time

async function postToWebhook(questions: GeneratedQuestion[]): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': webhookSecret },
    body: JSON.stringify({ questions }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Webhook rejected batch (${res.status}): ${JSON.stringify(body)}`);
  }
  logger.info('Webhook accepted batch', body);
}

async function runOnce(): Promise<void> {
  logger.info(`Starting question generation run: ${technologies.length} technologies × ${difficulties.length} difficulties`);

  for (const technology of technologies) {
    for (const difficulty of difficulties) {
      try {
        const questions = await generateQuestions(groqApiKey, technology, difficulty, questionsPerCall);
        await postToWebhook(questions);
        logger.info(`Generated + imported ${questions.length} questions`, { technology, difficulty });
      } catch (err) {
        // One bad (technology, difficulty) pair shouldn't abort the whole run.
        logger.error('Generation failed for pair', { technology, difficulty, error: (err as Error).message });
      }
    }
  }

  logger.info('Question generation run complete.');
}

if (process.env.RUN_ONCE === 'true') {
  // No explicit `process.exit(0)` on success: fetch's underlying undici
  // connection pool can still be closing its handles at that instant, and
  // forcing exit mid-close crashes libuv on Windows. Let the run complete
  // and the process exit naturally once nothing keeps the event loop alive.
  runOnce().catch((err) => {
    logger.error('Fatal error during one-off run', err);
    process.exit(1);
  });
} else {
  logger.info(`Question generator scheduled: "${cronSchedule}"`);
  cron.schedule(cronSchedule, () => {
    runOnce().catch((err) => logger.error('Fatal error during scheduled run', err));
  });
}
