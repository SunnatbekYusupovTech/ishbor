import { DIFFICULTY_WEIGHTS, type IQuestion } from '@/models/Question';
import type { VerificationLevel } from '@/models/User';
import type { ISessionAnswer } from '@/models/Session';

/** A technology is "passed" when the candidate answers at least this ratio of
 *  its questions correctly (≥ 80% → 4 of 5). */
export const TECH_PASS_RATIO = 0.8;

export interface TechResult {
  technology: string;
  correct: number;
  total: number;
  passed: boolean;
}

export interface ScoreResult {
  score: number; // raw weighted points earned
  maxScore: number; // maximum attainable weighted points
  percentage: number; // 0–100, rounded to 2 decimals (kept for display/leaderboard)
  awardedLevel: VerificationLevel;
  correctCount: number;
  totalQuestions: number;
  /** Number of technologies the candidate passed. */
  passedCount: number;
  /** Per-technology breakdown. */
  technologies: TechResult[];
}

/**
 * Maps the number of PASSED technologies onto a verification level.
 *   0        -> none (fail)
 *   1        -> junior
 *   2–3      -> middle
 *   4+       -> senior
 */
export function levelFromPassedCount(passed: number): VerificationLevel {
  if (passed >= 4) return 'senior';
  if (passed >= 2) return 'middle';
  if (passed >= 1) return 'junior';
  return 'none';
}

/** Minimum correct answers needed to pass a technology of `total` questions. */
export function techPassThreshold(total: number): number {
  return Math.ceil(total * TECH_PASS_RATIO);
}

/**
 * THE source of truth for scoring. Runs only on the server with the full
 * question set (including the hidden `correctAnswer`). The client never
 * participates in this computation.
 *
 * The awarded level is derived from how many TECHNOLOGIES the candidate
 * passed (≥ TECH_PASS_RATIO correct within each technology's questions).
 *
 * @param questions Questions served for the session, each WITH `correctAnswer`.
 * @param answers   The candidate's submitted answers.
 */
export function calculateScore(questions: IQuestion[], answers: ISessionAnswer[]): ScoreResult {
  // Index submitted answers by questionId for O(1) lookup.
  const answerByQuestion = new Map<string, number>();
  for (const a of answers) {
    answerByQuestion.set(a.questionId.toString(), a.userAnswer);
  }

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;

  // Tally correct/total per technology.
  const byTech = new Map<string, { correct: number; total: number }>();

  for (const question of questions) {
    const weight = DIFFICULTY_WEIGHTS[question.difficulty];
    maxScore += weight;

    const tech = question.technology;
    const bucket = byTech.get(tech) ?? { correct: 0, total: 0 };
    bucket.total += 1;

    const submitted = answerByQuestion.get(question._id.toString());
    if (submitted !== undefined && submitted === question.correctAnswer) {
      score += weight;
      correctCount += 1;
      bucket.correct += 1;
    }
    byTech.set(tech, bucket);
  }

  const technologies: TechResult[] = [];
  let passedCount = 0;
  for (const [technology, { correct, total }] of byTech) {
    const passed = total > 0 && correct >= techPassThreshold(total);
    if (passed) passedCount += 1;
    technologies.push({ technology, correct, total, passed });
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10_000) / 100 : 0;

  return {
    score,
    maxScore,
    percentage,
    awardedLevel: levelFromPassedCount(passedCount),
    correctCount,
    totalQuestions: questions.length,
    passedCount,
    technologies,
  };
}
