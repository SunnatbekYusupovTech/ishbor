import dotenv from 'dotenv';
import ms from 'ms';

dotenv.config();

/**
 * Centralised, validated environment configuration.
 * Fails fast at boot if a required secret is missing so we never run
 * the assessment engine in a half-configured (insecure) state.
 */
function required(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return value;
}

function numberFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: numberFromEnv('PORT', 5000),
  /** Comma-separated list of allowed CORS origins (e.g. local dev + deployed frontend). */
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongoUri: required('MONGO_URI'),
  jwtSecret: required('JWT_SECRET'),

  // Auth token lifetimes
  /** Short-lived access token — sent on every request. */
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  /** Same lifetime as `accessTokenTtl`, pre-parsed to milliseconds for the
   *  access-token cookie's `maxAge` (cookies don't accept `ms`-style strings). */
  get accessTokenTtlMs(): number {
    return ms(this.accessTokenTtl as ms.StringValue);
  },
  /** Long-lived refresh token — only sent to POST /auth/refresh. */
  refreshTokenTtlDays: numberFromEnv('REFRESH_TOKEN_TTL_DAYS', 30),

  /**
   * Cookie attributes for the httpOnly auth cookies (`utils/cookies.ts`).
   * Cross-site in production (separate frontend/backend domains, e.g. Vercel
   * + Railway) requires `SameSite=None` + `Secure`; locally both apps share
   * the `localhost` site (only the port differs) so `Lax` + non-Secure works
   * over plain http. `COOKIE_SAMESITE`/`COOKIE_SECURE` let this be overridden
   * explicitly (e.g. a same-domain production deploy that wants `Lax`).
   */
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? undefined) as
    | 'lax'
    | 'strict'
    | 'none'
    | undefined,
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : undefined,

  // Assessment tuning
  testDurationMinutes: numberFromEnv('TEST_DURATION_MINUTES', 30),
  heartbeatTimeoutMs: numberFromEnv('HEARTBEAT_TIMEOUT_MS', 15000),
  maxTabSwitches: numberFromEnv('MAX_TAB_SWITCHES', 3),
  /** Non-tab-switch violations (copy/paste, right-click, devtools...) before termination. */
  maxViolations: numberFromEnv('MAX_VIOLATIONS', 5),
  /**
   * Minimum minutes a candidate must wait after finishing an attempt before
   * starting another. Without this, a script can loop start→submit rapidly
   * and use the returned `percentage` as an oracle to infer correct answers
   * (or otherwise farm `verificationLevel`) far faster than a human ever
   * could — this is the primary defense against that.
   */
  testAttemptCooldownMinutes: numberFromEnv('TEST_ATTEMPT_COOLDOWN_MINUTES', 10),
  /**
   * If a candidate's last scored attempt was below this percentage, the next
   * attempt's cooldown (above) is multiplied by `testLowScoreCooldownMultiplier`
   * instead of applying the standard duration — discourages rapid low-effort
   * re-attempts (guessing/farming) more than a single flat cooldown would.
   */
  testLowScoreThreshold: numberFromEnv('TEST_LOW_SCORE_THRESHOLD', 50),
  testLowScoreCooldownMultiplier: numberFromEnv('TEST_LOW_SCORE_COOLDOWN_MULTIPLIER', 3),

  /**
   * Shared secret for the question-import webhook (`POST /api/webhooks/questions`).
   * Not a user JWT — external automations have no login flow, so they
   * authenticate with this header instead. Optional: if unset, the webhook
   * route is disabled (returns 503) rather than falling back to an open endpoint.
   */
  questionImportSecret: process.env.QUESTION_IMPORT_SECRET,

  /**
   * Optional: enables `services/autoRefillService.ts` (in-process Groq calls
   * triggered from `testController.startTest` when a technology's question
   * pool runs low). Unset = auto-refill silently no-ops; the standalone
   * `scripts/generateQuestions.ts` process remains the primary way to grow
   * the bank either way.
   */
  groqApiKey: process.env.GROQ_API_KEY,
  /** Below this many total questions for a technology, trigger a background refill. */
  autoRefillThreshold: numberFromEnv('AUTO_REFILL_THRESHOLD', 15),
  /** Minimum minutes between auto-refill batches for the same technology (debounce). */
  autoRefillCooldownMinutes: numberFromEnv('AUTO_REFILL_COOLDOWN_MINUTES', 30),

  /**
   * Registration abuse guard: max accounts allowed to register from the same
   * IP address before further registrations from it are rejected (not a
   * ban — existing accounts keep working, only new signups from that IP are
   * blocked). Deliberately loose (default 2) since shared IPs (offices,
   * campuses, NAT/CGNAT, mobile carriers) are common and a low limit risks
   * locking out legitimate users.
   */
  maxAccountsPerIp: numberFromEnv('MAX_ACCOUNTS_PER_IP', 2),

  /**
   * User-uploaded images (avatars, profile covers, portfolio previews) are
   * stored on Cloudinary rather than the container's own disk — Railway's
   * (and Vercel's) filesystem is ephemeral, so anything written locally is
   * gone on the next deploy/restart.
   *
   * Deliberately optional here (unlike most secrets) so the server still
   * boots — and every OTHER endpoint keeps working — for anyone who hasn't
   * set up a Cloudinary account yet. `services/imageStorage.ts` throws a
   * clear, specific error only when an upload is actually attempted without
   * these configured.
   */
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  /** Ceiling on a single upload, enforced before the bytes ever leave this process. */
  maxUploadBytes: numberFromEnv('MAX_UPLOAD_BYTES', 5 * 1024 * 1024),

  /**
   * Password-reset codes are emailed via plain Gmail SMTP (`utils/mailer.ts`)
   * rather than a transactional-email provider — no domain verification
   * needed, works for any recipient immediately. Optional, same pattern as
   * `cloudinary`/`groqApiKey`: the server still boots and every other
   * endpoint keeps working without it, `POST /auth/forgot-password` just
   * 503s with a clear message until it's configured.
   */
  smtp: {
    user: process.env.SMTP_USER,
    appPassword: process.env.SMTP_APP_PASSWORD,
    fromName: process.env.SMTP_FROM_NAME ?? 'Ishbor',
  },
  /** Minutes a password-reset code stays valid after being emailed. */
  passwordResetCodeTtlMinutes: numberFromEnv('PASSWORD_RESET_CODE_TTL_MINUTES', 15),
  /** Wrong-code guesses allowed against one code before it's invalidated. */
  passwordResetMaxAttempts: numberFromEnv('PASSWORD_RESET_MAX_ATTEMPTS', 5),

  /**
   * "Continue with Google": full OAuth 2.0 authorization-code redirect flow
   * (`GET /auth/google` → Google's consent screen → `GET /auth/google/callback`),
   * not the Google Identity Services one-tap/button credential flow — the
   * redirect flow works in every browser/webview (GIS's button can fail to
   * render or get blocked by third-party-cookie restrictions in embedded
   * browsers). `googleClientSecret` authenticates the server-to-server
   * authorization-code exchange with Google — unlike `googleClientId` it is
   * a real secret and must never reach the frontend. `googleRedirectUri`
   * must be this API's own callback URL, registered byte-for-byte under
   * "Authorized redirect URIs" for this OAuth client in Google Cloud
   * Console (e.g. `http://localhost:5000/api/auth/google/callback`).
   * Same optional-integration pattern as `cloudinary`/`groqApiKey`: unset
   * simply means `GET /auth/google` 500s with a clear message, every other
   * endpoint is unaffected.
   */
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
} as const;

export type Env = typeof env;
