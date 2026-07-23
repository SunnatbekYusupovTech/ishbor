import type { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '@/models/User';
import { RefreshToken } from '@/models/RefreshToken';
import { signAuthToken, generateRefreshToken, hashRefreshToken } from '@/utils/jwt';
import { hashPassword, verifyPassword } from '@/utils/password';
import { passwordPolicy } from '@/validation/userSchemas';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { env } from '@/config/env';

/**
 * Lightweight auth to make the assessment flow runnable end-to-end.
 * NOTE: This uses scrypt password hashing as a self-contained default.
 * In production, wire this to your real identity provider / SSO.
 */

const registerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email(),
  password: passwordPolicy,
  role: z.enum(['employer', 'seeker']).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

/** Mints a refresh token, persists only its hash, and returns the raw value. */
async function issueRefreshToken(userId: string): Promise<string> {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, tokenHash: hashRefreshToken(token), expiresAt });
  return token;
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = registerSchema.parse(req.body);

  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('Email already registered.');

  // Registration abuse guard: shared IPs (offices, campuses, NAT) are common,
  // so this rejects only the (N+1)th signup from an IP — it never touches
  // accounts that already exist, and login/test-taking are unaffected.
  if (req.ip) {
    const accountsFromIp = await User.countDocuments({ registrationIp: req.ip });
    if (accountsFromIp >= env.maxAccountsPerIp) {
      throw ApiError.forbidden('Too many accounts have already been created from this network.');
    }
  }

  const user = await User.create({
    name: name ?? email.split('@')[0],
    email,
    passwordHash: hashPassword(password),
    role: role ?? 'seeker',
    registrationIp: req.ip,
  });

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });
  const refreshToken = await issueRefreshToken(user._id.toString());

  res.status(201).json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });
  const refreshToken = await issueRefreshToken(user._id.toString());

  res.status(200).json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        verificationLevels: user.verificationLevels,
      },
    },
  });
});

/**
 * POST /api/auth/refresh
 * Exchanges a still-valid refresh token for a new access token, ROTATING the
 * refresh token in the same step (the old one is revoked, a new one issued).
 * Rotation means a leaked-and-replayed refresh token is only useful once —
 * the legitimate client's next refresh will find its token already revoked,
 * which is a detectable signal of theft even though we don't act on it here.
 */
export const refreshAuthToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokenHash = hashRefreshToken(refreshToken);

  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  const user = await User.findById(stored.userId);
  if (!user) throw ApiError.unauthorized('Invalid or expired refresh token.');

  stored.revokedAt = new Date();
  await stored.save();

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });
  const newRefreshToken = await issueRefreshToken(user._id.toString());

  res.status(200).json({
    success: true,
    data: { token, refreshToken: newRefreshToken },
  });
});

/**
 * POST /api/auth/logout
 * Revokes a single refresh token (this device/session). Revoking every
 * refresh token a user holds — "sign out everywhere" — is a separate,
 * larger feature (see docs/workspace/SardorTasks.md, task 9).
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokenHash = hashRefreshToken(refreshToken);

  await RefreshToken.updateOne(
    { tokenHash, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );

  res.status(200).json({ success: true, data: { loggedOut: true } });
});

/**
 * POST /api/auth/logout-all
 * AUTHENTICATED (requires a currently-valid access token — unlike `/refresh`
 * and `/logout`, which only need possession of a refresh token). Revokes
 * every refresh token the user holds, so no device can silently mint a new
 * access token once its current one expires.
 *
 * Known limitation: any access token still valid on another device stays
 * valid until its own (short, `env.accessTokenTtl`) expiry — access tokens
 * are stateless JWTs, so revoking one before its natural expiry would need a
 * denylist we don't maintain. With a 15-minute TTL the exposure window is
 * small; this is the standard trade-off for stateless access tokens and is
 * not something a refresh-token-only revocation can close.
 */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const result = await RefreshToken.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );

  res.status(200).json({
    success: true,
    data: { loggedOut: true, revokedCount: result.modifiedCount },
  });
});
