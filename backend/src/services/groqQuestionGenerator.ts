/**
 * Pure Groq caller — no DB, no env side effects, just "give it a technology
 * and difficulty, get back parsed questions." Shared by the standalone
 * `scripts/generateQuestions.ts` (separate process, POSTs to the webhook)
 * and `services/autoRefillService.ts` (in-process, writes to the DB directly).
 */

const GROQ_MODEL = 'llama-3.3-70b-versatile';

export type Difficulty = 'junior' | 'middle' | 'senior';

export interface GeneratedQuestion {
  technology: string;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctAnswer: number;
}

/**
 * `response_format: { type: "json_object" }` makes Groq return raw JSON with
 * no markdown fences. It requires the object shape (not a bare array), so we
 * ask for `{"questions": [...]}` and unwrap it; fences are still stripped
 * defensively below in case that ever changes.
 */
export async function generateQuestions(
  apiKey: string,
  technology: string,
  difficulty: Difficulty,
  count: number,
): Promise<GeneratedQuestion[]> {
  const prompt = `Generate ${count} unique multiple-choice interview questions for the technology "${technology}" at difficulty "${difficulty}".

Return JSON matching exactly this shape:
{"questions":[{"technology":"${technology}","difficulty":"${difficulty}","text":"question text","options":["A","B","C","D"],"correctAnswer":0}]}

Rules:
- "options" must have between 2 and 6 items
- "correctAnswer" is the 0-based index into "options" of the correct choice
- Questions must be technically accurate and non-trivial`;

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
  return questions as GeneratedQuestion[];
}
