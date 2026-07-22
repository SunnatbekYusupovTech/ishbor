import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Question, type IQuestion } from '@/models/Question';
import { Session } from '@/models/Session';
import { User } from '@/models/User';
import { calculateScore } from '@/services/scoringService';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { shuffledIndices, applyOrder } from '@/utils/shuffle';
import { maybeRefill } from '@/services/autoRefillService';
import {
  DIRECTIONS,
  DIRECTION_TECHNOLOGIES,
  QUESTIONS_PER_TECH,
  isTechnologyInDirection,
  type Direction,
} from '@/config/catalog';

/** Seconds allotted per question on the client — mirrored here to size the
 *  server-side deadline (with a buffer) so long selections never expire early. */
const PER_QUESTION_SECONDS = 20;
const DEADLINE_BUFFER_MS = 120_000;
/**
 * Absolute floor on how fast a human could plausibly read + answer one
 * question. Well under the real `PER_QUESTION_SECONDS` budget (20s) — this
 * isn't meant to catch a fast test-taker, only a scripted submission that
 * answers everything in a couple of seconds flat. Informational only, see
 * `ISession.suspiciouslyFast`.
 */
const MIN_SECONDS_PER_QUESTION = 3;

/** Locales that carry translated question content ('en' is the canonical source). */
const SUPPORTED_LOCALES = ['en', 'ru', 'uz'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function resolveLocale(raw: unknown): Locale {
  const value = typeof raw === 'string' ? raw.slice(0, 2).toLowerCase() : '';
  return (SUPPORTED_LOCALES as readonly string[]).includes(value) ? (value as Locale) : 'en';
}

/**
 * Return a question's `text`/`options` in the requested locale, falling back to
 * the canonical English content when a translation is missing. Options stay in
 * canonical order — the caller applies the per-candidate shuffle afterwards, so
 * index-based scoring is unaffected regardless of language.
 */
function localizeContent(q: IQuestion, locale: Locale): { text: string; options: string[] } {
  if (locale === 'en') return { text: q.text, options: q.options };
  const localized = q.translations?.[locale];
  if (localized?.text && Array.isArray(localized.options) && localized.options.length === q.options.length) {
    return { text: localized.text, options: localized.options };
  }
  return { text: q.text, options: q.options };
}

/**
 * Shape of a question as sent to the client — deliberately WITHOUT
 * `correctAnswer`. The client can render and answer but can never derive
 * the key.
 */
interface PublicQuestion {
  _id: string;
  text: string;
  options: string[];
  difficulty: IQuestion['difficulty'];
  category: string;
}

function toPublicQuestion(q: IQuestion): PublicQuestion {
  return {
    _id: q._id.toString(),
    text: q.text,
    options: q.options,
    difficulty: q.difficulty,
    category: q.category,
  };
}

/**
 * GET /api/test/catalog
 * PUBLIC — the assessment taxonomy (directions → technologies) with the number
 * of available questions per technology, so the client can render the picker.
 */
export const getCatalog = asyncHandler(async (_req: Request, res: Response) => {
  const counts = await Question.aggregate<{ _id: string; count: number }>([
    { $group: { _id: '$technology', count: { $sum: 1 } } },
  ]);
  const perTech: Record<string, number> = {};
  for (const c of counts) perTech[c._id] = c.count;

  res.status(200).json({
    success: true,
    data: {
      directions: DIRECTION_TECHNOLOGIES,
      questionsPerTech: QUESTIONS_PER_TECH,
      perTech,
    },
  });
});

/**
 * POST /api/test/start
 * Initialises a Session with a server-authoritative startTime + deadline and
 * returns a sanitised question set.
 */
export const startTest = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { direction, technologies, locale: rawLocale } = req.body as {
    direction: Direction;
    technologies: string[];
    locale?: string;
  };
  // Prefer an explicit body locale; fall back to the Accept-Language header.
  const locale = resolveLocale(rawLocale ?? req.headers['accept-language']);

  // Validate the direction + that every chosen technology belongs to it.
  if (!DIRECTIONS.includes(direction)) {
    throw ApiError.badRequest('Invalid direction.');
  }
  const selected = Array.from(new Set(technologies));
  if (selected.length === 0) {
    throw ApiError.badRequest('Select at least one technology.');
  }
  for (const tech of selected) {
    if (!isTechnologyInDirection(direction, tech)) {
      throw ApiError.badRequest(`Technology "${tech}" is not part of ${direction}.`);
    }
  }

  // Guard: only one active session per user.
  const existing = await Session.findOne({ userId, status: 'in-progress' });
  if (existing) {
    throw ApiError.conflict('You already have an assessment in progress.');
  }

  // Guard: per-account cooldown since the last finished attempt. This is the
  // account-keyed complement to `testRateLimiter` (IP-keyed) — it closes the
  // gap where a script starts+submits from many IPs to probe the scored
  // `percentage` as an oracle for the hidden answer key, or otherwise farms
  // attempts faster than a human ever would. A low-scoring last attempt gets
  // a longer cooldown (`testLowScoreCooldownMultiplier`×) than a normal one —
  // discourages rapid low-effort re-guessing more than a single flat duration.
  const lastFinished = await Session.findOne({ userId, endTime: { $exists: true } })
    .sort({ endTime: -1 })
    .select('endTime percentage');
  if (lastFinished?.endTime) {
    const wasLowScore =
      lastFinished.percentage != null && lastFinished.percentage < env.testLowScoreThreshold;
    const cooldownMinutes = wasLowScore
      ? env.testAttemptCooldownMinutes * env.testLowScoreCooldownMultiplier
      : env.testAttemptCooldownMinutes;
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const elapsedMs = Date.now() - lastFinished.endTime.getTime();
    if (elapsedMs < cooldownMs) {
      const waitMinutes = Math.ceil((cooldownMs - elapsedMs) / 60_000);
      throw ApiError.tooManyRequests(
        `Please wait ${waitMinutes} more minute(s) before starting another attempt.`,
      );
    }
  }

  // Questions this candidate has already been served in any past session —
  // excluded below so repeat attempts see fresh material instead of
  // memorisable repeats. `$sample` never includes `correctAnswer` (it is
  // `select:false`), so the key never even enters this result set.
  const seenQuestionIds = await Session.find({ userId }).distinct('questionIds');

  const perTech = await Promise.all(
    selected.map(async (tech) => {
      const unseen = await Question.aggregate<IQuestion>([
        { $match: { technology: tech, _id: { $nin: seenQuestionIds } } },
        { $sample: { size: QUESTIONS_PER_TECH } },
        { $project: { correctAnswer: 0 } },
      ]);

      // The technology's pool is running low on this trigger regardless of
      // whether we had to top up below — check the total, not just unseen.
      maybeRefill(tech);

      if (unseen.length >= QUESTIONS_PER_TECH) return unseen;

      // Not enough unseen questions left (candidate has exhausted the pool for
      // this technology) — top up with previously-seen ones rather than
      // serving a short test. Better than nothing; the auto-refill triggered
      // above grows the pool for next time.
      const shortBy = QUESTIONS_PER_TECH - unseen.length;
      const alreadyPicked = unseen.map((q) => q._id);
      const topUp = await Question.aggregate<IQuestion>([
        { $match: { technology: tech, _id: { $nin: alreadyPicked } } },
        { $sample: { size: shortBy } },
        { $project: { correctAnswer: 0 } },
      ]);
      return [...unseen, ...topUp];
    }),
  );
  const questions = perTech.flat();

  if (questions.length === 0) {
    throw ApiError.notFound('No questions available for the selected technologies.');
  }

  // Per-candidate option shuffle: build a permutation per question, reorder the
  // options we send, and persist the mapping so we can translate answers back
  // to canonical indices at scoring time.
  const optionOrders = questions.map((q) => ({
    questionId: q._id,
    order: shuffledIndices(q.options.length),
  }));

  const startTime = new Date();
  // Deadline is sized to the per-question budget (+ buffer) so long multi-tech
  // selections never expire before the client finishes.
  const deadline = new Date(
    startTime.getTime() + questions.length * PER_QUESTION_SECONDS * 1000 + DEADLINE_BUFFER_MS,
  );

  const session = await Session.create({
    userId,
    questionIds: questions.map((q) => q._id),
    optionOrders,
    status: 'in-progress',
    startTime,
    deadline,
    answers: [],
    tabSwitchCount: 0,
    startIp: req.ip,
  });

  logger.info(
    `Session ${session._id} started for user ${userId} (${direction}: ${selected.join(', ')} — ${questions.length} questions)`,
  );

  res.status(201).json({
    success: true,
    data: {
      sessionId: session._id.toString(),
      direction,
      technologies: selected,
      startTime: startTime.toISOString(),
      deadline: deadline.toISOString(),
      perQuestionSeconds: PER_QUESTION_SECONDS,
      questions: questions.map((q, i) => {
        const pub = toPublicQuestion(q);
        // Localise first (canonical order), then present options in this
        // candidate's shuffled order. Scoring maps display→canonical by index.
        const { text, options } = localizeContent(q, locale);
        return { ...pub, text, options: applyOrder(options, optionOrders[i].order) };
      }),
    },
  });
});

