/**
 * Pure Groq caller — no DB, no env side effects, just "give it a technology
 * and difficulty, get back parsed questions." Shared by the standalone
 * `scripts/generateQuestions.ts` (separate process, POSTs to the webhook)
 * and `services/autoRefillService.ts` (in-process, writes to the DB directly).
 */

const GROQ_MODEL = 'llama-3.3-70b-versatile';

export type Difficulty = 'junior' | 'middle' | 'senior';

export interface LocalizedContent {
  text: string;
  options?: string[];
}

export interface GeneratedQuestion {
  technology: string;
  difficulty: Difficulty;
  type: 'multiple-choice' | 'open-ended';
  /** Canonical (English) text — scoring and `correctAnswer` are always keyed to this order. */
  text: string;
  options?: string[];
  correctAnswer?: number;
  idealAnswer?: string; // AI's ideal answer for open-ended validation
  /** Same question/options in ru + uz, same order/count as `options` (so shuffling stays index-safe). */
  translations: {
    ru: LocalizedContent;
    uz: LocalizedContent;
  };
}

/**
 * `response_format: { type: "json_object" }` makes Groq return raw JSON with
 * no markdown fences. It requires the object shape (not a bare array), so we
 * ask for `{"questions": [...]}` and unwrap it; fences are still stripped
 * defensively below in case that ever changes.
 *
 * Requests EN + RU + UZ in a single call (rather than three separate calls)
 * so the translations are guaranteed to match the canonical question 1:1 —
 * same option count and order, just translated — instead of risking drift
 * from independently-generated translation passes.
 */
export async function generateQuestions(
  apiKey: string,
  technology: string,
  difficulty: Difficulty,
  count: number,
): Promise<GeneratedQuestion[]> {
  const prompt = `Generate ${count} unique interview questions for the technology "${technology}" at difficulty "${difficulty}".
IMPORTANT: Generate a mix of questions. Make 1 of them an "open-ended" practical task (e.g. write code, architect a solution, or explain deeply). Make the rest "multiple-choice" questions.

Return JSON matching exactly this shape:
{"questions":[
  {
    "technology":"${technology}", "difficulty":"${difficulty}", "type":"multiple-choice",
    "text":"question text (English)", "options":["A","B","C","D"], "correctAnswer":0,
    "translations":{"ru":{"text":"вопрос на русском","options":["А","Б","В","Г"]},"uz":{"text":"savol o'zbek tilida","options":["A","B","C","D"]}}
  },
  {
    "technology":"${technology}", "difficulty":"${difficulty}", "type":"open-ended",
    "text":"Write a small script or explain... (English)", "idealAnswer":"A clear criteria/answer for AI to evaluate user's input against",
    "translations":{"ru":{"text":"Напишите скрипт..."},"uz":{"text":"Skript yozing..."}}
  }
]}

Rules:
- For "multiple-choice" questions: "options" must have between 2 and 6 items, and "correctAnswer" is the 0-based index. All options must be similar in length and style. Vary correct answer indices.
- For "open-ended" questions: "idealAnswer" must be provided in English. Omit "options" and "correctAnswer".
- "translations.ru" and "translations.uz" must be faithful translations. For multiple-choice, translated options must exactly match the canonical options count and order.
- Technical terms may stay in English. Uzbek translations use Latin script.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Groq response had no message content');

  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(cleaned) as unknown;
  const questions = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) throw new Error('Groq output had no "questions" array');

  // Defensive: drop any question whose translations don't line up with the
  // canonical option count — a mismatched translation would silently break
  // per-candidate option shuffling (index N no longer means the same thing
  // across languages) or leave the localized side empty.
  return (questions as GeneratedQuestion[]).filter((q) => {
    const ru = q.translations?.ru;
    const uz = q.translations?.uz;
    if (q.type === 'open-ended') {
      return q.idealAnswer && ru?.text && uz?.text;
    }
    return (
      q.type === 'multiple-choice' &&
      Array.isArray(q.options) &&
      ru?.text &&
      Array.isArray(ru.options) &&
      ru.options.length === q.options.length &&
      uz?.text &&
      Array.isArray(uz.options) &&
      uz.options.length === q.options.length
    );
  });
}

/**
 * Evaluates an open-ended answer from the candidate against the AI's ideal criteria.
 * Returns a float between 0.0 and 1.0 (0 = completely wrong, 1 = perfect).
 */
export async function evaluateOpenEndedAnswer(
  apiKey: string,
  questionText: string,
  idealAnswer: string,
  userAnswer: string,
): Promise<number> {
  const prompt = `Evaluate the candidate's answer to the following practical task.
Task: ${questionText}
Ideal Criteria/Answer: ${idealAnswer}
Candidate's Answer: ${userAnswer}

Return JSON matching exactly this shape: {"score": 0.0}
Where "score" is a number from 0.0 to 1.0. 0.0 means completely wrong, 0.5 means partially correct, and 1.0 means perfectly correct according to the criteria.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq eval API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return 0;

  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(cleaned) as { score?: number };
  
  const score = typeof parsed.score === 'number' ? parsed.score : 0;
  return Math.max(0, Math.min(1, score));
}
