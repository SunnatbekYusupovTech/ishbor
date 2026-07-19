import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { Session } from '@/models/Session';
import { asyncHandler } from '@/utils/asyncHandler';

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
