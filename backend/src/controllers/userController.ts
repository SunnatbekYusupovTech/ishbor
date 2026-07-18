import type { Request, Response } from 'express';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';

/**
 * GET /api/users/leaderboard
 * PUBLIC — ranks users by their best assessment result (highest score first).
 */
export const getLeaderboard = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({ attempts: { $gt: 0 } })
    .sort({ bestPercentage: -1, bestScore: -1, updatedAt: 1 })
    .limit(50)
    .select('name verificationLevel bestPercentage bestScore')
    .lean();

  res.status(200).json({
    success: true,
    data: users.map((u, i) => ({
      rank: i + 1,
      name: u.name,
      verificationLevel: u.verificationLevel,
      bestPercentage: u.bestPercentage,
      bestScore: u.bestScore,
    })),
  });
});

/**
 * GET /api/auth/me
 * AUTHENTICATED — returns the current user's profile + verification status so
 * the client knows whether they may post a listing.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId)
    .select('name email role verificationLevel bestPercentage bestScore attempts')
    .lean();

  if (!user) throw ApiError.unauthorized('User not found.');

  res.status(200).json({
    success: true,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      verificationLevel: user.verificationLevel,
      bestPercentage: user.bestPercentage,
      bestScore: user.bestScore,
      attempts: user.attempts,
    },
  });
});
