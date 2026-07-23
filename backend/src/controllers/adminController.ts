import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { User, TIERS, type Tier } from '@/models/User';
import { Job } from '@/models/Job';
import { Session } from '@/models/Session';
import { Question } from '@/models/Question';
import { DIRECTIONS, type Direction } from '@/config/catalog';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

// ─── Sardor's Violations Endpoint ───────────────────────────────────────────

/**
 * GET /api/admin/violations
 * ADMIN ONLY. Anti-cheat integrity feed for Hidoyatov's admin dashboard.
 *
 * PROPOSED response shape — not yet confirmed with Hidoyatov (see
 * docs/workspace/SardorTasks.md, task 10). Built directly off the existing
 * `Session` fields (`tabSwitchCount`, `violationCount`, `terminationReason`,
 * `status`) rather than a new log model, since every anti-cheat signal is
 * already persisted there — no separate event store to keep in sync.
 *
 * {
 *   sessionId: string,
 *   user: { id, name, email } | null,   // null if the account was deleted
 *   status: 'in-progress' | 'submitted' | 'expired' | 'terminated',
 *   tabSwitchCount: number,
 *   violationCount: number,
 *   terminationReason: string | null,
 *   startTime: string,  endTime: string | null,  deadline: string,
 * }
 */
export const getViolations = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  // "Had an anti-cheat signal worth a human looking at" — any tab-switch,
  // any non-tab-switch violation, or an outright termination. A clean
  // completed session (0/0, submitted) is intentionally excluded — this
  // feed is for review, not a full session audit log.
  const sessions = await Session.find({
    $or: [{ tabSwitchCount: { $gt: 0 } }, { violationCount: { $gt: 0 } }, { status: 'terminated' }],
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate<{ userId: { _id: Types.ObjectId; name: string; email: string } | null }>(
      'userId',
      'name email',
    )
    .lean();

  res.status(200).json({
    success: true,
    data: sessions.map((s) => ({
      sessionId: s._id.toString(),
      user: s.userId
        ? { id: s.userId._id.toString(), name: s.userId.name, email: s.userId.email }
        : null,
      status: s.status,
      tabSwitchCount: s.tabSwitchCount,
      violationCount: s.violationCount,
      terminationReason: s.terminationReason ?? null,
      startTime: s.startTime,
      endTime: s.endTime ?? null,
      deadline: s.deadline,
    })),
  });
});

// ─── Dashboard Statistics ───────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * ADMIN — returns aggregate platform statistics.
 */
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [userCounts, jobCounts, sessionCounts, questionCount] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),
    Job.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]),
    Session.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Question.countDocuments(),
  ]);

  const toMap = (arr: { _id: string; count: number }[]) => {
    const map: Record<string, number> = {};
    for (const item of arr) map[item._id] = item.count;
    return map;
  };

  res.status(200).json({
    success: true,
    data: {
      users: toMap(userCounts),
      jobs: toMap(jobCounts),
      sessions: toMap(sessionCounts),
      totalQuestions: questionCount,
    },
  });
});

// ─── User Management ────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * ADMIN — list all users with pagination and search.
 */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', search, role } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search?.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select('name email role verificationLevels primaryDirection bestPercentage attempts createdAt')
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        verificationLevels: u.verificationLevels,
        primaryDirection: u.primaryDirection ?? null,
        bestPercentage: u.bestPercentage,
        attempts: u.attempts,
        createdAt: u.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * PATCH /api/admin/users/:id
 * ADMIN — update user role, or a single direction's verification tier.
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, direction, verificationLevel } = req.body as {
    role?: string;
    direction?: string;
    verificationLevel?: string;
  };

  const update: Record<string, unknown> = {};
  if (role && ['employer', 'seeker', 'admin'].includes(role)) update.role = role;
  if (
    direction &&
    DIRECTIONS.includes(direction as Direction) &&
    verificationLevel &&
    TIERS.includes(verificationLevel as Tier)
  ) {
    update[`verificationLevels.${direction}`] = verificationLevel;
  }

  if (Object.keys(update).length === 0) {
    throw ApiError.badRequest('No valid fields to update.');
  }

  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select('name email role verificationLevels primaryDirection bestPercentage attempts')
    .lean();

  if (!user) throw ApiError.notFound('User not found.');

  res.status(200).json({
    success: true,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      verificationLevels: user.verificationLevels,
      primaryDirection: user.primaryDirection ?? null,
      bestPercentage: user.bestPercentage,
      attempts: user.attempts,
    },
  });
});

/**
 * DELETE /api/admin/users/:id
 * ADMIN — permanently delete a user account.
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);
  if (!user) throw ApiError.notFound('User not found.');

  // Also clean up their jobs and sessions.
  await Promise.all([
    Job.deleteMany({ postedBy: id }),
    Session.deleteMany({ userId: id }),
  ]);

  res.status(200).json({ success: true, data: { message: 'User deleted.' } });
});

// ─── Job Management ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/jobs
 * ADMIN — list all jobs with pagination and search.
 */
export const listAdminJobs = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', search, type } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));

  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (search?.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { company: { $regex: escaped, $options: 'i' } },
      { postedByName: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('postedBy', 'name email role')
      .lean(),
    Job.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      jobs: jobs.map((j) => ({
        id: j._id.toString(),
        type: j.type,
        title: j.title,
        company: j.company ?? null,
        level: j.level,
        stack: j.stack,
        postedByName: j.postedByName,
        createdAt: j.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * DELETE /api/admin/jobs/:id
 * ADMIN — remove a listing.
 */
export const deleteAdminJob = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const job = await Job.findByIdAndDelete(id);
  if (!job) throw ApiError.notFound('Job not found.');

  res.status(200).json({ success: true, data: { message: 'Job deleted.' } });
});

// ─── Anti-cheat / Sessions ──────────────────────────────────────────────────

/**
 * GET /api/admin/sessions
 * ADMIN — list all test sessions with their status.
 */
export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('userId', 'name email')
      .lean(),
    Session.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        userId: s.userId ? ((s.userId as unknown) as { _id: unknown; name: string; email: string })._id?.toString() : null,
        userName: s.userId ? ((s.userId as unknown) as { name: string }).name : 'Deleted',
        userEmail: s.userId ? ((s.userId as unknown) as { email: string }).email : null,
        status: s.status,
        tabSwitchCount: s.tabSwitchCount,
        terminationReason: s.terminationReason ?? null,
        ipMismatch: s.ipMismatch ?? false,
        suspiciouslyFast: s.suspiciouslyFast ?? false,
        score: s.score,
        percentage: s.percentage,
        awardedLevel: s.awardedLevel ?? null,
        startTime: s.startTime,
        endTime: s.endTime,
        createdAt: s.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// ─── Questions (approve/review) ─────────────────────────────────────────────

/**
 * GET /api/admin/questions
 * ADMIN — list all questions with pagination.
 */
export const listAdminQuestions = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', technology, difficulty } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));

  const filter: Record<string, unknown> = {};
  if (technology) filter.technology = technology;
  if (difficulty) filter.difficulty = difficulty;

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select('text options difficulty technology category createdAt')
      .lean(),
    Question.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      questions: questions.map((q) => ({
        id: q._id.toString(),
        text: q.text,
        options: q.options,
        difficulty: q.difficulty,
        technology: q.technology,
        category: q.category,
        createdAt: q.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});
