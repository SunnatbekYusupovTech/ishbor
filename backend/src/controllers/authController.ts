import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { User } from '@/models/User';
import { RefreshToken } from '@/models/RefreshToken';
import { PasswordResetCode } from '@/models/PasswordResetCode';
import { EmailVerificationCode } from '@/models/EmailVerificationCode';
import { signAuthToken, generateRefreshToken, hashRefreshToken } from '@/utils/jwt';
import { hashPassword, verifyPassword } from '@/utils/password';
import { generateResetCode, hashResetCode } from '@/utils/otp';
import { isMailerConfigured, sendPasswordResetEmail } from '@/utils/mailer';
import { issueVerificationCode } from '@/services/emailVerificationService';
import { passwordPolicy } from '@/validation/userSchemas';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';
import {
  setAuthCookies,
  clearAuthCookies,
  setGoogleOAuthStateCookie,
  clearGoogleOAuthStateCookie,
  GOOGLE_STATE_COOKIE,
  REFRESH_COOKIE,
} from '@/utils/cookies';

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

const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits.'),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Lazily constructed (not at module load) so a deployment without
 * `GOOGLE_CLIENT_ID` set can still boot and serve every other endpoint —
 * same optional-integration pattern as `isMailerConfigured()`.
 */
let googleClient: OAuth2Client | undefined;
function getGoogleClient(): OAuth2Client {
  if (!googleClient) googleClient = new OAuth2Client(env.googleClientId);
  return googleClient;
}

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

  // Email verification is only ENFORCED when the mailer is actually
  // configured (`SMTP_USER`/`SMTP_APP_PASSWORD`) — same optional-integration
  // pattern as Cloudinary/Groq elsewhere in `env.ts`. Without it there's no
  // way to deliver a code at all, so gating registration on one would lock
  // out every signup on a deployment that hasn't set SMTP up yet; instead
  // `emailVerified` is left `undefined` (treated as verified, see the model
  // comment) and registration behaves exactly like before this feature.
  const requireVerification = isMailerConfigured();

  const user = await User.create({
    name: name ?? email.split('@')[0],
    email,
    passwordHash: hashPassword(password),
    role: role ?? 'seeker',
    registrationIp: req.ip,
    username: await generateUsername(email),
    ...(requireVerification ? { emailVerified: false } : {}),
  });

  if (requireVerification) {
    await issueVerificationCode(user._id.toString(), user.email);
    // No auth cookies yet — the account exists but can't log in
    // (`login` below blocks on `emailVerified === false`) until the code
    // from `POST /auth/verify-email` is entered.
    res.status(201).json({
      success: true,
      data: { requiresVerification: true, email: user.email },
    });
    return;
  }

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

