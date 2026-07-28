import crypto from 'node:crypto';

/** 6-digit numeric code, zero-padded (e.g. "003742") — easy to read and re-type from an email. */
export function generateResetCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Same "never store the raw value" pattern as `utils/jwt.ts#hashRefreshToken`. */
export function hashResetCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
