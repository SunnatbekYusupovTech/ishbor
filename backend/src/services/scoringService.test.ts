import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { calculateScore, levelFromPassedCount } from '@/services/scoringService';
import type { IQuestion } from '@/models/Question';
import type { ISessionAnswer } from '@/models/Session';

/** Build a minimal question-like object sufficient for scoring. */
function q(
  difficulty: IQuestion['difficulty'],
  correctAnswer: number,
  technology = 'javascript',
): IQuestion {
  return {
    _id: new mongoose.Types.ObjectId(),
    text: 'q',
    options: ['a', 'b', 'c', 'd'],
    correctAnswer,
    difficulty,
    technology,
    category: technology,
  } as unknown as IQuestion;
}

function answer(questionId: mongoose.Types.ObjectId, userAnswer: number): ISessionAnswer {
  return { questionId, userAnswer };
}

/** Five questions of one technology, `correct` of them answered correctly. */
function techBlock(technology: string, correct: number) {
  const questions = Array.from({ length: 5 }, () => q('middle', 0, technology));
  const answers = questions.map((question, i) =>
    answer(question._id, i < correct ? 0 : 1),
  );
  return { questions, answers };
}

describe('levelFromPassedCount', () => {
  it('maps passed-technology count to a level', () => {
    expect(levelFromPassedCount(0)).toBe('none');
    expect(levelFromPassedCount(1)).toBe('junior');
    expect(levelFromPassedCount(2)).toBe('middle');
    expect(levelFromPassedCount(3)).toBe('middle');
    expect(levelFromPassedCount(4)).toBe('senior');
    expect(levelFromPassedCount(9)).toBe('senior');
  });
});

describe('calculateScore — technology passing', () => {
  it('passes a technology at 4/5 correct but not at 3/5', () => {
    const a = techBlock('react', 4); // passed
    const b = techBlock('vue', 3); // not passed
    const result = calculateScore([...a.questions, ...b.questions], [...a.answers, ...b.answers]);

    const react = result.technologies.find((t) => t.technology === 'react')!;
    const vue = result.technologies.find((t) => t.technology === 'vue')!;
    expect(react.passed).toBe(true);
    expect(vue.passed).toBe(false);
    expect(result.passedCount).toBe(1);
    expect(result.awardedLevel).toBe('junior');
  });

  it('awards middle for 2–3 passed technologies', () => {
    const blocks = ['react', 'vue', 'css'].map((t) => techBlock(t, 5));
    const questions = blocks.flatMap((b) => b.questions);
    const answers = blocks.flatMap((b) => b.answers);
    const result = calculateScore(questions, answers);
    expect(result.passedCount).toBe(3);
    expect(result.awardedLevel).toBe('middle');
  });

  it('awards senior for 4+ passed technologies', () => {
    const blocks = ['react', 'vue', 'css', 'html'].map((t) => techBlock(t, 4));
    const questions = blocks.flatMap((b) => b.questions);
    const answers = blocks.flatMap((b) => b.answers);
    const result = calculateScore(questions, answers);
    expect(result.passedCount).toBe(4);
    expect(result.awardedLevel).toBe('senior');
  });

  it('awards none when no technology is passed', () => {
    const a = techBlock('react', 2);
    const result = calculateScore(a.questions, a.answers);
    expect(result.passedCount).toBe(0);
    expect(result.awardedLevel).toBe('none');
  });
});

describe('calculateScore — weighting & edges', () => {
  it('applies weighted points per difficulty', () => {
    const junior = q('junior', 0); // weight 1
    const middle = q('middle', 1); // weight 2
    const senior = q('senior', 2); // weight 3
    const questions = [junior, middle, senior];

    const answers = [
      answer(junior._id, 0), // correct  -> +1
      answer(middle._id, 1), // correct  -> +2
      answer(senior._id, 0), // wrong    -> +0
    ];

    const result = calculateScore(questions, answers);
    expect(result.maxScore).toBe(6);
    expect(result.score).toBe(3);
    expect(result.correctCount).toBe(2);
    expect(result.percentage).toBe(50);
  });

  it('ignores unanswered questions', () => {
    const j = q('junior', 0);
    const result = calculateScore([j], []);
    expect(result.score).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('does not count answers for questions not in the set', () => {
    const j = q('junior', 0);
    const stray = answer(new mongoose.Types.ObjectId(), 0);
    const result = calculateScore([j], [stray]);
    expect(result.score).toBe(0);
  });

  it('handles an empty question set without dividing by zero', () => {
    const result = calculateScore([], []);
    expect(result.maxScore).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.awardedLevel).toBe('none');
    expect(result.passedCount).toBe(0);
  });
});
