import type { Request, Response } from 'express';
import { User } from '@/models/User';
import { Job } from '@/models/Job';
import { Session } from '@/models/Session';
import { RefreshToken } from '@/models/RefreshToken';
import { hashPassword, verifyPassword } from '@/utils/password';
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
    .select('name email role verificationLevel bestPercentage bestScore attempts isQaTester')
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
      isQaTester: user.isQaTester,
    },
  });
});

/**
 * PATCH /api/auth/me
 * Updates name/email/password — each field optional, only what's sent
 * changes. Setting `newPassword` requires `currentPassword` to verify
 * (enforced by `updateMeSchema`'s refine, re-checked here against the hash).
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, email, currentPassword, newPassword } = req.body as {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('User not found.');

  if (email && email !== user.email) {
    const exists = await User.findOne({ email });
    if (exists) throw ApiError.conflict('Email already registered.');
    user.email = email;
  }

  if (name) user.name = name;

  if (newPassword) {
    if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
      throw ApiError.unauthorized('Current password is incorrect.');
    }
    user.passwordHash = hashPassword(newPassword);
  }

  await user.save();

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
      isQaTester: user.isQaTester,
    },
  });
});

/**
 * DELETE /api/auth/me
 * Password-confirmed self-deletion. Cascades to everything that would
 * otherwise be orphaned: posted listings, test sessions, refresh tokens.
 * (Question/Job documents from OTHER users are obviously untouched.)
 */
export const deleteMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { password } = req.body as { password: string };

  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('User not found.');
  if (!verifyPassword(password, user.passwordHash)) {
    throw ApiError.unauthorized('Incorrect password.');
  }

  await Promise.all([
    Job.deleteMany({ postedBy: user._id }),
    Session.deleteMany({ userId: user._id }),
    RefreshToken.deleteMany({ userId: user._id }),
  ]);
  await user.deleteOne();

  res.status(200).json({ success: true, data: { deleted: true } });
});
