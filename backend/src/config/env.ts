import dotenv from 'dotenv';

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
  /** Long-lived refresh token — only sent to POST /auth/refresh. */
  refreshTokenTtlDays: numberFromEnv('REFRESH_TOKEN_TTL_DAYS', 30),

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
   * Where user-uploaded images (avatars, profile covers, portfolio previews)
   * are written, and the ceiling on a single upload. The directory is served
   * read-only at `/uploads` (see `app.ts`) and created on first write.
   *
   * Resolution order:
   *   1. `UPLOAD_DIR` — explicit override, wins everywhere.
   *   2. `RAILWAY_VOLUME_MOUNT_PATH/uploads` — Railway injects this variable
   *      automatically whenever a volume is attached, so on Railway you just
   *      add a volume and uploads land on it (surviving redeploys) with no
   *      extra configuration.
   *   3. `uploads` — relative to CWD, for local dev.
   *
   * The container's filesystem is ephemeral on Railway: WITHOUT a volume,
   * every uploaded image is wiped on the next deploy. See `backend/Dockerfile`
   * + the deploy notes in `backend/CLAUDE.md`.
   */
  uploadDir:
    process.env.UPLOAD_DIR ??
    (process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH.replace(/\/+$/, '')}/uploads`
      : 'uploads'),
  maxUploadBytes: numberFromEnv('MAX_UPLOAD_BYTES', 5 * 1024 * 1024),
} as const;

export type Env = typeof env;