/**
 * POST /api/test/submit
 * Server RE-CALCULATES the score from the hidden answer key. The client's only
 * contribution is (questionId, userAnswer) pairs; it cannot influence scoring.
 */
export const submitTest = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { sessionId, answers } = req.body as {
    sessionId: string;
    answers: Array<{ questionId: string; userAnswer: number }>;
  };

  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw ApiError.notFound('Session not found.');
  }

  if (session.status !== 'in-progress') {
    throw ApiError.conflict(`Session is already "${session.status}" and cannot be submitted.`);
  }

  // Server-authoritative timing: reject/flag submissions past the deadline.
  const now = new Date();
  const isLate = now.getTime() > session.deadline.getTime();

  // Only accept answers for questions that were actually served in this session.
  const servedIds = new Set(session.questionIds.map((id) => id.toString()));

  // Map questionId -> this session's option permutation (display -> original).
  const orderByQuestion = new Map<string, number[]>();
  for (const o of session.optionOrders) {
    orderByQuestion.set(o.questionId.toString(), o.order);
  }

  // Translate each submitted (displayed) index back to the canonical option
  // index before scoring. Answers referencing out-of-range indices are dropped.
  const sanitizedAnswers = answers
    .filter((a) => servedIds.has(a.questionId))
    .map((a) => {
      const order = orderByQuestion.get(a.questionId);
      const originalIndex =
        order && a.userAnswer >= 0 && a.userAnswer < order.length
          ? order[a.userAnswer]
          : a.userAnswer;
      return {
        questionId: new mongoose.Types.ObjectId(a.questionId),
        userAnswer: originalIndex,
      };
    });

  // Load the served questions WITH the hidden key for scoring only.
  const questions = await Question.find({ _id: { $in: session.questionIds } }).select(
    '+correctAnswer',
  );

  const result = calculateScore(questions, sanitizedAnswers);

  // Informational-only integrity signals for admin review — neither one
  // blocks scoring or the candidate's result (see field docs on `ISession`).
  session.ipMismatch = !!session.startIp && req.ip !== session.startIp;
  const elapsedSeconds = (now.getTime() - session.startTime.getTime()) / 1000;
  session.suspiciouslyFast = elapsedSeconds < session.questionIds.length * MIN_SECONDS_PER_QUESTION;

  session.answers = sanitizedAnswers;
  session.score = result.score;
  session.maxScore = result.maxScore;
  session.percentage = result.percentage;
  session.awardedLevel = result.awardedLevel;
  session.status = isLate ? 'expired' : 'submitted';
  session.endTime = now;
  await session.save();

  // Record the attempt on the user's profile (powers the leaderboard) and,
  // on a clean on-time pass, promote their verification badge. We never
  // downgrade a previously earned badge or a lower best result.
  const user = await User.findById(userId);
  if (user) {
    user.attempts += 1;
    if (!isLate && result.percentage > user.bestPercentage) {
      user.bestPercentage = result.percentage;
      user.bestScore = result.score;
    }
    if (!isLate && result.awardedLevel !== 'none') {
      const rank: Record<string, number> = { none: 0, junior: 1, middle: 2, senior: 3 };
      if (rank[result.awardedLevel] > rank[user.verificationLevel]) {
        user.verificationLevel = result.awardedLevel;
      }
    }
    await user.save();
  }

  logger.info(
    `Session ${session._id} submitted: ${result.percentage}% -> ${result.awardedLevel}${
      isLate ? ' (LATE/expired)' : ''
    }`,
  );

  res.status(200).json({
    success: true,
    data: {
      sessionId: session._id.toString(),
      status: session.status,
      score: result.score,
      maxScore: result.maxScore,
      percentage: result.percentage,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      awardedLevel: result.awardedLevel,
      passedCount: result.passedCount,
      technologies: result.technologies,
      tabSwitchCount: session.tabSwitchCount,
      late: isLate,
    },
  });
});

