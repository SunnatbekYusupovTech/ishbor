import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '@/config/env';

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export function signAuthToken(
  payload: AuthTokenPayload,
  expiresIn: SignOptions['expiresIn'] = '2h',
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
