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
  options: string[];
}

export interface GeneratedQuestion {
  technology: string;
  difficulty: Difficulty;
  /** Canonical (English) text — scoring and `correctAnswer` are always keyed to this order. */
  text: string;
  options: string[];
  correctAnswer: number;
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
  const prompt = `Generate ${count} unique multiple-choice interview questions for the technology "${technology}" at difficulty "${difficulty}".

Return JSON matching exactly this shape:
{"questions":[{"technology":"${technology}","difficulty":"${difficulty}","text":"question text (English)","options":["A","B","C","D"],"correctAnswer":0,"translations":{"ru":{"text":"вопрос на русском","options":["А","Б","В","Г"]},"uz":{"text":"savol o'zbek tilida","options":["А","Б","В","Г"]}}}]}

Rules:
- "options" must have between 2 and 6 items
- "correctAnswer" is the 0-based index into "options" of the correct choice
- Questions must be technically accurate and non-trivial
- CRITICAL: all options must be similar in length, phrasing style, and level of
  detail. Never make the correct option noticeably longer, more specific, or
  more "textbook-sounding" than the distractors — that makes it guessable
  without knowing the answer. Wrong options should be equally plausible and
  concise, not obviously weaker or vaguer.
- Vary which index (0, 1, 2, 3...) holds the correct answer across questions —
  do not default to always putting it first or last.
- "translations.ru" and "translations.uz" must be faithful, natural
  translations of the SAME question and SAME options in the SAME order —
  option N in a translation must correspond to option N in "options". Do not
  add, remove, reorder, or paraphrase-shift options between languages.
  Technical terms (API names, keywords, code syntax) may stay in English
  within the translated text where that's how developers actually say them
  (e.g. "useState" stays "useState" in Uzbek/Russian text).
- Uzbek translations use Latin script.`;

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
    return (
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