/**
 * POST /api/test/tab-switch
 * Records an anti-cheat tab/visibility violation. Over the threshold the
 * session is terminated server-side (client can't undo it).
 */
export const recordTabSwitch = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { sessionId } = req.body as { sessionId: string };

  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw ApiError.notFound('Session not found.');
  }
  if (session.status !== 'in-progress') {
    throw ApiError.conflict('Session is no longer active.');
  }

  session.tabSwitchCount += 1;

  let terminated = false;
  if (session.tabSwitchCount > env.maxTabSwitches) {
    session.status = 'terminated';
    session.terminationReason = `Exceeded max tab switches (${env.maxTabSwitches}).`;
    session.endTime = new Date();
    terminated = true;
    logger.warn(`Session ${session._id} TERMINATED: too many tab switches`);
  }

  await session.save();

  res.status(200).json({
    success: true,
    data: {
      tabSwitchCount: session.tabSwitchCount,
      maxTabSwitches: env.maxTabSwitches,
      terminated,
      status: session.status,
    },
  });
});

/**
 * POST /api/test/violation
 * Records a non-tab-switch integrity violation (copy/paste, right-click,
 * devtools, ...). Over `env.maxViolations` the session is terminated
 * server-side, mirroring `recordTabSwitch`.
 */
export const recordViolation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { sessionId, type } = req.body as { sessionId: string; type: string };

  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw ApiError.notFound('Session not found.');
  }
  if (session.status !== 'in-progress') {
    throw ApiError.conflict('Session is no longer active.');
  }

  session.violationCount += 1;

  let terminated = false;
  if (session.violationCount > env.maxViolations) {
    session.status = 'terminated';
    session.terminationReason = `Exceeded max integrity violations (${env.maxViolations}): last was "${type}".`;
    session.endTime = new Date();
    terminated = true;
    logger.warn(`Session ${session._id} TERMINATED: too many violations (last: ${type})`);
  }

  await session.save();

  res.status(200).json({
    success: true,
    data: {
      violationCount: session.violationCount,
      maxViolations: env.maxViolations,
      terminated,
      status: session.status,
    },
  });
});

/**
 * GET /api/test/session/:sessionId
 * Returns the candidate's own session state (no answer key).
 */
export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { sessionId } = req.params;

  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw ApiError.notFound('Session not found.');
  }

  res.status(200).json({
    success: true,
    data: {
      sessionId: session._id.toString(),
      status: session.status,
      startTime: session.startTime.toISOString(),
      deadline: session.deadline.toISOString(),
      tabSwitchCount: session.tabSwitchCount,
      percentage: session.percentage ?? null,
      awardedLevel: session.awardedLevel ?? null,
    },
  });
});
