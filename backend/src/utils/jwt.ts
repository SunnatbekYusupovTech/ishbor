import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '@/config/env';

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

/** Short-lived: this is the token sent on every API request. */
export function signAuthToken(
  payload: AuthTokenPayload,
  expiresIn: SignOptions['expiresIn'] = env.accessTokenTtl as SignOptions['expiresIn'],
): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
}

/** Verifies and decodes a token. Throws if invalid/expired. */
export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === 'string' || !decoded || typeof decoded.userId !== 'string') {
    throw new Error('Malformed auth token payload');
  }
  return { userId: decoded.userId, email: decoded.email };
}

/**
 * Refresh tokens are deliberately NOT JWTs: a JWT is self-verifying, which
 * means it can't be revoked before its expiry without a denylist anyway — so
 * there is no benefit over an opaque random token, and an opaque token can't
 * leak claims if it ever ends up somewhere it shouldn't (logs, referrers).
 * The raw token is handed to the client once; only its hash is persisted
 * (`models/RefreshToken.ts`), so a stolen DB dump alone can't be replayed.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