/**
 * POST /api/auth/verify-email
 * Completes a registration that was left pending by `register` above:
 * checks the emailed code, flips `emailVerified` to `true`, and — since
 * this is the natural conclusion of "signing up" — logs the account in
 * immediately (same cookie-issuing shape as `login`/`register`).
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = verifyEmailSchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user) throw ApiError.badRequest('Invalid or expired code.');

  const verification = await EmailVerificationCode.findOne({ userId: user._id });
  if (!verification || verification.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('Invalid or expired code.');
  }
  if (verification.attempts >= env.passwordResetMaxAttempts) {
    await verification.deleteOne();
    throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.');
  }
  if (verification.codeHash !== hashResetCode(code)) {
    verification.attempts += 1;
    await verification.save();
    throw ApiError.badRequest('Invalid or expired code.');
  }

  user.emailVerified = true;
  await user.save();
  await verification.deleteOne();

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
      },
    },
  });
});

/**
 * POST /api/auth/resend-verification
 * Same generic-response + 60s cooldown shape as `forgotPassword` below —
 * doesn't reveal whether the email is registered or already verified.
 */
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = resendVerificationSchema.parse(req.body);

  const genericResponse = () => {
    res.status(200).json({
      success: true,
      data: { message: 'If that email needs verification, a new code has been sent.' },
    });
  };

  if (!isMailerConfigured()) return genericResponse();

  const user = await User.findOne({ email });
  if (!user || user.emailVerified !== false) return genericResponse();

  const recent = await EmailVerificationCode.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < 60_000) return genericResponse();

  await issueVerificationCode(user._id.toString(), user.email);
  genericResponse();
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (user.emailVerified === false) {
    throw new ApiError(403, 'Please verify your email before logging in.', {
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
  }

  // Transparent upgrade: accounts created before the bcrypt migration still
  // have a scrypt hash (`salt:derived`) — re-hash with bcrypt now that we
  // have the plaintext password in hand, so it never has to happen again.
  if (!user.passwordHash!.startsWith('$2')) {
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

/** The frontend origin to send the browser back to once the Google OAuth
 *  handshake finishes (success or failure) — see `env.frontendUrl`'s comment
 *  for why this is NOT just `clientOrigins[0]`. */
function frontendOrigin(): string {
  return env.frontendUrl ?? 'http://localhost:3000';
}

/**
 * The `redirect_uri` Google sends the browser back to after consent.
 * Production always uses the explicit `GOOGLE_REDIRECT_URI` env var; in
 * development it falls back to deriving it from the incoming request
 * (`http://localhost:5000/api/auth/google/callback`), so a fresh clone works
 * against Google's consent screen with zero env fiddling.
 *
 * IMPORTANT: the derivation only guarantees the two ends of the handshake
 * agree with each other — Google still validates the value against the OAuth
 * client's "Authorized redirect URIs" allowlist, so
 * `http://localhost:5000/api/auth/google/callback` must ALSO be registered
 * there. The classic `400: redirect_uri_mismatch` on localhost (while the
 * deployed site works) means the production URI is registered but the
 * localhost one isn't (see `.env.example` for the exact steps).
 */
function googleRedirectUri(req: Request): string {
  if (env.googleRedirectUri) return env.googleRedirectUri;
  return `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
}

/**
 * Shared by `googleAuthCallback`: given a verified Google identity, finds a
 * matching account (by `googleId` or `email`), links Google to an existing
 * email/password account on first Google sign-in, or creates a brand-new
 * account outright — a verified Google token already proves the mailbox
 * belongs to whoever is signing in, so the emailed-code step is skipped.
 */
async function findOrCreateGoogleUser(params: {
  email: string;
  googleId: string;
  name?: string;
  picture?: string;
  ip?: string;
}) {
  const email = params.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: params.googleId }, { email }] });

  if (!user) {
    user = await User.create({
      name: params.name ?? email.split('@')[0],
      email,
      googleId: params.googleId,
      role: 'seeker',
      registrationIp: params.ip,
      username: await generateUsername(email),
      avatarUrl: params.picture,
      // Google already verified this address — no emailed-code step needed.
      emailVerified: true,
    });
  } else if (!user.googleId) {
    // Existing email/password account signing in with Google for the first
    // time: link it (trusting Google's own verified email) rather than
    // creating a duplicate account for the same person.
    user.googleId = params.googleId;
    if (user.emailVerified === false) user.emailVerified = true;
    await user.save();
  }

  return user;
}

/**
 * GET /api/auth/google
 * "Continue with Google", step 1: full OAuth 2.0 authorization-code redirect
 * flow (not the Google Identity Services button/One Tap credential flow) —
 * this works in every browser/embedded webview, since it doesn't depend on
 * a script rendering a button or third-party cookies. Sends the browser to
 * Google's own consent screen with a random `state`, which is also stashed
 * in a short-lived cookie so the callback can confirm the response actually
 * belongs to this handshake (CSRF/replay guard).
 */
export const googleAuthStart = asyncHandler(async (req: Request, res: Response) => {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    throw ApiError.internal('Google sign-in is not configured on this server yet.');
  }

  const state = randomBytes(24).toString('hex');
  setGoogleOAuthStateCookie(res, state);

  const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizeUrl.searchParams.set('client_id', env.googleClientId);
  // Must be byte-for-byte identical to the URI used in the token exchange in
  // `googleAuthCallback` (Google rejects mismatched pairs).
  authorizeUrl.searchParams.set('redirect_uri', googleRedirectUri(req));
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid email profile');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('prompt', 'select_account');

  res.redirect(authorizeUrl.toString());
});

/**
 * GET /api/auth/google/callback
 * "Continue with Google", step 2: Google redirects the browser back here
 * with `?code=&state=`. The authorization `code` is exchanged **server to
 * server** for tokens using `GOOGLE_CLIENT_SECRET` (never exposed to the
 * browser) — this is the step the button-only ID-token flow skips, and why
 * this flow needs a real secret. The returned `id_token` is still verified
 * against Google's public keys the same way the old flow verified its
 * credential. On any failure the browser is bounced back to the frontend
 * login page with an error flag rather than shown a raw JSON error, since
 * this is a full-page navigation, not an API call a JS client can parse.
 */
export const googleAuthCallback = asyncHandler(async (req: Request, res: Response) => {
  const loginUrl = new URL('/login', frontendOrigin());
  const failWith = (reason: string) => {
    loginUrl.searchParams.set('googleError', reason);
    res.redirect(loginUrl.toString());
  };

  clearGoogleOAuthStateCookie(res);

  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    return failWith('not_configured');
  }

  const { code, state, error } = req.query;
  const expectedState = req.cookies?.[GOOGLE_STATE_COOKIE];

  if (typeof error === 'string') return failWith('denied');
  if (typeof code !== 'string' || typeof state !== 'string') return failWith('invalid_response');
  if (!expectedState || state !== expectedState) return failWith('state_mismatch');

  let tokenJson: { id_token?: string };
  try {
    const redirectUri = googleRedirectUri(req);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        // Re-derived from THIS request so it can never drift from the value
        // used in `googleAuthStart` — a mismatch here is exactly what Google
        // reports as `400: redirect_uri_mismatch`.
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      // `redirect_uri_mismatch` is by far the most common cause — surface the
      // exact URI Google is comparing, so the fix (registering it in Google
      // Cloud Console) is a copy-paste, not a hunt.
      const body = (await tokenRes.text().catch(() => '')) || '';
      if (body.includes('redirect_uri_mismatch')) {
        logger.error(
          `Google OAuth redirect_uri_mismatch — register "${googleRedirectUri(
            req,
          )}" under the OAuth client's Authorized redirect URIs in Google Cloud Console`,
        );
      }
      throw new Error('token exchange failed');
    }
    tokenJson = (await tokenRes.json()) as { id_token?: string };
  } catch {
    return failWith('token_exchange_failed');
  }

  if (!tokenJson.id_token) return failWith('token_exchange_failed');

  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: tokenJson.id_token,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    return failWith('invalid_credential');
  }

  if (!payload?.email || !payload.sub) return failWith('invalid_credential');

  const user = await findOrCreateGoogleUser({
    email: payload.email,
    googleId: payload.sub,
    name: payload.name,
    picture: payload.picture,
    ip: req.ip,
  });

  const token = signAuthToken({ userId: user._id.toString(), email: user.email });
  const refreshToken = await issueRefreshToken(user._id.toString());
  setAuthCookies(res, token, refreshToken);

  // `?googleAuth=1` is picked up once by `useCurrentUser` — see that hook
  // for why: this redirect never goes through the frontend's own fetch
  // wrapper, so nothing else would set the non-httpOnly "looks logged in"
  // UI marker.
  const successUrl = new URL('/', frontendOrigin());
  successUrl.searchParams.set('googleAuth', '1');
  res.redirect(successUrl.toString());
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
/**
 * POST /api/auth/forgot-password
 * Explicitly reports whether the email is registered (`404` if not) — a
 * deliberate product choice made after the original generic-response
 * version shipped, trading the (mild) email-enumeration exposure for a
 * flow that can tell the user "no account with that email" instead of
 * silently pretending to send a code that never arrives. The security
 * backstop against abuse is still `passwordResetRateLimiter` (5/15min per
 * IP) plus the 60s per-account resend-cooldown below.
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  if (!isMailerConfigured()) {
    throw ApiError.internal('Password reset is not configured on this server yet.');
  }

  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('No account found with that email address.');

  // Cheap resend-cooldown: refuse a new code inside 60s of the last one
  // rather than firing a fresh email (and DB write) on every impatient
  // double-click of "resend".
  const recent = await PasswordResetCode.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!recent || Date.now() - recent.createdAt.getTime() >= 60_000) {
    const code = generateResetCode();
    await PasswordResetCode.deleteMany({ userId: user._id });
    await PasswordResetCode.create({
      userId: user._id,
      codeHash: hashResetCode(code),
      expiresAt: new Date(Date.now() + env.passwordResetCodeTtlMinutes * 60 * 1000),
    });
    await sendPasswordResetEmail(user.email, code);
  }

  res.status(200).json({ success: true, data: { message: 'A verification code has been sent.' } });
});

/**
 * POST /api/auth/verify-reset-code
 * A dedicated "just check the code" step so the frontend can walk the user
 * through email → code → new password as three separate screens instead of
 * asking for the code and the new password on the same form. Does NOT
 * consume the code (no delete, no attempt reset on success) — `resetPassword`
 * below re-validates the same code from scratch and is the only endpoint
 * that actually changes anything, so skipping this step (or replaying an
 * old response) grants nothing on its own.
 */
export const verifyResetCode = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = verifyEmailSchema.parse(req.body);

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

  res.status(200).json({ success: true, data: { valid: true } });
});

/**
 * POST /api/auth/reset-password
 * Re-validates the code (independent of `verifyResetCode` above — that step
 * is a UX convenience, not a trust boundary) and, on success, sets the new
 * password. Also fully logs the account out everywhere (every refresh token
 * revoked) — whoever just proved control of the inbox is trusted with the
 * new password, but any session opened before that (e.g. by whoever had the
 * OLD, presumably-compromised password) should not silently keep working.
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
