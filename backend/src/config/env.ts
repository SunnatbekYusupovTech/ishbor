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
} as const;

export type Env = typeof env;
