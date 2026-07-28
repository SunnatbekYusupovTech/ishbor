import type { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '@/models/User';
import { RefreshToken } from '@/models/RefreshToken';
import { PasswordResetCode } from '@/models/PasswordResetCode';
import { signAuthToken, generateRefreshToken, hashRefreshToken } from '@/utils/jwt';
import { hashPassword, verifyPassword } from '@/utils/password';
import { generateResetCode, hashResetCode } from '@/utils/otp';
import { isMailerConfigured, sendPasswordResetEmail } from '@/utils/mailer';
import { passwordPolicy } from '@/validation/userSchemas';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { env } from '@/config/env';
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from '@/utils/cookies';

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

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits.'),
  newPassword: passwordPolicy,
});

/**
 * Derives a free `@handle` for the public profile from the email local part,
 * appending `2`, `3`, ... on collision. Best-effort: if we somehow can't find
 * a free one, registration proceeds without a username and the profile is
 * reachable by id until the user picks one (`PATCH /auth/me`).
 */
async function generateUsername(email: string): Promise<string | undefined> {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 24);
  const seed = base.length >= 3 ? base : `user_${base}`;

  for (let suffix = 0; suffix < 25; suffix++) {
    const candidate = suffix === 0 ? seed : `${seed}${suffix + 1}`;
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  return undefined;
}

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
    username: await generateUsername(email),
  });

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });
  const refreshToken = await issueRefreshToken(user._id.toString());
  setAuthCookies(res, token, refreshToken);

  res.status(201).json({
    success: true,
    data: {
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

  // Transparent upgrade: accounts created before the bcrypt migration still
  // have a scrypt hash (`salt:derived`) — re-hash with bcrypt now that we
  // have the plaintext password in hand, so it never has to happen again.
  if (!user.passwordHash.startsWith('$2')) {
    user.passwordHash = hashPassword(password);
    await user.save();
  }

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });
  const refreshToken = await issueRefreshToken(user._id.toString());
  setAuthCookies(res, token, refreshToken);

  res.status(200).json({
    success: true,
    data: {
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
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) throw ApiError.unauthorized('Invalid or expired refresh token.');
  const tokenHash = hashRefreshToken(refreshToken);

  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  const user = await User.findById(stored.userId);
  if (!user) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  stored.revokedAt = new Date();
  await stored.save();

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });
  const newRefreshToken = await issueRefreshToken(user._id.toString());
  setAuthCookies(res, token, newRefreshToken);

  res.status(200).json({ success: true, data: { refreshed: true } });
});

/**
 * POST /api/auth/logout
 * Revokes a single refresh token (this device/session). Revoking every
 * refresh token a user holds — "sign out everywhere" — is a separate,
 * larger feature (see docs/workspace/SardorTasks.md, task 9).
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);
    await RefreshToken.updateOne(
      { tokenHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  }

  clearAuthCookies(res);
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

  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    data: { loggedOut: true, revokedCount: result.modifiedCount },
  });
});

/**
 * POST /api/auth/forgot-password
 * Always responds with the same generic success message regardless of
 * whether the email is registered — the alternative (404 for unknown
 * emails) lets an attacker enumerate which addresses have accounts.
 * `passwordResetRateLimiter` (5/15min per IP) is the real defense against
 * this being used to spam an inbox or burn the mailer's daily send limit.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  if (!isMailerConfigured()) {
    throw ApiError.internal('Password reset is not configured on this server yet.');
  }

  const genericResponse = () => {
    res.status(200).json({
      success: true,
      data: { message: 'If that email is registered, a reset code has been sent.' },
    });
  };

  const user = await User.findOne({ email });
  if (!user) return genericResponse();

  // Cheap resend-cooldown: refuse a new code inside 60s of the last one
  // rather than firing a fresh email (and DB write) on every impatient
  // double-click of "resend" — still returns the same generic response so
  // it isn't a distinguishable signal from the outside.
  const recent = await PasswordResetCode.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < 60_000) return genericResponse();

  const code = generateResetCode();
  await PasswordResetCode.deleteMany({ userId: user._id });
  await PasswordResetCode.create({
    userId: user._id,
    codeHash: hashResetCode(code),
    expiresAt: new Date(Date.now() + env.passwordResetCodeTtlMinutes * 60 * 1000),
  });

  await sendPasswordResetEmail(user.email, code);
  genericResponse();
});

/**
 * POST /api/auth/reset-password
 * Verifying the code also fully logs the account out everywhere (every
 * refresh token revoked) — whoever just proved control of the inbox is
 * trusted with the new password, but any session opened before that (e.g.
 * by whoever had the OLD, presumably-compromised password) should not
 * silently keep working.
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = resetPasswordSchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user) throw ApiError.badRequest('Invalid or expired code.');

  const resetCode = await PasswordResetCode.findOne({ userId: user._id });
  if (!resetCode || resetCode.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('Invalid or expired code.');
  }
  if (resetCode.attempts >= env.passwordResetMaxAttempts) {
    await resetCode.deleteOne();
    throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.');
  }
  if (resetCode.codeHash !== hashResetCode(code)) {
    resetCode.attempts += 1;
    await resetCode.save();
    throw ApiError.badRequest('Invalid or expired code.');
  }

  user.passwordHash = hashPassword(newPassword);
  await user.save();

  await resetCode.deleteOne();
  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );

  res.status(200).json({ success: true, data: { reset: true } });
});
